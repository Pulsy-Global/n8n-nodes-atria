import type {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AtriaApi implements ICredentialType {
	name = 'atriaApi';

	displayName = 'Atria API';

	icon = 'file:AtriaApi.svg' as const;

	/**
	 * "Test" button in the credential modal: a cheap authenticated read
	 * (`GET /feeds` one item) that validates key + base URL together.
	 */
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/feeds?$top=1',
			headers: { 'X-API-KEY': '={{$credentials.apiKey}}' },
		},
	};

	documentationUrl = 'https://github.com/Pulsy-Global/n8n-nodes-atria';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'API key from the Atria dashboard (Account → API Keys). Grant it the scopes you plan to use, e.g. <code>feeds.read</code>, <code>feeds.manage</code>, <code>outputs.read</code>, <code>outputs.manage</code>.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://atria.pulsy.app/api',
			description:
				'Atria Cloud REST API base URL, including the /api suffix. Production: https://atria.pulsy.app/api — Development: https://atria-dev.pulsy.works/api',
		},
	];
}
