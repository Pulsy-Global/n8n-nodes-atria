import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class AtriaApi implements ICredentialType {
	name = 'atriaApi';

	displayName = 'Atria API';

	documentationUrl = 'https://github.com/pulsy-works/n8n-nodes-atria';

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
