import type { INodeExecutionData } from 'n8n-workflow';
import { NodeOperation } from '../ioperation';
import { LibraryService } from '../../../Shared/services/Library.service';

export class LibraryGetOperation extends NodeOperation {
	async execute(): Promise<INodeExecutionData[]> {
		const libraries = new LibraryService(this.ctx);
		const json = await libraries.getById(this.get('libraryId'));
		return [{ json }];
	}
}
