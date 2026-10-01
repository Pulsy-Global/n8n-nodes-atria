import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { searchModes } from '../../Shared/lib/property-modes';

/** Output operations offered in the UI — also drives the `output:*` registry keys. */
export const OUTPUT_OPERATIONS = [
	{ name: 'Create', value: 'create', description: 'Create a webhook output' },
	{ name: 'Delete', value: 'delete', description: 'Delete an output' },
	{ name: 'Get', value: 'get', description: 'Get a single output' },
	{ name: 'Get Many', value: 'list', description: 'List outputs' },
	{ name: 'Update', value: 'update', description: 'Update an output' },
] as const satisfies readonly INodePropertyOptions[];

export type OutputOperation = (typeof OUTPUT_OPERATIONS)[number]['value'];

export const outputProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['output'] } },
		options: [...OUTPUT_OPERATIONS],
		default: 'list',
	},
	{
		displayName: 'Output',
		name: 'outputId',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['output'], operation: ['get', 'delete', 'update'] } },
		modes: searchModes('outputSearchList', 'Select an output'),
		default: '',
		description: 'The output to act on',
	},
	{
		displayName: 'Name',
		name: 'outputName',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['output'], operation: ['create'] } },
		default: '',
	},
	{
		displayName: 'Description',
		name: 'outputDescription',
		type: 'string',
		displayOptions: { show: { resource: ['output'], operation: ['create', 'update'] } },
		default: '',
	},
	{
		displayName: 'Webhook URL',
		name: 'url',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['output'], operation: ['create'] } },
		default: '',
		description: 'Destination URL that receives feed results as JSON POST. E.g. an n8n Webhook node URL.',
	},
	{
		displayName: 'HTTP Method',
		name: 'method',
		type: 'options',
		displayOptions: { show: { resource: ['output'], operation: ['create', 'update'] } },
		options: [
			{ name: 'POST', value: 'Post' },
			{ name: 'PUT', value: 'Put' },
		],
		default: 'Post',
	},
	{
		displayName: 'Headers',
		name: 'headers',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		displayOptions: { show: { resource: ['output'], operation: ['create', 'update'] } },
		default: {},
		description: 'Custom headers Atria sends with every delivery to this output (e.g. a shared secret)',
		options: [
			{
				name: 'header',
				displayName: 'Header',
				values: [
					{ displayName: 'Name', name: 'name', type: 'string', default: '' },
					{ displayName: 'Value', name: 'value', type: 'string', default: '', typeOptions: { password: true } },
				],
			},
		],
	},
	{
		displayName: 'Timeout (Seconds)',
		name: 'timeoutSeconds',
		type: 'number',
		displayOptions: { show: { resource: ['output'], operation: ['create', 'update'] } },
		default: 10,
		typeOptions: { minValue: 1, maxValue: 45 },
		description: 'Per-request delivery timeout (1–45 seconds)',
	},
	{
		displayName: 'Tag Names or IDs',
		name: 'outputTagIds',
		type: 'multiOptions',
		description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions: { show: { resource: ['output'], operation: ['create'] } },
		typeOptions: { loadOptionsMethod: 'tagLoader' },
		default: [],
	},
	// update overrides
	{
		displayName: 'New Webhook URL',
		name: 'updateUrl',
		type: 'string',
		displayOptions: { show: { resource: ['output'], operation: ['update'] } },
		default: '',
		description: 'Leave empty to keep the current URL',
	},
	// list params are shared with feed (returnAll/listLimit defined in feed.ts)
];
