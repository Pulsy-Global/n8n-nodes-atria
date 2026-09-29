import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { atriaApiRequest, atriaListAll, searchModes } from '../genericFunctions';

export const libraryProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['library'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a library template, including its filter/function config shape',
			},
			{ name: 'Get Many', value: 'list', description: 'List available feed templates' },
		],
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

export async function executeLibraryOperation(
	this: any,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const get = (name: string) => this.getNodeParameter(name, itemIndex);
	const operation = get('operation') as string;

	switch (operation) {
		case 'list': {
			const items = await atriaListAll.call(
				this,
				'/libraries',
				Number(get('listLimit')),
				Boolean(get('returnAll')),
			);
			return items.map((json) => ({ json }));
		}
		case 'get': {
			const json = await atriaApiRequest.call(this, {
				method: 'GET',
				endpoint: `/libraries/${get('libraryId')}`,
			});
			return [{ json }];
		}
		default:
			throw new NodeOperationError(
				this.getNode(),
				`Library operation "${operation}" is not supported`,
				{ itemIndex },
			);
	}
}
