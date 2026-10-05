import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { searchModes } from '../../Shared/lib/property-modes';
import { DATA_TYPES } from '../../Shared/constants';

/** Feed operations offered in the UI — also drives the `feed:*` registry keys. */
export const FEED_OPERATIONS = [
	{ name: 'Delete', value: 'delete', description: 'Delete a feed' },
	{ name: 'Get', value: 'get', description: 'Get a single feed' },
	{ name: 'Get Many', value: 'list', description: 'List feeds' },
	{
		name: 'Get Results',
		value: 'getResults',
		description: 'Fetch recent delivery results of a feed',
	},
	{ name: 'Pause', value: 'pause', description: 'Pause a running feed' },
	{ name: 'Start', value: 'start', description: 'Start (deploy) a feed' },
	{ name: 'Test', value: 'test', description: 'Dry-run filter/function against a block' },
	{ name: 'Update', value: 'update', description: 'Update an existing feed' },
] as const satisfies readonly INodePropertyOptions[];

export type FeedOperation = (typeof FEED_OPERATIONS)[number]['value'];

export const feedProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['feed'] } },
		options: [...FEED_OPERATIONS],
		default: 'list',
	},
	// --- shared feed id ---
	{
		displayName: 'Feed',
		name: 'feedId',
		type: 'string',
		required: true,
		displayOptions: {
			show: { resource: ['feed'], operation: ['get', 'delete', 'update', 'start', 'pause', 'getResults'] },
		},
		modes: searchModes('feedSearchList', 'Select a feed'),
		default: '',
		description: 'The feed to act on',
	},
	// --- shared by test (dry-run code against a block) ---
	{
		displayName: 'Network Name or ID',
		name: 'networkId',
		type: 'options',
		required: true,
		displayOptions: { show: { resource: ['feed'], operation: ['test'] } },
		typeOptions: { loadOptionsMethod: 'networkLoader' },
		default: '',
		description: 'Blockchain network the feed reads from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Data Type',
		name: 'dataType',
		type: 'options',
		required: true,
		displayOptions: { show: { resource: ['feed'], operation: ['test'] } },
		options: DATA_TYPES.map((v) => ({ name: v, value: v })),
		default: 'BlockWithLogs',
	},
	{
		displayName: 'Filter Code',
		name: 'filterCode',
		type: 'string',
		typeOptions: { alwaysOpenEditWindow: true, editor: 'jsEditor' },
		displayOptions: { show: { resource: ['feed'], operation: ['test'] } },
		default: '',
		description: 'ECMA filter code executed against each block',
	},
	{
		displayName: 'Function Code',
		name: 'functionCode',
		type: 'string',
		typeOptions: { alwaysOpenEditWindow: true, editor: 'jsEditor' },
		displayOptions: { show: { resource: ['feed'], operation: ['test'] } },
		default: '',
		description: 'ECMA transform function code',
	},
	// --- outputs / tags (update) ---
	{
		displayName: 'Output Names or IDs',
		name: 'outputIds',
		type: 'multiOptions',
		displayOptions: {
			show: { resource: ['feed'], operation: ['update'] },
		},
		typeOptions: { loadOptionsMethod: 'outputLoader' },
		default: [],
		description: 'Delivery outputs attached to the feed. Used together with "Replace Outputs". Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Tag Names or IDs',
		name: 'tagIds',
		type: 'multiOptions',
		description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions: {
			show: { resource: ['feed'], operation: ['update'] },
		},
		typeOptions: { loadOptionsMethod: 'tagLoader' },
		default: [],
	},
	// --- update overrides ---
	{
		displayName: 'New Name',
		name: 'updateName',
		type: 'string',
		displayOptions: { show: { resource: ['feed'], operation: ['update'] } },
		default: '',
		description: 'Leave empty to keep the current name',
	},
	{
		displayName: 'New Description',
		name: 'updateDescription',
		type: 'string',
		displayOptions: { show: { resource: ['feed'], operation: ['update'] } },
		default: '',
		description: 'Leave empty to keep the current description',
	},
	{
		displayName: 'Replace Outputs',
		name: 'replaceOutputs',
		type: 'boolean',
		displayOptions: { show: { resource: ['feed'], operation: ['update'] } },
		default: false,
		description: 'Whether to replace the feed outputs with the ones selected above',
	},
	// --- start options ---
	{
		displayName: 'Reset Cursor',
		name: 'resetCursor',
		type: 'boolean',
		displayOptions: { show: { resource: ['feed'], operation: ['start'] } },
		default: false,
		description: 'Whether to restart processing from the feed start block instead of the saved cursor',
	},
	// --- test options ---
	{
		displayName: 'Block Number',
		name: 'blockNumber',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['feed'], operation: ['test'] } },
		default: '',
		description: 'Network block to run the filter/function against',
	},
	{
		displayName: 'Execute Outputs',
		name: 'executeOutputs',
		type: 'boolean',
		displayOptions: { show: { resource: ['feed'], operation: ['test'] } },
		default: false,
		description: 'Whether the test result is also delivered to the selected outputs',
	},
	{
		displayName: 'Test Output IDs',
		name: 'testOutputsIds',
		type: 'multiOptions',
		description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions: { show: { resource: ['feed'], operation: ['test'], executeOutputs: [true] } },
		typeOptions: { loadOptionsMethod: 'outputLoader' },
		default: [],
	},
	// --- get results ---
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { resource: ['feed'], operation: ['getResults'] } },
		default: 50,
		typeOptions: { minValue: 1, maxValue: 500 },
		description: 'Max number of results to return',
	},
	// --- list options ---
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: { show: { resource: ['feed', 'output', 'library'], operation: ['list'] } },
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'listLimit',
		type: 'number',
		displayOptions: {
			show: { resource: ['feed', 'output', 'library'], operation: ['list'], returnAll: [false] },
		},
		default: 50,
		typeOptions: { minValue: 1, maxValue: 200 },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Search',
		name: 'search',
		type: 'string',
		displayOptions: { show: { resource: ['feed'], operation: ['list'] } },
		default: '',
		description: 'OData search term matched against feed name/description',
	},
];
