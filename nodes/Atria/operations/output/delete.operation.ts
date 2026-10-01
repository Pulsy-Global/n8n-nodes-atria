import type { INodeExecutionData } from 'n8n-workflow';
import { NodeOperation } from '../ioperation';
import { OutputService } from '../../../Shared/services/Output.service';

export class OutputDeleteOperation extends NodeOperation {
	async execute(): Promise<INodeExecutionData[]> {
		const outputs = new OutputService(this.ctx);
		const outputId = this.get('outputId');
		await outputs.delete(outputId);
		return [{ json: { id: outputId, deleted: true } }];
	}
}
