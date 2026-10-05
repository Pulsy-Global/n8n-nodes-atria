import type { INodeProperties } from 'n8n-workflow';
import { searchModes } from '../../Shared/lib/property-modes';

/** Feed selection for the trigger: attach to an existing feed by id. */
export const feedSourceProperties: INodeProperties[] = [
	{
		displayName:
			'On Activation This Node Creates a Webhook Output and Attaches It to the Selected Feed. On Deactivation the Output Is Detached and Removed. The Feed Itself Is Never Modified Otherwise or Paused. Requires an API Key with feeds.manage and outputs.manage. Manual ("Listen for Test Event") Executions Register Nothing in Atria Unless a "Delivery URL" Is Set — Leave It Empty and Post Your Own Payload to the Test URL to Inspect the JSON Shape.',
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
		description:
			'The UUID of the existing Atria feed whose results should trigger this workflow',
	},
];
