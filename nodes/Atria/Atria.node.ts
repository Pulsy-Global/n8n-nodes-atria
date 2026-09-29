import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { atriaApiRequest, unwrapPaged } from './genericFunctions';
import { feedProperties, executeFeedOperation } from './resources/feed';
import { outputProperties, executeOutputOperation } from './resources/output';
import { libraryProperties, executeLibraryOperation } from './resources/library';

const RESOURCE_OPTIONS = [
	{ name: 'Feed', value: 'feed', description: 'Manage blockchain data feeds' },
	{ name: 'Library', value: 'library', description: 'Browse deployable feed templates' },
	{ name: 'Output', value: 'output', description: 'Manage webhook delivery outputs' },
];

const PAGE_SIZE = 20;

export class Atria implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Atria',
		name: 'atria',
		icon: 'file:Atria.svg',
		group: ['transform', 'output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Deploy and manage Atria blockchain data feeds and webhook outputs',
		defaults: { name: 'Atria' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'atriaApi' }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: RESOURCE_OPTIONS,
				default: 'feed',
			},
			...feedProperties,
			...outputProperties,
			...libraryProperties,
		],
	};

	methods = {
		listSearch: {
			async feedSearchList(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				const skip = Number(paginationToken) || 0;
				const qs: IDataObject = { skip, top: PAGE_SIZE };
				if (filter) qs.search = filter;
				const response = await atriaApiRequest.call(this, { method: 'GET', endpoint: '/feeds', qs });
				const { items, totalCount } = unwrapPaged(response);
				const next = skip + items.length;
				return {
					results: items.map((f: any) => ({
						name: `${f.name} (${f.status ?? 'unknown'})`,
						value: f.id,
						url: undefined,
						hint: `network: ${f.networkId ?? '?'}`,
					})),
					paginationToken: next < totalCount ? String(next) : undefined,
				};
			},
			async outputSearchList(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				const skip = Number(paginationToken) || 0;
				const response = await atriaApiRequest.call(this, {
					method: 'GET',
					endpoint: '/outputs',
					qs: { skip, top: PAGE_SIZE },
				});
				const { items, totalCount } = unwrapPaged(response);
				const next = skip + items.length;
				return {
					results: items.map((o: any) => ({
						name: o.name,
						value: o.id,
						hint: o.config?.url,
					})),
					paginationToken: next < totalCount ? String(next) : undefined,
				};
			},
			async librarySearchList(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				const skip = Number(paginationToken) || 0;
				const response = await atriaApiRequest.call(this, {
					method: 'GET',
					endpoint: '/libraries',
					qs: { skip, top: PAGE_SIZE },
				});
				const { items, totalCount } = unwrapPaged(response);
				const next = skip + items.length;
				return {
					results: items.map((l: any) => ({
						name: l.name,
						value: l.id,
						hint: `${l.networkId ?? ''} • ${l.dataType ?? ''}`,
					})),
					paginationToken: next < totalCount ? String(next) : undefined,
				};
			},
			async tagSearchList(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				const skip = Number(paginationToken) || 0;
				const response = await atriaApiRequest.call(this, {
					method: 'GET',
					endpoint: '/tags',
					qs: { skip, top: PAGE_SIZE },
				});
				const { items, totalCount } = unwrapPaged(response);
				const next = skip + items.length;
				return {
					results: items.map((t: any) => ({ name: t.name, value: t.id })),
					paginationToken: next < totalCount ? String(next) : undefined,
				};
			},
		},
		loadOptions: {
			async networkLoader(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await atriaApiRequest.call(this, {
					method: 'GET',
					endpoint: '/config/networks',
				});
				const networks = response?.networks ?? [];
				const results: INodePropertyOptions[] = [];
				for (const network of networks) {
					for (const env of network.environments ?? []) {
						results.push({
							name: `${network.title} — ${env.title}`,
							value: env.id,
						});
					}
				}
				return results;
			},
			async outputLoader(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await atriaApiRequest.call(this, {
					method: 'GET',
					endpoint: '/outputs',
					qs: { top: 200 },
				});
				const { items } = unwrapPaged(response);
				return items.map((o: any) => ({ name: `${o.name} (${o.type})`, value: o.id }));
			},
			async tagLoader(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await atriaApiRequest.call(this, {
					method: 'GET',
					endpoint: '/tags',
					qs: { top: 200 },
				});
				const { items } = unwrapPaged(response);
				return items.map((t: any) => ({ name: t.name, value: t.id }));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				let output: INodeExecutionData[];
				if (resource === 'feed') {
					output = await executeFeedOperation.call(this, itemIndex);
				} else if (resource === 'output') {
					output = await executeOutputOperation.call(this, itemIndex);
				} else if (resource === 'library') {
					output = await executeLibraryOperation.call(this, itemIndex);
				} else {
					throw new NodeOperationError(this.getNode(), `Resource "${resource}" is not supported`, {
						itemIndex,
					});
				}
				returnData.push(...output);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message }, itemIndex });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
