import type { INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperation } from '../ioperation';
import { FeedService } from '../../../Shared/services/Feed.service';

export class FeedTestOperation extends NodeOperation {
	async execute(): Promise<INodeExecutionData[]> {
		const feeds = new FeedService(this.ctx);
		const body: IDataObject = {
			blockchainId: this.get('networkId'),
			dataType: this.get('dataType'),
			blockNumber: String(this.get('blockNumber')),
			filterCode: this.get('filterCode') || null,
			functionCode: this.get('functionCode') || null,
			executeOutputs: Boolean(this.get('executeOutputs')),
		};
		const outputsIds = this.get('testOutputsIds') as string[];
		if (Array.isArray(outputsIds) && outputsIds.length) body.outputsIds = outputsIds;

		const json = await feeds.test(body);
		return [{ json: json ?? {} }];
	}
}
