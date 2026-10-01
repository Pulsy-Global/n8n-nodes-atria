import type { INodeExecutionData } from 'n8n-workflow';
import { NodeOperation } from '../ioperation';
import { FeedService } from '../../../Shared/services/Feed.service';

export class FeedGetOperation extends NodeOperation {
	async execute(): Promise<INodeExecutionData[]> {
		const feeds = new FeedService(this.ctx);
		const json = await feeds.getById(this.get('feedId'));
		return [{ json }];
	}
}
