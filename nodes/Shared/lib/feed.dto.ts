import type { CreateFeedDto, FeedDto } from './dtos';

/**
 * Reads a create-feed parameter by DTO-shaped field name. `any` is deliberate:
 * this is the trigger's `getNodeParameter` boundary, the same choke-point the
 * action node's `NodeOperation.get()` documents.
 */
export type FeedParamGetter = (field: string, fallback?: any) => any;

/**
 * Builds a CreateFeedDto from node parameters. The Atria node's Feed › Create
 * operation and the Atria Trigger's "create new feed" mode share this builder —
 * each passes a getter for its own parameter names (plain vs `create`-prefixed).
 */
export function buildCreateFeedBody(
	get: FeedParamGetter,
	outputIds: string[],
	tagIds: string[] = [],
): CreateFeedDto {
	const startBlock = Number(get('startBlock', 0));
	const endBlock = Number(get('endBlock', 0));
	return {
		name: get('name', ''),
		version: get('version', '1.0') || '1.0',
		description: get('description', '') || undefined,
		networkId: get('networkId', ''),
		dataType: get('dataType', 'BlockWithLogs'),
		errorHandling: get('errorHandling', 'StopOnError'),
		startBlock: startBlock > 0 ? startBlock : null,
		endBlock: endBlock > 0 ? endBlock : null,
		filterCode: get('filterCode', '') || null,
		functionCode: get('functionCode', '') || null,
		outputIds,
		tagIds,
		blockDelay: Number(get('blockDelay', 0)) || 0,
	};
}

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
