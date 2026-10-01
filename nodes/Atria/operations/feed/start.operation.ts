import type { INodeExecutionData } from 'n8n-workflow';
import { NodeOperation } from '../ioperation';
import { FeedService } from '../../../Shared/services/Feed.service';

export class FeedStartOperation extends NodeOperation {
	async execute(): Promise<INodeExecutionData[]> {
		const feeds = new FeedService(this.ctx);
		const feedId = this.get('feedId');
		const json = await feeds.start(feedId, Boolean(this.get('resetCursor')));
		return [{ json: json ?? { id: feedId, started: true } }];
	}
}
