import type { INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { parseJsonParameter } from '../../../Shared/lib/parameters';
import { buildCreateFromLibraryBody } from '../../../Shared/lib/feed.dto';
import { NodeOperation } from '../ioperation';
import { FeedService } from '../../../Shared/services/Feed.service';

export class FeedCreateFromLibraryOperation extends NodeOperation {
	async execute(): Promise<INodeExecutionData[]> {
		const feeds = new FeedService(this.ctx);
		const outputIds = (this.get('outputIds') as string[]) ?? [];
		if (outputIds.length === 0) {
			throw new NodeOperationError(
				this.ctx.getNode(),
				'At least one output is required to deploy a feed',
				{ itemIndex: this.itemIndex },
			);
		}
		const parse = (raw: unknown, fieldName: string) =>
			parseJsonParameter(this.ctx.getNode(), this.itemIndex, raw, fieldName);
		const body = buildCreateFromLibraryBody(
			(field, fallback) => this.get(field, fallback),
			outputIds,
			(this.get('tagIds') as string[]) ?? [],
			parse,
		);

		const json = await feeds.createFromLibrary(body);
		return [{ json }];
	}
}
