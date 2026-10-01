import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { feedProperties } from './resources/feed';
import { outputProperties } from './resources/output';
import { libraryProperties } from './resources/library';
import { RESOURCE_OPTIONS } from './constants/Atria.constants';
import { LOAD_OPTIONS_TOP } from '../Shared/constants';
import { makeListSearchHandler } from '../Shared/lib/list-search';
import { resolveOperation } from './operations';
import { FeedService } from '../Shared/services/Feed.service';
import { OutputService } from '../Shared/services/Output.service';
import { LibraryService } from '../Shared/services/Library.service';
import { TagService } from '../Shared/services/Tag.service';
import { NetworkService } from '../Shared/services/Network.service';

export class Atria implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Atria',
		name: 'atria',
		icon: { light: 'file:Atria.svg', dark: 'file:Atria.svg' },
		group: ['transform', 'output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Deploy and manage Atria blockchain data feeds and webhook outputs',
		defaults: { name: 'Atria' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'atriaApi' }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [...RESOURCE_OPTIONS],
				default: 'feed',
			},
			...feedProperties,
			...outputProperties,
			...libraryProperties,
		],
		usableAsTool: true,
	};

	methods = {
		listSearch: {
			feedSearchList: makeListSearchHandler(
				(ctx, skip, top, filter) => new FeedService(ctx).searchPage(skip, top, filter),
				(f) => ({
					name: `${f.name} (${f.status ?? 'unknown'})`,
					value: f.id,
					hint: `network: ${f.networkId ?? '?'}`,
				}),
			),
			// NOTE: output/library/tag search pre-date server-side filtering and pass no
			// `search` param — the dialog filters the fetched page client-side.
			outputSearchList: makeListSearchHandler(
				(ctx, skip, top) => new OutputService(ctx).searchPage(skip, top),
				(o) => ({ name: o.name, value: o.id, hint: o.config?.url }),
			),
			librarySearchList: makeListSearchHandler(
				(ctx, skip, top) => new LibraryService(ctx).searchPage(skip, top),
				(l) => ({
					name: l.name,
					value: l.id,
					hint: `${l.networkId ?? ''} • ${l.dataType ?? ''}`,
				}),
			),
			tagSearchList: makeListSearchHandler(
				(ctx, skip, top) => new TagService(ctx).searchPage(skip, top),
				(t) => ({ name: t.name, value: t.id }),
			),
		},
		loadOptions: {
			async networkLoader(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return new NetworkService(this).getEnvironmentOptions();
			},
			async outputLoader(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const { items } = await new OutputService(this).listTop(LOAD_OPTIONS_TOP);
				return items.map((o) => ({ name: `${o.name} (${o.type})`, value: o.id }));
			},
			async tagLoader(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const { items } = await new TagService(this).listTop(LOAD_OPTIONS_TOP);
				return items.map((t) => ({ name: t.name, value: t.id }));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const Operation = resolveOperation(resource, operation);
				if (!Operation) {
					throw new NodeOperationError(
						this.getNode(),
						`Operation "${operation}" is not supported for resource "${resource}"`,
						{ itemIndex },
					);
				}
				const output = await new Operation(this, itemIndex).execute();
				returnData.push(...output);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, itemIndex });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
			}
		}

		return [returnData];
	}
}
