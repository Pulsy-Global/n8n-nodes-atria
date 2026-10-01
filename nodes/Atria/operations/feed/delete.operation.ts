import type { INodeExecutionData } from 'n8n-workflow';
import { NodeOperation } from '../ioperation';
import { FeedService } from '../../../Shared/services/Feed.service';

export class FeedDeleteOperation extends NodeOperation {
	async execute(): Promise<INodeExecutionData[]> {
		const feeds = new FeedService(this.ctx);
		const feedId = this.get('feedId');
		await feeds.delete(feedId);
		return [{ json: { id: feedId, deleted: true } }];
	}
}
