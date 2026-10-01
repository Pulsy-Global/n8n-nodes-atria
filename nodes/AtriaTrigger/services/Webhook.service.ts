import type { IDataObject, IHookFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
	REGISTRATION_MAX_ATTEMPTS,
	REGISTRATION_RETRY_INTERVAL_MS,
	TEST_WEBHOOK_PATH,
	TRIGGER_STATE_KEY_PREFIX,
} from '../constants/AtriaTrigger.constants';

/** Plain promise-based wait for the sequential registration retry loop. */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export interface TriggerRegistrationState {
	/** Feed this node is attached to. For self-created feeds equals `createdFeedId`. */
	feedId?: string;
	/** Set when the trigger itself created the feed; reused on the next activation. */
	createdFeedId?: string;
	outputId?: string;
	previousOutputIds?: string[];
	url?: string;
	createdInManualRun?: boolean;
}

/**
 * n8n webhook lifecycle for the Atria Trigger (not Atria Cloud API model
 * access): registration state in static data, manual-run detection, probing
 * our own URL and the deferred-registration retry loop.
 */
export class WebhookService {
	constructor(private readonly hook: IHookFunctions) {}

	private stateKey(nodeName: string): string {
		return `${TRIGGER_STATE_KEY_PREFIX}${nodeName}`;
	}

	getRegistrationState(
		staticData: IDataObject,
		nodeName: string,
	): TriggerRegistrationState | undefined {
		return staticData[this.stateKey(nodeName)] as TriggerRegistrationState | undefined;
	}

	setRegistrationState(
		staticData: IDataObject,
		nodeName: string,
		state: TriggerRegistrationState | undefined,
	) {
		const key = this.stateKey(nodeName);
		if (state === undefined) {
			delete staticData[key];
		} else {
			staticData[key] = state;
		}
	}

	/** True while n8n waits for a manual test event (as opposed to an active workflow). */
	isManualRun(): boolean {
		const url = this.hook.getNodeWebhookUrl('default');
		return typeof url === 'string' && url !== '' && this.isTestWebhookUrl(url);
	}

	private isTestWebhookUrl(webhookUrl: string): boolean {
		try {
			return new URL(webhookUrl).pathname.includes(TEST_WEBHOOK_PATH);
		} catch {
			return false;
		}
	}

	/**
	 * The URL deliveries must go to: whatever the user configured in "Delivery URL",
	 * or this n8n instance's own webhook URL when left empty.
	 */
	resolveDeliveryUrl(): string | undefined {
		const options = (this.hook.getNodeParameter('options', {}) as IDataObject) ?? {};
		const custom = typeof options.deliveryUrl === 'string' ? options.deliveryUrl.trim() : '';
		if (custom) {
			if (!/^https?:\/\//i.test(custom)) {
				throw new NodeOperationError(
					this.hook.getNode(),
					'Delivery URL must start with http:// or https://',
				);
			}
			return custom;
		}
		return this.hook.getNodeWebhookUrl('default');
	}

	/**
	 * Sends the same probe Atria sends, to our own webhook URL. During *publishing* n8n
	 * calls `create()` before the production route is served, so registering an output
	 * there would fail Atria's own probe (404) and abort the publish.
	 */
	async probeOwnUrl(url: string): Promise<boolean> {
		try {
			const response = await this.hook.helpers.httpRequest({
				method: 'POST',
				url,
				body: { probe: true },
				headers: { 'Content-Type': 'application/json', 'X-Atria-Probe': '1' },
				json: true,
			});
			return response !== undefined && response !== null;
		} catch {
			return false;
		}
	}

	/**
	 * n8n 2.x publishes/activates a workflow before its production webhook route responds,
	 * and Atria probes the URL while saving an output. Registering inside `create()` would
	 * therefore abort the publish, so `register` is retried in the background.
	 * Fire-and-forget: the loop's rejections are caught and logged, never propagated.
	 * Sequential on purpose — an overlapping timer would run probe+register twice when
	 * one attempt outlives the interval.
	 */
	scheduleRegistration(register: (deliveryUrl: string) => Promise<unknown>): void {
		void this.retryRegistration(register).catch((error) => {
			this.hook.logger.warn?.('Atria Trigger: deferred registration failed', {
				error: (error as Error).message,
			});
		});
	}

	/** Sequential (non-overlapping) attempt loop behind {@link scheduleRegistration}. */
	private async retryRegistration(register: (deliveryUrl: string) => Promise<unknown>): Promise<void> {
		for (let attempt = 0; attempt < REGISTRATION_MAX_ATTEMPTS; attempt += 1) {
			try {
				// re-read every attempt: options (Delivery URL) may have changed since publish
				const url = this.resolveDeliveryUrl();
				if (url && (await this.probeOwnUrl(url))) {
					await register(url);
					this.hook.logger.info?.(
						'Atria Trigger: registered the Atria output and feed once the webhook route became available.',
					);
					return;
				}
			} catch (error) {
				// resolveDeliveryUrl() validation failed or register() threw:
				// same treatment as before — warn once and stop retrying.
				this.hook.logger.warn?.('Atria Trigger: deferred registration failed', {
					error: (error as Error).message,
				});
				return;
			}
			if (attempt < REGISTRATION_MAX_ATTEMPTS - 1) await delay(REGISTRATION_RETRY_INTERVAL_MS);
		}
		this.hook.logger.warn?.(
			'Atria Trigger: webhook route never became available — Atria registration skipped. Publish the workflow again to retry.',
		);
	}
}
