import type { INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { NodeOperation } from '../ioperation';
import { FeedService } from '../../../Shared/services/Feed.service';
import { buildCreateFeedBody } from '../../../Shared/lib/feed.dto';
import type { CreateFeedDto } from '../../../Shared/lib/dtos';

export class FeedCreateOperation extends NodeOperation {
	async execute(): Promise<INodeExecutionData[]> {
		const feeds = new FeedService(this.ctx);
		const json = await feeds.create(this.buildBody());
		return [{ json }];
	}

	/** Builds a CreateFeedDto from the node parameters, via the shared builder. */
	private buildBody(): CreateFeedDto {
		const outputIds = (this.get('outputIds') as string[]) ?? [];
		if (outputIds.length === 0) {
			throw new NodeOperationError(this.ctx.getNode(), 'At least one output is required to create a feed');
		}
		return buildCreateFeedBody(
			(field, fallback) => this.get(field, fallback),
			outputIds,
			(this.get('tagIds') as string[]) ?? [],
		);
	}
}
