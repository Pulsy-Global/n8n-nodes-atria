/**
 * Atria Cloud API model constants shared by both nodes and the shared services.
 */

/** Page size used by `methods.listSearch` pagination. */
export const PAGE_SIZE = 20;

/** `top` used by `loadOptions` loaders, which fetch in a single request. */
export const LOAD_OPTIONS_TOP = 200;

/** Atria feed data types. */
export const DATA_TYPES = ['BlockWithTransactions', 'BlockWithLogs', 'BlockWithTraces'];

/** Feed statuses that mean "already running" — `ensureStarted`/`pauseIfActive` then do nothing. */
export const ACTIVE_FEED_STATUSES = ['Running', 'Pending'];

/** Version stamped on feeds the Atria Trigger creates. */
export const CREATED_FEED_VERSION = '1.0';

/**
 * Error handling of trigger-created feeds: keep processing later blocks when the
 * filter code throws, instead of stopping the whole feed on the first bad block.
 */
export const CREATED_FEED_ERROR_HANDLING = 'ContinueOnError';

/** Default per-request delivery timeout for webhook outputs, in seconds. */
export const DEFAULT_TIMEOUT_SECONDS = 10;

/** `top` when searching outputs by exact name. */
export const OUTPUT_SEARCH_TOP = 50;

/** `top` when scanning feeds for one attached to a given output. */
export const FEED_LOOKUP_TOP = 100;

/**
 * Fallback network ids used when `GET /config/networks` is unavailable
 * (Bearer-only for API keys). Doubles as the supported-chains allowlist —
 * `NetworkService` filters live API results through these values, so this is
 * the single place to add or remove a chain.
 */
export const NETWORK_FALLBACKS: { name: string; value: string }[] = [
	{ name: 'Ethereum — Mainnet', value: 'ethereum-mainnet' },
	{ name: 'Ethereum — Sepolia', value: 'ethereum-sepolia' },
	{ name: 'Polygon — Mainnet', value: 'polygon-mainnet' },
];
