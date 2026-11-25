import type { IDataObject, IHookFunctions, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { buildTriggerCreateFeedBody, feedToUpdateBody } from '../../Shared/lib/feed.dto';
import { FeedService } from '../../Shared/services/Feed.service';
import { OutputService } from '../../Shared/services/Output.service';
import {
	WebhookService,
	type CreatedFeedConfig,
	type TriggerRegistrationState,
} from './Webhook.service';

/** Fields that decide whether a self-created feed must be written again. */
const CREATED_FEED_FIELDS: Array<keyof CreatedFeedConfig> = [
	'name',
	'networkId',
	'dataType',
	'filterCode',
	'startBlock',
];

function createdFeedNeedsUpdate(
	stored: CreatedFeedConfig | undefined,
	current: CreatedFeedConfig,
): boolean {
	if (!stored) return true;
	return CREATED_FEED_FIELDS.some((field) => stored[field] !== current[field]);
}

/**
 * Webhook-lifecycle orchestration for the Atria Trigger: the bodies behind the
 * node's `webhookMethods` (checkExists / create / delete). On activation the
 * node creates a webhook output and attaches it to the selected existing feed;
 * with "Feed Source › Create New Feed" it creates and starts that feed instead.
 * On deactivation the output is detached and deleted, and a self-created feed is
 * paused — never deleted, and an existing feed is never paused.
 */
export class TriggerRegistrationService {
	private readonly webhook: WebhookService;
	private readonly feeds: FeedService;
	private readonly outputs: OutputService;

	constructor(private readonly hook: IHookFunctions) {
		this.webhook = new WebhookService(hook);
		this.feeds = new FeedService(hook);
		this.outputs = new OutputService(hook);
	}

	private get nodeName(): string {
		return this.hook.getNode().name;
	}

	private get workflowName(): string {
		return this.hook.getWorkflow().name ?? 'workflow';
	}

	/** The output is identified by name so retried registrations and teardown find it. */
	private resolveOutputName(): string {
		const options = (this.hook.getNodeParameter('options', {}) as IDataObject) ?? {};
		return (
			(options.outputName as string) || `n8n ${this.nodeName} - ${this.workflowName}`.slice(0, 255)
		);
	}

	private feedSourceMode(): 'existing' | 'create' {
		return this.hook.getNodeParameter('feedSource', 'existing') === 'create'
			? 'create'
			: 'existing';
	}

	/**
	 * Reads the create-mode parameters as plain values, so they can both build the
	 * request body and be compared with the stored config on a later activation.
	 */
	private resolveCreateConfig(): CreatedFeedConfig {
		const get = (name: string, fallback: string | number) =>
			this.hook.getNodeParameter(name, fallback) as string | number;
		const startFrom = String(get('createStartFrom', 'latest'));
		return {
			name: String(get('createName', '')),
			networkId: String(get('createNetworkId', '')),
			dataType: String(get('createDataType', 'BlockWithLogs')),
			filterCode: String(get('createFilterCode', '')),
			// Only "Specific Block" reads the number; "Latest Block" sends null
			startBlock: startFrom === 'block' ? Number(get('createStartBlock', 0)) : null,
		};
	}

	async checkExists(): Promise<boolean> {
		const staticData = this.hook.getWorkflowStaticData('global');
		const state = this.webhook.getRegistrationState(staticData, this.nodeName);
		if (!state?.outputId) return false;

		// Manual runs get their own throw-away output so a test never touches production
		if (this.webhook.isManualRun()) return false;

		try {
			const current = await this.outputs.getById(state.outputId);
			const desired = this.webhook.resolveDeliveryUrl();
			// Re-activating with a changed URL (tunnel, proxy, new host) must update the output
			if (desired && typeof current?.config?.url === 'string' && current.config.url !== desired) {
				return false;
			}
			// Create mode: n8n skips create() when this returns true, so edited parameters
			// (usually the filter code) have to be reported as "not registered yet".
			if (
				this.feedSourceMode() === 'create' &&
				(!state.createdFeedId || createdFeedNeedsUpdate(state.createdFeedConfig, this.resolveCreateConfig()))
			) {
				return false;
			}
			return true;
		} catch {
			this.webhook.setRegistrationState(staticData, this.nodeName, undefined);
			return false;
		}
	}

	async create(): Promise<boolean> {
		const staticData = this.hook.getWorkflowStaticData('global');
		const manualRun = this.webhook.isManualRun();
		const state = this.webhook.getRegistrationState(staticData, this.nodeName);

		const deliveryUrl = this.webhook.resolveDeliveryUrl();
		if (!deliveryUrl) {
			throw new NodeOperationError(
				this.hook.getNode(),
				'Could not determine the delivery URL. Set "Delivery URL" in the node options or configure a public webhook URL for this n8n instance.',
			);
		}

		const usesOwnUrl = deliveryUrl === this.hook.getNodeWebhookUrl('default');

		// "Listen for test event" registers a one-shot URL. Pointing Atria at it would let
		// the output probe consume the single waiting slot and would attach a URL that dies
		// seconds later to a live feed. With an explicit external Delivery URL there is no
		// such conflict, so the node still registers and cleans it up afterwards.
		if (manualRun && usesOwnUrl) {
			this.hook.logger.info?.(
				'Atria Trigger: manual execution — nothing is registered in Atria. Activate the workflow for real deliveries, or post a sample payload to the test URL above.',
			);
			return true;
		}

		// The production route is not served yet while n8n publishes/activates, so Atria's
		// probe would fail and abort the publish. Register in the background instead.
		if (usesOwnUrl && !(await this.webhook.probeOwnUrl(deliveryUrl))) {
			this.hook.logger.info?.(
				`Atria Trigger: webhook route ${deliveryUrl} is not served yet — retrying registration in the background.`,
			);
			this.webhook.scheduleRegistration((url) =>
				this.registerAtria({ manualRun: false, deliveryUrl: url }),
			);
			return true;
		}

		return await this.registerAtria({ state, manualRun, deliveryUrl });
	}

	/** Teardown behind `webhookMethods.delete`. */
	async deactivate(): Promise<boolean> {
		const staticData = this.hook.getWorkflowStaticData('global');
		const state = this.webhook.getRegistrationState(staticData, this.nodeName) ?? {};

		// A manual execution must not tear down the registration of the active workflow
		if (this.webhook.isManualRun() && !state.createdInManualRun) return true;

		const createdFeedId = state.createdFeedId;
		let feedId = state.feedId;

		let outputId = state.outputId;
		if (!outputId) {
			outputId = (await this.outputs.findByName(this.resolveOutputName()))?.id;
		}
		if (!outputId) {
			await this.pauseCreatedFeed(createdFeedId);
			this.webhook.setRegistrationState(staticData, this.nodeName, { createdFeedId });
			return true;
		}

		const feed = await this.feeds.findAttachedToOutput(outputId);
		if (feed) {
			feedId = feed.id;
			const remaining = (feed.outputIds ?? []).filter((id) => id !== outputId);
			try {
				await this.feeds.updateFromDto(feed, { outputIds: remaining });
			} catch (error) {
				this.hook.logger.warn?.('Atria Trigger: failed to detach webhook output from feed', {
					error: (error as Error).message,
				});
			}
		}

		try {
			await this.outputs.delete(outputId);
		} catch {
			/* already gone */
		}

		// Only a feed this node created is paused — an existing feed the user attached
		// to keeps running. The feed itself is never deleted.
		await this.pauseCreatedFeed(createdFeedId);

		this.webhook.setRegistrationState(staticData, this.nodeName, { feedId, createdFeedId });
		return true;
	}

	private async pauseCreatedFeed(feedId?: string): Promise<void> {
		if (!feedId) return;
		try {
			await this.feeds.pauseIfActive(feedId);
		} catch (error) {
			this.hook.logger.warn?.('Atria Trigger: failed to pause the self-created feed', {
				error: (error as Error).message,
			});
		}
	}

	/**
	 * Creates (or reuses) the webhook output and connects it to a feed: the
	 * existing one selected in the node parameters, or a newly created feed in
	 * "Create New Feed" mode.
	 */
	private async registerAtria(ctx: {
		state?: TriggerRegistrationState;
		manualRun: boolean;
		deliveryUrl: string;
	}): Promise<boolean> {
		const staticData = this.hook.getWorkflowStaticData('global');
		const { state, manualRun, deliveryUrl } = ctx;

		const outputName = this.resolveOutputName();
		const outputDescription = `Created by n8n Atria Trigger (workflow: ${this.workflowName})`;

		// 1. the webhook output — reuse it by id or by name so retries never duplicate
		const outputId = await this.ensureWebhookOutput(state, deliveryUrl, outputName, outputDescription);

		if (this.feedSourceMode() === 'create') {
			return await this.registerCreatedFeed({
				state,
				manualRun,
				deliveryUrl,
				outputId,
				outputDescription,
			});
		}

		const feedId = this.hook.getNodeParameter('feedId') as string;
		if (!feedId) {
			throw new NodeOperationError(
				this.hook.getNode(),
				'No feed selected. Pick an existing feed (or paste its UUID) in the node parameters.',
			);
		}

		// 2. attach the output to the feed, preserving whatever it already had
		const feed = await this.feeds.getById(feedId).catch(() => undefined);
		if (!feed) {
			throw new NodeOperationError(
				this.hook.getNode(),
				`Feed ${feedId} not found. Create it in Atria first, then attach this trigger to it.`,
			);
		}
		const currentOutputIds = feed.outputIds ?? [];
		if (!currentOutputIds.includes(outputId)) {
			await this.feeds.update(
				feed.id,
				feedToUpdateBody(feed, {
					outputIds: Array.from(new Set([...currentOutputIds, outputId])),
				}),
			);
		}

		this.webhook.setRegistrationState(staticData, this.nodeName, {
			feedId: feed.id,
			outputId,
			url: deliveryUrl,
			createdInManualRun: manualRun,
		});
		return true;
	}

	/**
	 * The output must exist before a feed can reference it — Atria probes the URL
	 * while saving an output, and a feed is saved with its output ids.
	 */
	private async ensureWebhookOutput(
		state: TriggerRegistrationState | undefined,
		deliveryUrl: string,
		outputName: string,
		outputDescription: string,
	): Promise<string> {
		let output = state?.outputId
			? await this.outputs.getById(state.outputId).catch(() => undefined)
			: undefined;
		if (!output) output = await this.outputs.findByName(outputName);
		let outputId = output?.id;
		if (output && typeof output?.config?.url === 'string' && output.config.url !== deliveryUrl) {
			await this.outputs.updateWebhookOutputUrl(output.id, output, deliveryUrl);
		}
		if (!outputId) {
			outputId = await this.outputs.createWebhookOutput({
				name: outputName,
				description: outputDescription,
				url: deliveryUrl,
			});
		}
		return outputId;
	}

	/**
	 * Creates the feed from the node parameters, or updates the one this node
	 * created before, then starts it.
	 */
	private async registerCreatedFeed(ctx: {
		state?: TriggerRegistrationState;
		manualRun: boolean;
		deliveryUrl: string;
		outputId: string;
		outputDescription: string;
	}): Promise<boolean> {
		const staticData = this.hook.getWorkflowStaticData('global');
		const { state, manualRun, deliveryUrl, outputId, outputDescription } = ctx;

		const config = this.resolveCreateConfig();
		if (!config.name) {
			throw new NodeOperationError(this.hook.getNode(), 'Feed Name is required to create a feed');
		}
		if (!config.networkId) {
			throw new NodeOperationError(
				this.hook.getNode(),
				'No network selected for the new feed. Pick one or set "Network" with an expression.',
			);
		}
		if (config.startBlock !== null && !(config.startBlock > 0)) {
			throw new NodeOperationError(
				this.hook.getNode(),
				'Start Block must be a block number greater than 0. Switch "Start From" to "Latest Block" to skip backfill.',
			);
		}

		const existing = state?.createdFeedId
			? await this.feeds.getById(state.createdFeedId).catch(() => undefined)
			: undefined;

		let feedId: string;
		if (existing) {
			// Re-activation: write the current parameters into the same feed so its
			// cursor and history survive an edit of the filter code.
			const updated = await this.feeds.update(
				existing.id,
				buildTriggerCreateFeedBody({
					...config,
					outputIds: Array.from(new Set([...(existing.outputIds ?? []), outputId])),
					description: outputDescription,
				}),
			);
			feedId = updated.id;
		} else {
			try {
				const created = await this.feeds.create(
					buildTriggerCreateFeedBody({
						...config,
						outputIds: [outputId],
						description: outputDescription,
					}),
				);
				feedId = created.id;
			} catch (error) {
				// Do not leave an output behind that no feed delivers to
				await this.outputs.delete(outputId).catch(() => undefined);
				throw new NodeApiError(this.hook.getNode(), error as JsonObject);
			}
		}

		await this.feeds.ensureStarted(feedId);

		this.webhook.setRegistrationState(staticData, this.nodeName, {
			feedId,
			createdFeedId: feedId,
			createdFeedConfig: config,
			outputId,
			url: deliveryUrl,
			createdInManualRun: manualRun,
		});
		return true;
	}
}
