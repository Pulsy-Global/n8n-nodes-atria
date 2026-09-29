import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { atriaApiRequest, atriaListAll, headersToMap, searchModes } from '../genericFunctions';

export const outputProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['output'] } },
		options: [
			{ name: 'Create', value: 'create', description: 'Create a webhook output' },
			{ name: 'Delete', value: 'delete', description: 'Delete an output' },
			{ name: 'Get', value: 'get', description: 'Get a single output' },
			{ name: 'Get Many', value: 'list', description: 'List outputs' },
			{ name: 'Update', value: 'update', description: 'Update an output' },
		],
		default: 'list',
	},
	{
		displayName: 'Output',
		name: 'outputId',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['output'], operation: ['get', 'delete', 'update'] } },
		modes: searchModes('outputSearchList', 'Select an output'),
		default: '',
		description: 'The output to act on',
	},
	{
		displayName: 'Name',
		name: 'outputName',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['output'], operation: ['create'] } },
		default: '',
	},
	{
		displayName: 'Description',
		name: 'outputDescription',
		type: 'string',
		displayOptions: { show: { resource: ['output'], operation: ['create', 'update'] } },
		default: '',
	},
	{
		displayName: 'Webhook URL',
		name: 'url',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['output'], operation: ['create'] } },
		default: '',
		description: 'Destination URL that receives feed results as JSON POST. E.g. an n8n Webhook node URL.',
	},
	{
		displayName: 'HTTP Method',
		name: 'method',
		type: 'options',
		displayOptions: { show: { resource: ['output'], operation: ['create', 'update'] } },
		options: [
			{ name: 'POST', value: 'Post' },
			{ name: 'PUT', value: 'Put' },
		],
		default: 'Post',
	},
	{
		displayName: 'Headers',
		name: 'headers',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		displayOptions: { show: { resource: ['output'], operation: ['create', 'update'] } },
		default: {},
		description: 'Custom headers Atria sends with every delivery to this output (e.g. a shared secret)',
		options: [
			{
				name: 'header',
				displayName: 'Header',
				values: [
					{ displayName: 'Name', name: 'name', type: 'string', default: '' },
					{ displayName: 'Value', name: 'value', type: 'string', default: '', typeOptions: { password: true } },
				],
			},
		],
	},
	{
		displayName: 'Timeout (seconds)',
		name: 'timeoutSeconds',
		type: 'number',
		displayOptions: { show: { resource: ['output'], operation: ['create', 'update'] } },
		default: 10,
		typeOptions: { minValue: 1, maxValue: 45 },
		description: 'Per-request delivery timeout (1–45 seconds)',
	},
	{
		displayName: 'Tags',
		name: 'outputTagIds',
		type: 'multiOptions',
		displayOptions: { show: { resource: ['output'], operation: ['create'] } },
		typeOptions: { loadOptionsMethod: 'tagLoader' },
		default: [],
	},
	// update overrides
	{
		displayName: 'New Webhook URL',
		name: 'updateUrl',
		type: 'string',
		displayOptions: { show: { resource: ['output'], operation: ['update'] } },
		default: '',
		description: 'Leave empty to keep the current URL',
	},
	// list params are shared with feed (returnAll/listLimit defined in feed.ts)
];

export async function executeOutputOperation(
	this: any,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const get = (name: string) => this.getNodeParameter(name, itemIndex);
	const operation = get('operation') as string;
	const endpoint = '/outputs';

	switch (operation) {
		case 'list': {
			const items = await atriaListAll.call(
				this,
				endpoint,
				Number(get('listLimit')),
				Boolean(get('returnAll')),
			);
			return items.map((json) => ({ json }));
		}
		case 'get': {
			const json = await atriaApiRequest.call(this, {
				method: 'GET',
				endpoint: `${endpoint}/${get('outputId')}`,
			});
			return [{ json }];
		}
		case 'create': {
			const url = get('url') as string;
			if (!/^https?:\/\//i.test(url)) {
				throw new NodeOperationError(this.getNode(), 'Webhook URL must start with http:// or https://', {
					itemIndex,
				});
			}
			const config: IDataObject = {
				url,
				method: get('method') ?? 'Post',
				timeoutSeconds: Number(get('timeoutSeconds') ?? 10),
			};
			const headers = headersToMap(get('headers'));
			if (headers) config.headers = headers;

			const json = await atriaApiRequest.call(this, {
				method: 'POST',
				endpoint,
				body: {
					name: get('outputName'),
					description: get('outputDescription') || undefined,
					type: 'Webhook',
					config,
					tagIds: (get('outputTagIds') as string[]) ?? [],
				},
			});
			return [{ json }];
		}
		case 'update': {
			const outputId = get('outputId') as string;
			const existing = await atriaApiRequest.call(this, {
				method: 'GET',
				endpoint: `${endpoint}/${outputId}`,
			});
			const body: IDataObject = {
				name: get('outputName') || existing.name,
				description: get('outputDescription') || existing.description,
				type: 'Webhook',
				config: {
					...(existing.config ?? {}),
					...(get('updateUrl') ? { url: get('updateUrl') } : {}),
					...(get('method') ? { method: get('method') } : {}),
					...(get('timeoutSeconds') ? { timeoutSeconds: Number(get('timeoutSeconds')) } : {}),
					...(() => {
						const headers = headersToMap(get('headers'));
						return headers ? { headers } : {};
					})(),
				},
				tagIds: existing.tagIds ?? [],
			};
			const json = await atriaApiRequest.call(this, {
				method: 'PUT',
				endpoint: `${endpoint}/${outputId}`,
				body,
			});
			return [{ json }];
		}
		case 'delete': {
			await atriaApiRequest.call(this, {
				method: 'DELETE',
				endpoint: `${endpoint}/${get('outputId')}`,
			});
			return [{ json: { id: get('outputId'), deleted: true } }];
		}
		default:
			throw new NodeOperationError(
				this.getNode(),
				`Output operation "${operation}" is not supported`,
				{ itemIndex },
			);
	}
}
