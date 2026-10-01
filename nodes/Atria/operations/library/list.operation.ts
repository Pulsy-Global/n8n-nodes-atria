import type { INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperation } from '../ioperation';
import { LibraryService } from '../../../Shared/services/Library.service';

export class LibraryListOperation extends NodeOperation {
	async execute(): Promise<INodeExecutionData[]> {
		const libraries = new LibraryService(this.ctx);
		const items = await libraries.list(Number(this.get('listLimit')), Boolean(this.get('returnAll')));
		return items.map((json) => ({ json }));
	}
}
