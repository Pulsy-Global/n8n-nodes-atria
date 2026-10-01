/**
 * Constant values for the Atria Trigger node. Model-level constants (feed
 * statuses, paging sizes, timeouts, network fallbacks) live in
 * `nodes/Shared/constants.ts` because the shared services use them too.
 */

/** Prefix of the static-data key the registration state is stored under. */
export const TRIGGER_STATE_KEY_PREFIX = 'atriaTriggerWebhook:';

/**
 * n8n serves two different URLs per node: `/webhook/<id>/atria` for an active
 * workflow and `/webhook-test/<id>/atria` for "Listen for test event".
 */
export const TEST_WEBHOOK_PATH = '/webhook-test/';

/** Atria verifies every webhook output with this probe before saving it. */
export const PROBE_HEADER = 'x-atria-probe';

/** How often `WebhookService.scheduleRegistration` retries while waiting for the webhook route. */
export const REGISTRATION_RETRY_INTERVAL_MS = 3000;

/** Give up deferred registration after this many attempts. */
export const REGISTRATION_MAX_ATTEMPTS = 10;
