import type { INodeProperties } from 'n8n-workflow';
import { DATA_TYPES, ERROR_HANDLING } from '../../Shared/constants';

/**
 * Parameters for "Feed Source › Create new feed". Names carry the `create`
 * prefix that `TriggerRegistrationService.createParamGetter()` maps onto the
 * shared `buildCreateFeedBody` field names.
 */
export const createFeedProperties: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'createName',
		type: 'string',
		required: true,
		displayOptions: { show: { feedSource: ['create'] } },
		default: '',
		description: 'Name of the feed created on activation',
	},
	{
		displayName: 'Version',
		name: 'createVersion',
		type: 'string',
		displayOptions: { show: { feedSource: ['create'] } },
		default: '1.0',
	},
	{
		displayName: 'Description',
		name: 'createDescription',
		type: 'string',
		displayOptions: { show: { feedSource: ['create'] } },
		default: '',
	},
	{
		displayName: 'Network Name or ID',
		name: 'createNetworkId',
		type: 'options',
		required: true,
		displayOptions: { show: { feedSource: ['create'] } },
		typeOptions: { loadOptionsMethod: 'networkLoader' },
		default: '',
		description: 'Blockchain network the feed reads from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Data Type',
		name: 'createDataType',
		type: 'options',
		required: true,
		displayOptions: { show: { feedSource: ['create'] } },
		options: DATA_TYPES.map((v) => ({ name: v, value: v })),
		default: 'BlockWithLogs',
	},
	{
		displayName: 'Error Handling',
		name: 'createErrorHandling',
		type: 'options',
		displayOptions: { show: { feedSource: ['create'] } },
		options: ERROR_HANDLING.map((v) => ({ name: v, value: v })),
		default: 'StopOnError',
		description: 'What the feed runtime does when the filter/function throws',
	},
	{
		displayName: 'Filter Code',
		name: 'createFilterCode',
		type: 'string',
		typeOptions: { alwaysOpenEditWindow: true, editor: 'jsEditor' },
		displayOptions: { show: { feedSource: ['create'] } },
		default: '',
		description:
			'ECMA filter code executed against each block. Return the data to deliver, or null to skip the block.',
	},
	{
		displayName: 'Function Code',
		name: 'createFunctionCode',
		type: 'string',
		typeOptions: { alwaysOpenEditWindow: true, editor: 'jsEditor' },
		displayOptions: { show: { feedSource: ['create'] } },
		default: '',
		description:
			'ECMA transform function code. Leave both codes empty to deliver the whole block as-is.',
	},
	{
		displayName: 'Start Block',
		name: 'createStartBlock',
		type: 'number',
		displayOptions: { show: { feedSource: ['create'] } },
		default: 0,
		description: 'Block to begin processing from. Leave as 0 to start from the latest block.',
	},
	{
		displayName: 'End Block',
		name: 'createEndBlock',
		type: 'number',
		displayOptions: { show: { feedSource: ['create'] } },
		default: 0,
		description: 'Last block to process (backfill). Leave as 0 for no end (live feed).',
	},
	{
		displayName: 'Block Delay',
		name: 'createBlockDelay',
		type: 'number',
		displayOptions: { show: { feedSource: ['create'] } },
		default: 0,
		typeOptions: { minValue: 0, maxValue: 100 },
		description: 'Delay (in blocks) between ingestion and processing',
	},
];
