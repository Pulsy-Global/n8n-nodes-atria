import type { INodeProperties } from 'n8n-workflow';
import { searchModes } from '../../Shared/lib/property-modes';

/** Activation notice + feed selection for the "existing feed" mode. */
export const feedSourceProperties: INodeProperties[] = [
	{
		displayName: 'On Activation This Node Creates a Webhook Output and Attaches It to the Selected Feed. "Feed Source › Create New Feed" Additionally Creates that Feed and Starts It; "Feed Source › Create From Library" Clones a Library Template Instead. on Deactivation the Output Is Removed and a Self-Created Feed Is Paused (Never Deleted). Requires an API Key with feeds.manage and outputs.manage. Manual ("Listen for Test Event") Executions Register Nothing in Atria Unless a "Delivery URL" Is Set — Leave It Empty and Post Your Own Payload to the Test URL to Inspect the JSON Shape.',
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
			{
				name: 'Create From Library',
				value: 'library',
				description: 'Clone a feed library template and start it on activation',
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
