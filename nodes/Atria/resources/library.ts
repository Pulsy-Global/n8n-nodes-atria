import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { searchModes } from '../../Shared/lib/property-modes';

/** Library operations offered in the UI — also drives the `library:*` registry keys. */
export const LIBRARY_OPERATIONS = [
	{
		name: 'Get',
		value: 'get',
		description: 'Get a library template, including its filter/function config shape',
	},
	{ name: 'Get Many', value: 'list', description: 'List available feed templates' },
] as const satisfies readonly INodePropertyOptions[];

export type LibraryOperation = (typeof LIBRARY_OPERATIONS)[number]['value'];

export const libraryProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['library'] } },
		options: [...LIBRARY_OPERATIONS],
		default: 'list',
	},
	{
		displayName: 'Library Template',
		name: 'libraryId',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['library'], operation: ['get'] } },
		modes: searchModes('librarySearchList', 'Select a template'),
		default: '',
		description:
			'Inspect the template first, then use its filterConfig/functionConfig keys in "Feed → Create From Library"',
	},
];
