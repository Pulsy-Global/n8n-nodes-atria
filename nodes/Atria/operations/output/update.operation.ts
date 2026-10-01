import type { INodeExecutionData } from 'n8n-workflow';
import { headersToMap } from '../../../Shared/lib/parameters';
import type { UpsertOutputDto } from '../../../Shared/lib/dtos';
import { NodeOperation } from '../ioperation';
import { OutputService } from '../../../Shared/services/Output.service';

export class OutputUpdateOperation extends NodeOperation {
	async execute(): Promise<INodeExecutionData[]> {
		const outputs = new OutputService(this.ctx);
		const outputId = this.get('outputId') as string;
		const existing = await outputs.getById(outputId);
		const body: UpsertOutputDto = {
			name: this.get('outputName') || existing.name,
			description: this.get('outputDescription') || existing.description,
			type: 'Webhook',
			config: {
				...(existing.config ?? {}),
				...(this.get('updateUrl') ? { url: this.get('updateUrl') } : {}),
				...(this.get('method') ? { method: this.get('method') } : {}),
				...(this.get('timeoutSeconds') ? { timeoutSeconds: Number(this.get('timeoutSeconds')) } : {}),
				...(() => {
					const headers = headersToMap(this.get('headers'));
					return headers ? { headers } : {};
				})(),
			},
			tagIds: existing.tagIds ?? [],
		};
		const json = await outputs.update(outputId, body);
		return [{ json }];
	}
}
