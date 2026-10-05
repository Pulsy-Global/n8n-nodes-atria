/**
 * Atria Cloud API model constants shared by both nodes and the shared services.
 */

/** Page size used by `methods.listSearch` pagination. */
export const PAGE_SIZE = 20;

/** `top` used by `loadOptions` loaders, which fetch in a single request. */
export const LOAD_OPTIONS_TOP = 200;

/** Atria feed data types. */
export const DATA_TYPES = ['BlockWithTransactions', 'BlockWithLogs', 'BlockWithTraces'];

/** Default per-request delivery timeout for webhook outputs, in seconds. */
export const DEFAULT_TIMEOUT_SECONDS = 10;

/** `top` when searching outputs by exact name. */
export const OUTPUT_SEARCH_TOP = 50;

/** `top` when scanning feeds for one attached to a given output. */
export const FEED_LOOKUP_TOP = 100;

/** Fallback network ids used when `GET /config/networks` is unavailable (Bearer-only for API keys). */
export const NETWORK_FALLBACKS: { name: string; value: string }[] = [
	{ name: 'Arbitrum One — Mainnet', value: 'arbitrum-one-mainnet' },
	{ name: 'Arbitrum One — Sepolia', value: 'arbitrum-one-sepolia' },
	{ name: 'Avalanche C-Chain — Mainnet', value: 'avalanche-c-chain-mainnet' },
	{ name: 'Base — Mainnet', value: 'base-mainnet' },
	{ name: 'Binance Smart Chain — Mainnet', value: 'bsc-mainnet' },
	{ name: 'Ethereum — Mainnet', value: 'ethereum-mainnet' },
	{ name: 'Ethereum — Sepolia', value: 'ethereum-sepolia' },
	{ name: 'Optimism — Mainnet', value: 'optimism-mainnet' },
	{ name: 'Polygon — Mainnet', value: 'polygon-mainnet' },
];
