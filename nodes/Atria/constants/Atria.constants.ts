import type { INodePropertyOptions } from 'n8n-workflow';

/**
 * Constant values specific to the Atria node UI. Shared Atria Cloud model
 * constants live in `nodes/Shared/constants.ts`.
 */

/** Resources offered in the UI — also drives the registry's `<resource>:*` keys. */
export const RESOURCE_OPTIONS = [
	{ name: 'Feed', value: 'feed', description: 'Manage blockchain data feeds' },
	{ name: 'Library', value: 'library', description: 'Browse deployable feed templates' },
	{ name: 'Output', value: 'output', description: 'Manage webhook delivery outputs' },
] as const satisfies readonly INodePropertyOptions[];

export type AtriaResource = (typeof RESOURCE_OPTIONS)[number]['value'];
