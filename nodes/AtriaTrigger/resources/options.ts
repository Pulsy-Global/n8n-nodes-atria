import type { INodeProperties } from 'n8n-workflow';

/** The "Options" collection: output naming, delivery URL override, header exposure. */
export const triggerOptionsProperties: INodeProperties[] = [
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
				description: 'Name of the webhook output created for this workflow. Defaults to "n8n &lt;node name&gt; - &lt;workflow name&gt;".',
			},
			{
				displayName: 'Delivery URL',
				name: 'deliveryUrl',
				type: 'string',
				default: '',
				description:
					'Where Atria should deliver results. Leave empty to use this n8n instance\'s webhook URL. Any absolute http(s) URL works, including external sinks such as https://webhook.site/… — but note that deliveries then never reach this node.',
				placeholder: 'https://example.com/webhook',
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
];
