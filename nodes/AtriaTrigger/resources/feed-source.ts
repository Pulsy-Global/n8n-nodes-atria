import type { INodeProperties } from 'n8n-workflow';
import { searchModes } from '../../Shared/lib/property-modes';

/**
 * Feed selection for the trigger: attach to an existing feed, or create a new
 * one (with the parameters in `create-feed.ts`) on activation.
 */
export const feedSourceProperties: INodeProperties[] = [
	{
		displayName:
			'On Activation This Node Creates a Webhook Output and Attaches It to the Selected Feed. With "Feed Source › Create New Feed" It Also Creates and Starts That Feed — and Updates It When You Change the Parameters and Re-Activate. On Deactivation the Output Is Detached and Removed, and a Self-Created Feed Is Paused but Never Deleted. Requires an API Key with feeds.manage and outputs.manage. Manual ("Listen for Test Event") Executions Register Nothing in Atria Unless a "Delivery URL" Is Set — Leave It Empty and Post Your Own Payload to the Test URL to Inspect the JSON Shape.',
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
				description: 'Create a feed from filter code and start it on activation',
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
		description:
			'The UUID of the existing Atria feed whose results should trigger this workflow',
	},
];
