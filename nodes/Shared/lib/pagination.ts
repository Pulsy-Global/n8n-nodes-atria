import type { IDataObject } from 'n8n-workflow';
import type { AtriaApiClient } from './api-client';
import type { AtriaPage } from './dtos';

/**
 * Unwraps the Atria paged list envelope: { items: [], totalCount: N }.
 * The only `as` cast for wire payloads in the stack — everything downstream
 * of a service method is typed.
 */
export function unwrapPaged<T>(response: unknown): AtriaPage<T> {
	const envelope = response as AtriaPage<T> | T[] | null | undefined;
	if (envelope && Array.isArray((envelope as AtriaPage<T>).items)) {
		const page = envelope as AtriaPage<T>;
		return { items: page.items, totalCount: Number(page.totalCount ?? page.items.length) };
	}
	// Defensive: some endpoints may return a bare array
	const items: T[] = Array.isArray(envelope) ? (envelope as T[]) : [envelope as unknown as T];
	return { items, totalCount: items.length };
}

/**
 * Fetches every page of a list endpoint honouring returnAll + limit via
 * skip/top paging on the OData query params.
 */
export async function listAll<T>(
	client: AtriaApiClient,
	endpoint: string,
	limit: number,
	returnAll: boolean,
	qs: IDataObject = {},
): Promise<T[]> {
	const pageSize = returnAll ? 100 : Math.min(limit || 50, 100);
	const collected: T[] = [];
	let skip = 0;

	for (;;) {
		const response = await client.request<unknown>({
			method: 'GET',
			endpoint,
			qs: { ...qs, skip, top: pageSize },
		});
		const { items, totalCount } = unwrapPaged<T>(response);
		collected.push(...items);

		skip += pageSize;
		if (returnAll) {
			if (items.length === 0 || collected.length >= totalCount) break;
		} else {
			if (collected.length >= limit || items.length === 0 || collected.length >= totalCount) break;
		}
	}

	return returnAll ? collected : collected.slice(0, limit);
}
