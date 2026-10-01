import type { INodeExecutionData } from 'n8n-workflow';
import { NodeOperation } from '../ioperation';
import { OutputService } from '../../../Shared/services/Output.service';

export class OutputListOperation extends NodeOperation {
	async execute(): Promise<INodeExecutionData[]> {
		const outputs = new OutputService(this.ctx);
		const items = await outputs.list(Number(this.get('listLimit')), Boolean(this.get('returnAll')));
		return items.map((json) => ({ json }));
	}
}
