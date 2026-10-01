import type { INodeExecutionData } from 'n8n-workflow';
import { NodeOperation } from '../ioperation';
import { OutputService } from '../../../Shared/services/Output.service';

export class OutputGetOperation extends NodeOperation {
	async execute(): Promise<INodeExecutionData[]> {
		const outputs = new OutputService(this.ctx);
		const json = await outputs.getById(this.get('outputId'));
		return [{ json }];
	}
}
