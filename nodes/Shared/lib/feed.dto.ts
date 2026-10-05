import type { CreateFeedDto, FeedDto } from './dtos';

/**
 * Rebuilds a full CreateFeedDto (PUT body) from a fetched FeedDto, applying
 * overrides. FeedDto serializes startBlock/endBlock as strings; the write DTO
 * expects numbers. `Object.assign` matches the original trailing-spread
 * semantics while keeping required fields required in the return type.
 */
export function feedToUpdateBody(
	feed: FeedDto,
	overrides: Partial<CreateFeedDto> = {},
): CreateFeedDto {
	const toBlockNumber = (value: unknown): number | null => {
		if (value === undefined || value === null || value === '') return null;
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	};

	return Object.assign(
		{
			name: feed.name,
			version: feed.version ?? '1.0',
			description: feed.description ?? undefined,
			networkId: feed.networkId,
			dataType: feed.dataType ?? 'BlockWithLogs',
			startBlock: toBlockNumber(feed.startBlock),
			endBlock: toBlockNumber(feed.endBlock),
			errorHandling: feed.errorHandling ?? 'StopOnError',
			filterCode: feed.filterCode ?? null,
			functionCode: feed.functionCode ?? null,
			outputIds: feed.outputIds ?? [],
			tagIds: feed.tagIds ?? [],
			blockDelay: feed.blockDelay ?? 0,
		},
		overrides,
	);
}
