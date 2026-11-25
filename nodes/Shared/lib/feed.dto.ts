import type { CreateFeedDto, FeedDto } from './dtos';
import { CREATED_FEED_ERROR_HANDLING, CREATED_FEED_VERSION } from '../constants';

/**
 * Write body for the feed the Atria Trigger creates itself
 * (`POST /feeds` and the follow-up `PUT /feeds/{id}`).
 *
 * Only name, network, data type, filter code and start block are node
 * parameters — everything else is fixed here: no transform function, no end
 * block (live feed), no block delay, no tags, and errors do not stop the feed.
 */
export function buildTriggerCreateFeedBody(spec: {
	name: string;
	networkId: string;
	dataType: string;
	filterCode: string;
	startBlock: number | null;
	outputIds: string[];
	description?: string;
}): CreateFeedDto {
	return {
		name: spec.name,
		version: CREATED_FEED_VERSION,
		description: spec.description ?? undefined,
		networkId: spec.networkId,
		dataType: spec.dataType,
		errorHandling: CREATED_FEED_ERROR_HANDLING,
		// "Latest Block" (null) and 0 both mean "not set" for the write DTO
		startBlock: spec.startBlock && spec.startBlock > 0 ? spec.startBlock : null,
		endBlock: null,
		filterCode: spec.filterCode || null,
		functionCode: null,
		outputIds: spec.outputIds,
		tagIds: [],
		blockDelay: 0,
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
