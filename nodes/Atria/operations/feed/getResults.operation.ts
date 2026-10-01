import type { INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperation } from '../ioperation';
import { FeedService } from '../../../Shared/services/Feed.service';

export class FeedGetResultsOperation extends NodeOperation {
	async execute(): Promise<INodeExecutionData[]> {
		const feeds = new FeedService(this.ctx);
		const list = await feeds.getResults(this.get('feedId'), Number(this.get('limit')));
		return list.map((result) => {
			const json = { ...result };
			if (typeof json.data === 'string') {
				try {
					json.data = JSON.parse(json.data);
				} catch {
					/* keep raw string */
				}
			}
			return { json };
		});
	}
}
