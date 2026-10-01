import type { INodeExecutionData } from 'n8n-workflow';
import { NodeOperation } from '../ioperation';
import { FeedService } from '../../../Shared/services/Feed.service';

export class FeedPauseOperation extends NodeOperation {
	async execute(): Promise<INodeExecutionData[]> {
		const feeds = new FeedService(this.ctx);
		const feedId = this.get('feedId');
		const json = await feeds.pause(feedId);
		return [{ json: json ?? { id: feedId, paused: true } }];
	}
}
