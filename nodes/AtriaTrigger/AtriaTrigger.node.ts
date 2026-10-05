import type {
	IHookFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { makeListSearchHandler } from '../Shared/lib/list-search';
import { PROBE_HEADER } from './constants/AtriaTrigger.constants';
import { FeedService } from '../Shared/services/Feed.service';
import { TriggerRegistrationService } from './services/Registration.service';
import { feedSourceProperties } from './resources/feed-source';
import { triggerOptionsProperties } from './resources/options';

/**
 * On activation this node creates a webhook output and attaches it to an
 * existing Atria feed; the workflow starts whenever that feed delivers
 * results. On deactivation the output is detached and deleted. The feed
 * itself is never created, started or paused from here. All lifecycle logic
 * lives in `TriggerRegistrationService`.
 */
export class AtriaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Atria Trigger',
		name: 'atriaTrigger',
		icon: { light: 'file:AtriaTrigger.svg', dark: 'file:AtriaTrigger.svg' },
		group: ['trigger'],
		version: 1,
		description:
			'Starts the workflow when an existing Atria feed delivers new blockchain results',
		subtitle: '={{ $parameter["feedId"] }}',
		defaults: { name: 'Atria Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'atriaApi' }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				// `path` must not be empty: with '' n8n builds /webhook/<webhookId>/ with a
				// trailing slash, which is fragile once anything normalises URLs.
				path: 'atria',
			},
		],
		properties: [...feedSourceProperties, ...triggerOptionsProperties],
	};

	methods = {
		listSearch: {
			feedSearchList: makeListSearchHandler(
				(ctx, skip, top, filter) => new FeedService(ctx).searchPage(skip, top, filter),
				(f) => ({ name: `${f.name} (${f.status ?? 'unknown'})`, value: f.id }),
			),
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return new TriggerRegistrationService(this).checkExists();
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return new TriggerRegistrationService(this).create();
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				return new TriggerRegistrationService(this).deactivate();
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const headers = this.getHeaderData();
		const body = (this.getBodyData() ?? {}) as IDataObject;

		// Atria probes every output URL once before saving it. Answer it so the registration
		// succeeds, but do not create an execution: returning data without `workflowData`
		// makes n8n reply 200 and skip the run entirely.
		const isProbe =
			String(headers[PROBE_HEADER] ?? '').length > 0 ||
			(body.probe === true && Object.keys(body).length === 1);
		if (isProbe) {
			return { webhookResponse: { received: true } };
		}

		const options = (this.getNodeParameter('options', {}) as IDataObject) ?? {};
		const json: IDataObject = { ...body };

		if (options.includeHeaders) {
			json.headers = Object.fromEntries(
				Object.entries(headers).filter(([name]) => name.toLowerCase().startsWith('x-atria')),
			);
		}

		const item: INodeExecutionData = { json };
		return { workflowData: [[item]] };
	}
}
