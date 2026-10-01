import type { INodePropertyMode } from 'n8n-workflow';

/**
 * Standard "By ID / From List" modes for entity-ID parameters, backed by a
 * `methods.listSearch` implementation on the node class.
 */
export function searchModes(method: string, placeholder = 'Search and select…'): INodePropertyMode[] {
	// `default` is not part of INodePropertyMode, but the community-node lint
	// rules require it on every parameter object (mode entries included).
	// Declaring the array untyped keeps the excess property out of the fresh
	// literal check while the return type still guards consumers.
	const modes: Array<INodePropertyMode & { default?: string }> = [
		{
			displayName: 'By ID',
			name: 'string',
			type: 'string',
			default: '',
			placeholder: 'Paste the GUID',
		},
		{
			displayName: 'From List',
			name: 'listSearch',
			type: 'list',
			default: undefined,
			placeholder,
			typeOptions: { searchListMethod: method, searchable: true },
		},
	];
	return modes;
}
