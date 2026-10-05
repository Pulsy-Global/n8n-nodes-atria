import type { OperationConstructor } from './ioperation';
import type { AtriaResource } from '../constants/Atria.constants';
import type { FeedOperation } from '../resources/feed';
import type { LibraryOperation } from '../resources/library';
import type { OutputOperation } from '../resources/output';
import { FeedListOperation } from './feed/list.operation';
import { FeedGetOperation } from './feed/get.operation';
import { FeedUpdateOperation } from './feed/update.operation';
import { FeedDeleteOperation } from './feed/delete.operation';
import { FeedStartOperation } from './feed/start.operation';
import { FeedPauseOperation } from './feed/pause.operation';
import { FeedGetResultsOperation } from './feed/getResults.operation';
import { FeedTestOperation } from './feed/test.operation';
import { OutputListOperation } from './output/list.operation';
import { OutputGetOperation } from './output/get.operation';
import { OutputCreateOperation } from './output/create.operation';
import { OutputUpdateOperation } from './output/update.operation';
import { OutputDeleteOperation } from './output/delete.operation';
import { LibraryListOperation } from './library/list.operation';
import { LibraryGetOperation } from './library/get.operation';

/**
 * Operations per resource, tied to `RESOURCE_OPTIONS` by `Record<AtriaResource, …>`:
 * a resource added or renamed in the UI constants without a registry entry here
 * is a build error.
 */
interface ResourceOperations extends Record<AtriaResource, string> {
	feed: FeedOperation;
	library: LibraryOperation;
	output: OutputOperation;
}

/** Every `"<resource>:<operation>"` combination the node UI can produce. */
export type AtriaOperationKey = {
	[R in AtriaResource]: `${R}:${ResourceOperations[R]}`;
}[AtriaResource];

/**
 * Every executable operation of the Atria node. The keys are derived from the
 * same `RESOURCE_OPTIONS` and per-resource operation lists the UI dropdowns are
 * built from, so adding/renaming/removing an operation on either side — or a
 * typo in a registry key — breaks the build instead of failing at runtime.
 */
export const ATRIA_OPERATIONS: { [K in AtriaOperationKey]: OperationConstructor } = {
	'feed:list': FeedListOperation,
	'feed:get': FeedGetOperation,
	'feed:update': FeedUpdateOperation,
	'feed:delete': FeedDeleteOperation,
	'feed:start': FeedStartOperation,
	'feed:pause': FeedPauseOperation,
	'feed:getResults': FeedGetResultsOperation,
	'feed:test': FeedTestOperation,
	'output:list': OutputListOperation,
	'output:get': OutputGetOperation,
	'output:create': OutputCreateOperation,
	'output:update': OutputUpdateOperation,
	'output:delete': OutputDeleteOperation,
	'library:list': LibraryListOperation,
	'library:get': LibraryGetOperation,
};

/**
 * Registry lookup for `execute()`, which only holds the raw parameter strings.
 * With the typed registry above, the UI can no longer produce an unknown
 * combination, so a miss here means a manually corrupted parameter — surfaced
 * by the caller as the usual "not supported" NodeOperationError.
 */
export function resolveOperation(
	resource: string,
	operation: string,
): OperationConstructor | undefined {
	const key = `${resource}:${operation}` as AtriaOperationKey;
	return (ATRIA_OPERATIONS as Partial<Record<AtriaOperationKey, OperationConstructor>>)[key];
}
