import type { INodeProperties } from 'n8n-workflow';
import { ERROR_HANDLING } from '../../Shared/constants';
import { searchModes } from '../../Shared/lib/property-modes';

/**
 * Parameters for "Feed Source › Create from library". Names carry the `lib`
 * prefix that `TriggerRegistrationService.fieldGetter('lib')` maps onto the
 * shared `buildCreateFromLibraryBody` field names — the same trick the
 * custom-code block uses with its `create` prefix.
 */
export const createFromLibraryProperties: INodeProperties[] = [
	{
		displayName: 'Library Template Name or ID',
		name: 'libFeedLibraryId',
		type: 'string',
		required: true,
		displayOptions: { show: { feedSource: ['library'] } },
		modes: searchModes('librarySearchList', 'Select a template'),
		default: '',
		description:
			'Feed library template to clone on activation. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Feed Name',
		name: 'libName',
		type: 'string',
		displayOptions: { show: { feedSource: ['library'] } },
		default: '',
		description: 'Name of the cloned feed. Defaults to the template ID when left empty.',
	},
	{
		displayName: 'Error Handling',
		name: 'libErrorHandling',
		type: 'options',
		displayOptions: { show: { feedSource: ['library'] } },
		options: ERROR_HANDLING.map((v) => ({ name: v, value: v })),
		default: 'StopOnError',
		description: 'What the feed runtime does when the filter/function throws',
	},
	{
		displayName: 'Filter Config (JSON)',
		name: 'libFilterConfig',
		type: 'string',
		displayOptions: { show: { feedSource: ['library'] } },
		default: '{}',
		description:
			'JSON object of template filter parameters, e.g. <code>{"contractAddress": {"type": "String", "value": "0x…"}}</code>. Get the shape from the library Get operation.',
	},
	{
		displayName: 'Function Config (JSON)',
		name: 'libFunctionConfig',
		type: 'string',
		displayOptions: { show: { feedSource: ['library'] } },
		default: '{}',
		description: 'JSON object of template function parameters (same shape as filter config)',
	},
	{
		displayName: 'Start Block',
		name: 'libStartBlock',
		type: 'number',
		displayOptions: { show: { feedSource: ['library'] } },
		default: 0,
		description: 'Block to begin processing from. Leave as 0 to start from the latest block.',
	},
	{
		displayName: 'End Block',
		name: 'libEndBlock',
		type: 'number',
		displayOptions: { show: { feedSource: ['library'] } },
		default: 0,
		description: 'Last block to process (backfill). Leave as 0 for no end (live feed).',
	},
];
