import type { INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { parseJsonParameter } from '../../../Shared/lib/parameters';
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
		const startBlock = Number(this.get('startBlock'));
		const endBlock = Number(this.get('endBlock'));
		const body: IDataObject = {
			feedLibraryId: this.get('feedLibraryId'),
			name: this.get('name') || this.get('feedLibraryId'),
			errorHandling: this.get('errorHandling'),
			filterConfig: parseJsonParameter(
				this.ctx.getNode(),
				this.itemIndex,
				this.get('filterConfig'),
				'filterConfig',
			),
			functionConfig: parseJsonParameter(
				this.ctx.getNode(),
				this.itemIndex,
				this.get('functionConfig'),
				'functionConfig',
			),
			outputIds,
			tagIds: (this.get('tagIds') as string[]) ?? [],
		};
		if (startBlock > 0) body.startBlock = startBlock;
		if (endBlock > 0) body.endBlock = endBlock;

		const json = await feeds.createFromLibrary(body);
		return [{ json }];
	}
}
