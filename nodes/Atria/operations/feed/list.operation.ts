import type { INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperation } from '../ioperation';
import { FeedService } from '../../../Shared/services/Feed.service';

export class FeedListOperation extends NodeOperation {
	async execute(): Promise<INodeExecutionData[]> {
		const feeds = new FeedService(this.ctx);
		const qs: IDataObject = {};
		if (this.get('search')) qs.search = this.get('search');
		const items = await feeds.list(qs, Number(this.get('listLimit')), Boolean(this.get('returnAll')));
		return items.map((json) => ({ json }));
	}
}
