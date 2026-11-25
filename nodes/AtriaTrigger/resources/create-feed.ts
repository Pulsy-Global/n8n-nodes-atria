import type { INodeProperties } from 'n8n-workflow';
import { DATA_TYPES } from '../../Shared/constants';

/**
 * Parameters for "Feed Source › Create New Feed". They are deliberately few:
 * everything else a feed needs is fixed by
 * `buildTriggerCreateFeedBody` (version, error handling, no transform function,
 * no end block, no delay, no tags).
 */
export const createFeedProperties: INodeProperties[] = [
	{
		displayName: 'Feed Name',
		name: 'createName',
		type: 'string',
		required: true,
		displayOptions: { show: { feedSource: ['create'] } },
		default: '',
		placeholder: 'My feed',
		description: 'Name of the feed created in Atria when this workflow is activated',
	},
	{
		displayName: 'Network Name or ID',
		name: 'createNetworkId',
		type: 'options',
		required: true,
		displayOptions: { show: { feedSource: ['create'] } },
		typeOptions: { loadOptionsMethod: 'networkLoader' },
		default: '',
		description:
			'Blockchain network the feed reads from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Data Type',
		name: 'createDataType',
		type: 'options',
		required: true,
		displayOptions: { show: { feedSource: ['create'] } },
		options: DATA_TYPES.map((v) => ({ name: v, value: v })),
		default: 'BlockWithLogs',
		description: 'What the feed runtime hands to the filter code',
	},
	{
		displayName: 'Filter Code',
		name: 'createFilterCode',
		type: 'string',
		required: true,
		typeOptions: { alwaysOpenEditWindow: true, editor: 'jsEditor' },
		displayOptions: { show: { feedSource: ['create'] } },
		default: '',
		description:
			'JavaScript executed against each block. Return the data to deliver to this workflow, or null to skip the block.',
	},
	{
		displayName: 'Start From',
		name: 'createStartFrom',
		type: 'options',
		displayOptions: { show: { feedSource: ['create'] } },
		options: [
			{
				name: 'Latest Block',
				value: 'latest',
				description: 'Deliver everything from now on, ignoring earlier blocks',
			},
			{
				name: 'Specific Block',
				value: 'block',
				description: 'Backfill from a block you choose, then keep going live',
			},
		],
		default: 'latest',
		description: 'Where the feed begins processing',
	},
	{
		displayName: 'Start Block',
		name: 'createStartBlock',
		type: 'number',
		required: true,
		displayOptions: { show: { feedSource: ['create'], createStartFrom: ['block'] } },
		default: 0,
		description: 'First block the feed processes',
	},
];
