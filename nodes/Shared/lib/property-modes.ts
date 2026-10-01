import type { INodePropertyMode } from 'n8n-workflow';

/**
 * Standard "By ID / From List" modes for entity-ID parameters, backed by a
 * `methods.listSearch` implementation on the node class.
 */
export function searchModes(method: string, placeholder = 'Search and select…'): INodePropertyMode[] {
	return [
		{
			displayName: 'By ID',
			name: 'string',
			type: 'string',
			placeholder: 'Paste the GUID',
		},
		{
			displayName: 'From List',
			name: 'listSearch',
			type: 'list',
			placeholder,
			typeOptions: { searchListMethod: method, searchable: true },
		},
	];
}
