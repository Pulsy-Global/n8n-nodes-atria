import type { INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { headersToMap } from '../../../Shared/lib/parameters';
import { DEFAULT_TIMEOUT_SECONDS } from '../../../Shared/constants';
import type { OutputConfigDto } from '../../../Shared/lib/dtos';
import { NodeOperation } from '../ioperation';
import { OutputService } from '../../../Shared/services/Output.service';

export class OutputCreateOperation extends NodeOperation {
	async execute(): Promise<INodeExecutionData[]> {
		const outputs = new OutputService(this.ctx);
		const url = this.get('url') as string;
		if (!/^https?:\/\//i.test(url)) {
			throw new NodeOperationError(this.ctx.getNode(), 'Webhook URL must start with http:// or https://', {
				itemIndex: this.itemIndex,
			});
		}
		const config: OutputConfigDto = {
			url,
			method: this.get('method') ?? 'Post',
			timeoutSeconds: Number(this.get('timeoutSeconds') ?? DEFAULT_TIMEOUT_SECONDS),
		};
		const headers = headersToMap(this.get('headers'));
		if (headers) config.headers = headers;

		const json = await outputs.create({
			name: this.get('outputName'),
			description: this.get('outputDescription') || undefined,
			type: 'Webhook',
			config,
			tagIds: (this.get('outputTagIds') as string[]) ?? [],
		});
		return [{ json }];
	}
}
