import type {
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	INodeExecutionData,
	INodeListSearchResult,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { atriaApiRequest, feedToUpdateBody, searchModes } from '../Atria/genericFunctions';

const TRIGGER_STATE_KEY = 'atriaTriggerWebhook';

interface TriggerRegistrationState {
	feedId: string;
	outputId: string;
	previousOutputIds: string[];
}

function getRegistrationState(staticData: IDataObject): TriggerRegistrationState | undefined {
	return staticData[TRIGGER_STATE_KEY] as TriggerRegistrationState | undefined;
}

function setRegistrationState(staticData: IDataObject, state: TriggerRegistrationState | undefined) {
	staticData[TRIGGER_STATE_KEY] = state;
}

/**
 * On activation this node creates an Atria webhook output pointing at the
 * workflow's webhook URL and attaches it to the selected feed. On
 * deactivation the output is removed from the feed and deleted.
 */
export class AtriaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Atria Trigger',
		name: 'atriaTrigger',
		icon: 'file:AtriaTrigger.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when an Atria feed delivers new blockchain results',
		defaults: { name: 'Atria Trigger' },
		inputs: [],
		outputs: ['main'],
		credentials: [{ name: 'atriaApi' }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: '',
				// path is empty: n8n uses the node's unique webhookId
			},
		],
		properties: [
			{
				displayName:
					'On activation Atria creates a dedicated webhook output pointing at this workflow and attaches it to the selected feed (the feed is redeployed automatically). On deactivation the output is detached and deleted.',
				name: 'notice',
				type: 'callout',
				default: '',
			},
			{
				displayName: 'Feed',
				name: 'feedId',
				type: 'string',
				required: true,
				modes: searchModes('feedSearchList', 'Select a feed'),
				default: '',
				description: 'The Atria feed whose results should trigger this workflow',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Output Name',
						name: 'outputName',
						type: 'string',
						default: '',
						description:
							'Name of the webhook output created for this workflow. Defaults to "n8n <node name> - <workflow name>".',
					},
					{
						displayName: 'Include Delivery Headers',
						name: 'includeHeaders',
						type: 'boolean',
						default: false,
						description:
							'Whether X-Atria-* request headers are exposed on the output item as a "headers" field',
					},
				],
			},
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
				const qs: IDataObject = { skip, top: 20 };
				if (filter) qs.search = filter;
				const response = await atriaApiRequest.call(this, { method: 'GET', endpoint: '/feeds', qs });
				const items = response?.items ?? [];
				const totalCount = Number(response?.totalCount ?? items.length);
				const next = skip + items.length;
				return {
					results: items.map((f: any) => ({
						name: `${f.name} (${f.status ?? 'unknown'})`,
						value: f.id,
					})),
					paginationToken: next < totalCount ? String(next) : undefined,
				};
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('global');
				const state = getRegistrationState(staticData);
				if (!state?.outputId) return false;
				try {
					await atriaApiRequest.call(this, {
						method: 'GET',
						endpoint: `/outputs/${state.outputId}`,
					});
					return true;
				} catch {
					setRegistrationState(staticData, undefined);
					return false;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				if (!webhookUrl) {
					throw new NodeOperationError(
						this.getNode(),
						'Could not determine the workflow webhook URL. Is "Public webhook URL" configured for this n8n instance?',
					);
				}

				const feedId = this.getNodeParameter('feedId') as string;
				if (!feedId) {
					throw new NodeOperationError(this.getNode(), 'No feed selected');
				}

				const options = (this.getNodeParameter('options', {}) as IDataObject) ?? {};
				const nodeName = this.getNode().name;
				const workflowName = this.getWorkflow().name ?? 'workflow';
				const outputName =
					(options.outputName as string) || `n8n ${nodeName} - ${workflowName}`.slice(0, 255);

				// 1. create the webhook output pointing at this workflow
				const output = await atriaApiRequest.call(this, {
					method: 'POST',
					endpoint: '/outputs',
					body: {
						name: outputName,
						description: `Created by n8n Atria Trigger (workflow: ${workflowName})`,
						type: 'Webhook',
						config: { url: webhookUrl, method: 'Post', timeoutSeconds: 30 },
					},
				});

				// 2. attach it to the feed (keeping whatever outputs the feed already had)
				const feed = await atriaApiRequest.call(this, {
					method: 'GET',
					endpoint: `/feeds/${feedId}`,
				});
				const previousOutputIds: string[] = feed.outputIds ?? [];
				const merged = Array.from(new Set([...previousOutputIds, output.id]));
				await atriaApiRequest.call(this, {
					method: 'PUT',
					endpoint: `/feeds/${feedId}`,
					body: feedToUpdateBody(feed, { outputIds: merged }),
				});

				setRegistrationState(this.getWorkflowStaticData('global'), {
					feedId,
					outputId: output.id,
					previousOutputIds,
				});
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('global');
				const state = getRegistrationState(staticData);
				if (!state?.outputId) return true;

				try {
					// detach the output from the feed
					const feed = await atriaApiRequest.call(this, {
						method: 'GET',
						endpoint: `/feeds/${state.feedId}`,
					});
					const remaining = (feed.outputIds ?? []).filter((id: string) => id !== state.outputId);
					await atriaApiRequest.call(this, {
						method: 'PUT',
						endpoint: `/feeds/${state.feedId}`,
						body: feedToUpdateBody(feed, { outputIds: remaining }),
					});
				} catch (error) {
					this.logger.warn?.('Atria Trigger: failed to detach webhook output from feed', {
						error: (error as Error).message,
					});
				}

				try {
					await atriaApiRequest.call(this, {
						method: 'DELETE',
						endpoint: `/outputs/${state.outputId}`,
					});
				} catch {
					/* already gone */
				}

				setRegistrationState(staticData, undefined);
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData() as IDataObject;
		const options = (this.getNodeParameter('options', {}) as IDataObject) ?? {};

		const json: IDataObject = { ...body };

		// Atria sends the feed payload as `data`; parse when it arrives as a JSON string
		if (typeof json.data === 'string') {
			try {
				json.data = JSON.parse(json.data);
			} catch {
				/* keep raw */
			}
		}

		if (options.includeHeaders) {
			const headers = this.getHeaderData();
			json.headers = Object.fromEntries(
				Object.entries(headers).filter(([name]) => name.toLowerCase().startsWith('x-atria')),
			);
		}

		const item: INodeExecutionData = { json };
		return { workflowData: [[item]] };
	}
}
