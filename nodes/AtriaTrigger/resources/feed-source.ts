import type { INodeProperties } from 'n8n-workflow';
import { searchModes } from '../../Shared/lib/property-modes';

/** Activation notice + feed selection for the "existing feed" mode. */
export const feedSourceProperties: INodeProperties[] = [
	{
		displayName:
			'On activation this node creates a webhook output and attaches it to the selected feed. "Feed Source › Create new feed" additionally creates that feed and starts it; on deactivation the output is removed and a self-created feed is paused (never deleted). Requires an API key with feeds.manage and outputs.manage. Manual ("Listen for test event") executions register nothing in Atria unless a "Delivery URL" is set — leave it empty and post your own payload to the test URL to inspect the JSON shape.',
		name: 'notice',
		type: 'callout',
		default: '',
	},
	{
		displayName: 'Feed Source',
		name: 'feedSource',
		type: 'options',
		options: [
			{
				name: 'Existing Feed',
				value: 'existing',
				description: 'Attach to a feed that already exists in Atria',
			},
			{
				name: 'Create New Feed',
				value: 'create',
				description: 'Create a custom feed from code and start it on activation',
			},
		],
		default: 'existing',
	},
	{
		displayName: 'Feed',
		name: 'feedId',
		type: 'string',
		required: true,
		displayOptions: { show: { feedSource: ['existing'] } },
		modes: searchModes('feedSearchList', 'Select a feed'),
		default: '',
		description: 'The Atria feed whose results should trigger this workflow',
	},
];
