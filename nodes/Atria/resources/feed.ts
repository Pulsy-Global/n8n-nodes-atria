import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
	atriaApiRequest,
	atriaListAll,
	feedToUpdateBody,
	headersToMap,
	parseJsonParameter,
	searchModes,
} from '../genericFunctions';

const DATA_TYPES = ['BlockWithTransactions', 'BlockWithLogs', 'BlockWithTraces'];
const ERROR_HANDLING = ['StopOnError', 'ContinueOnError'];

export const feedProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['feed'] } },
		options: [
			{ name: 'Create', value: 'create', description: 'Create a custom feed (filter/function code)' },
			{
				name: 'Create From Library',
				value: 'createFromLibrary',
				description: 'Deploy a feed built from a library template',
			},
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
		],
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
	// --- create (custom) ---
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['feed'], operation: ['create'] } },
		default: '',
	},
	{
		displayName: 'Version',
		name: 'version',
		type: 'string',
		displayOptions: { show: { resource: ['feed'], operation: ['create'] } },
		default: '1.0',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		displayOptions: { show: { resource: ['feed'], operation: ['create'] } },
		default: '',
	},
	{
		displayName: 'Network',
		name: 'networkId',
		type: 'options',
		required: true,
		displayOptions: { show: { resource: ['feed'], operation: ['create', 'test'] } },
		typeOptions: { loadOptionsMethod: 'networkLoader' },
		default: '',
		description: 'Blockchain network the feed reads from',
	},
	{
		displayName: 'Data Type',
		name: 'dataType',
		type: 'options',
		required: true,
		displayOptions: { show: { resource: ['feed'], operation: ['create', 'test'] } },
		options: DATA_TYPES.map((v) => ({ name: v, value: v })),
		default: 'BlockWithLogs',
	},
	{
		displayName: 'Error Handling',
		name: 'errorHandling',
		type: 'options',
		displayOptions: { show: { resource: ['feed'], operation: ['create', 'createFromLibrary'] } },
		options: ERROR_HANDLING.map((v) => ({ name: v, value: v })),
		default: 'StopOnError',
		description: 'What the feed runtime does when the filter/function throws',
	},
	{
		displayName: 'Start Block',
		name: 'startBlock',
		type: 'number',
		displayOptions: { show: { resource: ['feed'], operation: ['create', 'createFromLibrary'] } },
		default: 0,
		description: 'Block to begin processing from. Leave as 0 to start from the latest block.',
	},
	{
		displayName: 'End Block',
		name: 'endBlock',
		type: 'number',
		displayOptions: { show: { resource: ['feed'], operation: ['create', 'createFromLibrary'] } },
		default: 0,
		description: 'Last block to process (backfill). Leave as 0 for no end (live feed).',
	},
	{
		displayName: 'Filter Code',
		name: 'filterCode',
		type: 'string',
		typeOptions: { alwaysOpenEditWindow: true, editor: 'jsEditor' },
		displayOptions: { show: { resource: ['feed'], operation: ['create', 'test'] } },
		default: '',
		description: 'ECMA filter code executed against each block',
	},
	{
		displayName: 'Function Code',
		name: 'functionCode',
		type: 'string',
		typeOptions: { alwaysOpenEditWindow: true, editor: 'jsEditor' },
		displayOptions: { show: { resource: ['feed'], operation: ['create', 'test'] } },
		default: '',
		description: 'ECMA transform function code',
	},
	{
		displayName: 'Block Delay',
		name: 'blockDelay',
		type: 'number',
		displayOptions: { show: { resource: ['feed'], operation: ['create'] } },
		default: 0,
		typeOptions: { minValue: 0, maxValue: 100 },
		description: 'Delay (in blocks) between ingestion and processing',
	},
	// --- create from library ---
	{
		displayName: 'Library Template',
		name: 'feedLibraryId',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['feed'], operation: ['createFromLibrary'] } },
		modes: searchModes('librarySearchList', 'Select a template'),
		default: '',
		description: 'Feed library template to deploy',
	},
	{
		displayName: 'Filter Config (JSON)',
		name: 'filterConfig',
		type: 'string',
		displayOptions: { show: { resource: ['feed'], operation: ['createFromLibrary'] } },
		default: '{}',
		description:
			'JSON object of template filter parameters, e.g. <code>{"contractAddress": {"type": "String", "value": "0x…"}}</code>. Get the shape from the library Get operation.',
	},
	{
		displayName: 'Function Config (JSON)',
		name: 'functionConfig',
		type: 'string',
		displayOptions: { show: { resource: ['feed'], operation: ['createFromLibrary'] } },
		default: '{}',
		description: 'JSON object of template function parameters (same shape as filter config)',
	},
	// --- outputs / tags (shared by create variants and update) ---
	{
		displayName: 'Outputs',
		name: 'outputIds',
		type: 'multiOptions',
		displayOptions: {
			show: { resource: ['feed'], operation: ['create', 'createFromLibrary', 'update'] },
		},
		typeOptions: { loadOptionsMethod: 'outputLoader' },
		default: [],
		description: 'Delivery outputs attached to the feed. Required for create operations.',
	},
	{
		displayName: 'Tags',
		name: 'tagIds',
		type: 'multiOptions',
		displayOptions: {
			show: { resource: ['feed'], operation: ['create', 'createFromLibrary', 'update'] },
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
		default: 10,
		typeOptions: { minValue: 1, maxValue: 500 },
		description: 'How many recent results to fetch',
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

function buildCreateBody(get: (name: string) => any, node: any): IDataObject {
	const outputIds = (get('outputIds') as string[]) ?? [];
	if (outputIds.length === 0) {
		throw new NodeOperationError(node, 'At least one output is required to create a feed');
	}
	const startBlock = Number(get('startBlock'));
	const endBlock = Number(get('endBlock'));
	return {
		name: get('name'),
		version: get('version') || '1.0',
		description: get('description') || undefined,
		networkId: get('networkId'),
		dataType: get('dataType'),
		errorHandling: get('errorHandling'),
		startBlock: startBlock > 0 ? startBlock : null,
		endBlock: endBlock > 0 ? endBlock : null,
		filterCode: get('filterCode') || null,
		functionCode: get('functionCode') || null,
		outputIds,
		tagIds: (get('tagIds') as string[]) ?? [],
		blockDelay: Number(get('blockDelay')) || 0,
	};
}

export async function executeFeedOperation(
	this: any,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const get = (name: string) => this.getNodeParameter(name, itemIndex);
	const operation = get('operation') as string;
	const endpoint = '/feeds';

	switch (operation) {
		case 'list': {
			const qs: IDataObject = {};
			if (get('search')) qs.search = get('search');
			const items = await atriaListAll.call(
				this,
				endpoint,
				Number(get('listLimit')),
				Boolean(get('returnAll')),
				qs,
			);
			return items.map((json) => ({ json }));
		}
		case 'get': {
			const json = await atriaApiRequest.call(this, {
				method: 'GET',
				endpoint: `${endpoint}/${get('feedId')}`,
			});
			return [{ json }];
		}
		case 'create': {
			const json = await atriaApiRequest.call(this, {
				method: 'POST',
				endpoint,
				body: buildCreateBody(get, this.getNode()),
			});
			return [{ json }];
		}
		case 'createFromLibrary': {
			const outputIds = (get('outputIds') as string[]) ?? [];
			if (outputIds.length === 0) {
				throw new NodeOperationError(
					this.getNode(),
					'At least one output is required to deploy a feed',
					{ itemIndex },
				);
			}
			const startBlock = Number(get('startBlock'));
			const endBlock = Number(get('endBlock'));
			const body: IDataObject = {
				feedLibraryId: get('feedLibraryId'),
				name: get('name') || get('feedLibraryId'),
				errorHandling: get('errorHandling'),
				filterConfig: parseJsonParameter(
					this.getNode(),
					itemIndex,
					get('filterConfig'),
					'filterConfig',
				),
				functionConfig: parseJsonParameter(
					this.getNode(),
					itemIndex,
					get('functionConfig'),
					'functionConfig',
				),
				outputIds,
				tagIds: (get('tagIds') as string[]) ?? [],
			};
			if (startBlock > 0) body.startBlock = startBlock;
			if (endBlock > 0) body.endBlock = endBlock;

			const json = await atriaApiRequest.call(this, {
				method: 'POST',
				endpoint: '/feeds/library',
				body,
			});
			return [{ json }];
		}
		case 'update': {
			const feedId = get('feedId') as string;
			const feed = await atriaApiRequest.call(this, {
				method: 'GET',
				endpoint: `${endpoint}/${feedId}`,
			});
			const overrides: IDataObject = {};
			if (get('updateName')) overrides.name = get('updateName');
			if (get('updateDescription')) overrides.description = get('updateDescription');
			if (get('replaceOutputs')) overrides.outputIds = (get('outputIds') as string[]) ?? [];
			const tagIds = get('tagIds') as string[];
			if (Array.isArray(tagIds) && tagIds.length) overrides.tagIds = tagIds;

			const json = await atriaApiRequest.call(this, {
				method: 'PUT',
				endpoint: `${endpoint}/${feedId}`,
				body: feedToUpdateBody(feed, overrides),
			});
			return [{ json }];
		}
		case 'delete': {
			await atriaApiRequest.call(this, {
				method: 'DELETE',
				endpoint: `${endpoint}/${get('feedId')}`,
			});
			return [{ json: { id: get('feedId'), deleted: true } }];
		}
		case 'start': {
			const json = await atriaApiRequest.call(this, {
				method: 'POST',
				endpoint: `${endpoint}/${get('feedId')}/start`,
				qs: { resetCursor: Boolean(get('resetCursor')) },
			});
			return [{ json: json ?? { id: get('feedId'), started: true } }];
		}
		case 'pause': {
			const json = await atriaApiRequest.call(this, {
				method: 'POST',
				endpoint: `${endpoint}/${get('feedId')}/pause`,
			});
			return [{ json: json ?? { id: get('feedId'), paused: true } }];
		}
		case 'getResults': {
			const results = await atriaApiRequest.call(this, {
				method: 'GET',
				endpoint: `${endpoint}/${get('feedId')}/results`,
				qs: { limit: Number(get('limit')) },
			});
			const list = Array.isArray(results) ? results : [results];
			return list.map((result: IDataObject) => {
				const json = { ...result };
				if (typeof json.data === 'string') {
					try {
						json.data = JSON.parse(json.data);
					} catch {
						/* keep raw string */
					}
				}
				return { json };
			});
		}
		case 'test': {
			const body: IDataObject = {
				blockchainId: get('networkId'),
				dataType: get('dataType'),
				blockNumber: String(get('blockNumber')),
				filterCode: get('filterCode') || null,
				functionCode: get('functionCode') || null,
				executeOutputs: Boolean(get('executeOutputs')),
			};
			const outputsIds = get('testOutputsIds') as string[];
			if (Array.isArray(outputsIds) && outputsIds.length) body.outputsIds = outputsIds;

			const json = await atriaApiRequest.call(this, { method: 'POST', endpoint: '/feeds/test', body });
			return [{ json: json ?? {} }];
		}
		default:
			throw new NodeOperationError(this.getNode(), `Feed operation "${operation}" is not supported`, {
				itemIndex,
			});
	}
}
