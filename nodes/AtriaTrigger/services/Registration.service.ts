import type { IDataObject, IHookFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { feedToUpdateBody } from '../../Shared/lib/feed.dto';
import { FeedService } from '../../Shared/services/Feed.service';
import { OutputService } from '../../Shared/services/Output.service';
import { WebhookService, type TriggerRegistrationState } from './Webhook.service';

/**
 * Webhook-lifecycle orchestration for the Atria Trigger: the bodies behind the
 * node's `webhookMethods` (checkExists / create / delete). On activation the
 * node creates a webhook output and attaches it to the selected existing feed.
 * On deactivation the output is detached from the feed and deleted. The feed
 * itself is never created, started or paused from here.
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

		let outputId = state.outputId;
		if (!outputId) {
			outputId = (await this.outputs.findByName(this.resolveOutputName()))?.id;
		}
		if (!outputId) return true;

		// A manual execution must not tear down the registration of the active workflow
		if (this.webhook.isManualRun() && !state.createdInManualRun) return true;

		let feedId = state.feedId;
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

		this.webhook.setRegistrationState(staticData, this.nodeName, { feedId });
		return true;
	}

	/**
	 * Creates (or reuses) the webhook output and attaches it to the existing
	 * feed selected in the node parameters.
	 */
	private async registerAtria(ctx: {
		state?: TriggerRegistrationState;
		manualRun: boolean;
		deliveryUrl: string;
	}): Promise<boolean> {
		const staticData = this.hook.getWorkflowStaticData('global');
		const { state, manualRun, deliveryUrl } = ctx;

		const feedId = this.hook.getNodeParameter('feedId') as string;
		if (!feedId) {
			throw new NodeOperationError(
				this.hook.getNode(),
				'No feed selected. Pick an existing feed (or paste its UUID) in the node parameters.',
			);
		}

		const outputName = this.resolveOutputName();
		const outputDescription = `Created by n8n Atria Trigger (workflow: ${this.workflowName})`;

		// 1. the webhook output — reuse it by id or by name so retries never duplicate
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
}
