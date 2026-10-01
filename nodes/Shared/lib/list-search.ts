import type { ILoadOptionsFunctions, INodeListSearchItems, INodeListSearchResult } from 'n8n-workflow';
import { PAGE_SIZE } from '../constants';
import type { AtriaPage } from './dtos';

/** Fetches one page of candidates for `methods.listSearch`. */
export type ListSearchPageFetcher<T> = (
	ctx: ILoadOptionsFunctions,
	skip: number,
	top: number,
	filter?: string,
) => Promise<AtriaPage<T>>;

/**
 * Builds a `methods.listSearch` handler: skip/top paging driven by the
 * pagination token, plus the entity-specific item → result mapping. Replaces
 * the copy-pasted `skip = Number(paginationToken) || 0 … next < totalCount`
 * loop in every node's listSearch methods.
 */
export function makeListSearchHandler<T>(
	fetchPage: ListSearchPageFetcher<T>,
	mapItem: (item: T) => INodeListSearchItems,
): (
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
) => Promise<INodeListSearchResult> {
	return async function (
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		const skip = Number(paginationToken) || 0;
		const { items, totalCount } = await fetchPage(this, skip, PAGE_SIZE, filter);
		const next = skip + items.length;
		return {
			results: items.map(mapItem),
			paginationToken: next < totalCount ? String(next) : undefined,
		};
	};
}
