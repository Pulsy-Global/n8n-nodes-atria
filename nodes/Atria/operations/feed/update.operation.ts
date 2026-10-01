import type { INodeExecutionData } from 'n8n-workflow';
import { feedToUpdateBody } from '../../../Shared/lib/feed.dto';
import type { CreateFeedDto } from '../../../Shared/lib/dtos';
import { NodeOperation } from '../ioperation';
import { FeedService } from '../../../Shared/services/Feed.service';

export class FeedUpdateOperation extends NodeOperation {
	async execute(): Promise<INodeExecutionData[]> {
		const feeds = new FeedService(this.ctx);
		const feedId = this.get('feedId') as string;
		const feed = await feeds.getById(feedId);
		const overrides: Partial<CreateFeedDto> = {};
		if (this.get('updateName')) overrides.name = this.get('updateName');
		if (this.get('updateDescription')) overrides.description = this.get('updateDescription');
		if (this.get('replaceOutputs')) overrides.outputIds = (this.get('outputIds') as string[]) ?? [];
		const tagIds = this.get('tagIds') as string[];
		if (Array.isArray(tagIds) && tagIds.length) overrides.tagIds = tagIds;

		const json = await feeds.update(feedId, feedToUpdateBody(feed, overrides));
		return [{ json }];
	}
}
