import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHttpRequestMethods,
	INodePropertyMode,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/**
 * Standard "By ID / From List" modes for entity-ID parameters, backed by a
 * `methods.listSearch` implementation on the node class.
 */
export function searchModes(method: string, placeholder = 'Search and select…'): INodePropertyMode[] {
	return [
		{
			displayName: 'By ID',
			name: 'string',
			type: 'string',
			placeholder: 'Paste the GUID',
		},
		{
			displayName: 'From List',
			name: 'listSearch',
			type: 'list',
			placeholder,
			typeOptions: { searchListMethod: method, searchable: true },
		},
	];
}


export interface AtriaCredentials {
	apiKey: string;
	baseUrl: string;
}

export interface AtriaRequestOptions {
	method: IHttpRequestMethods;
	endpoint: string;
	qs?: IDataObject;
	body?: IDataObject | object;
}

/** Fields of FeedDto we need to rebuild a valid UpdateFeedDto (PUT /feeds/{id}). */
export interface AtriaFeedLike extends IDataObject {
	id: string;
	name: string;
	version?: string;
	description?: string | null;
	networkId?: string;
	dataType?: string;
	startBlock?: string | null;
	endBlock?: string | null;
	errorHandling?: string;
	filterCode?: string | null;
	functionCode?: string | null;
	outputIds?: string[];
	tagIds?: string[];
	blockDelay?: number;
}

/**
 * Thin wrapper over the Atria Cloud REST API.
 * Auth: `X-API-KEY` header. Serializer: camelCase JSON, enums as string names.
 */
export async function atriaApiRequest<T = any>(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	options: AtriaRequestOptions,
): Promise<T> {
	const credentials = (await this.getCredentials('atriaApi')) as AtriaCredentials;

	const baseUrl = (credentials.baseUrl || '').replace(/\/+$/, '');
	if (!baseUrl) {
		throw new NodeOperationError(this.getNode?.() ?? ({} as any), 'Atria credential "Base URL" is empty');
	}

	const requestOptions = {
		method: options.method,
		url: `${baseUrl}${options.endpoint}`,
		headers: {
			'X-API-KEY': credentials.apiKey,
			Accept: 'application/json',
		},
		qs: options.qs,
		body: options.body,
		json: true,
		resolveBodyOnly: true,
	};

	return this.helpers.httpRequest(requestOptions);
}

/** Unwraps the Atria paged list envelope: { items: [], totalCount: N }. */
export function unwrapPaged(response: any): { items: any[]; totalCount: number } {
	if (response && Array.isArray(response.items)) {
		return { items: response.items, totalCount: Number(response.totalCount ?? response.items.length) };
	}
	// Defensive: some endpoints may return a bare array
	const items = Array.isArray(response) ? response : [response];
	return { items, totalCount: items.length };
}

/**
 * Fetches feeds/outputs/libraries honouring returnAll + limit via
 * skip/top paging on the OData query params.
 */
export async function atriaListAll(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	endpoint: string,
	limit: number,
	returnAll: boolean,
	qs: IDataObject = {},
): Promise<any[]> {
	const pageSize = returnAll ? 100 : Math.min(limit || 50, 100);
	const collected: any[] = [];
	let skip = 0;

	for (;;) {
		const response = await atriaApiRequest.call(this, {
			method: 'GET',
			endpoint,
			qs: { ...qs, skip, top: pageSize },
		});
		const { items, totalCount } = unwrapPaged(response);
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

/** Parses an optional JSON-string node parameter into an object, or throws. */
export function parseJsonParameter(
	node: any,
	itemIndex: number,
	raw: unknown,
	fieldName: string,
	fallback: IDataObject = {},
): IDataObject {
	if (raw === undefined || raw === null || raw === '') return fallback;
	if (typeof raw === 'object') return raw as IDataObject;
	try {
		return JSON.parse(String(raw));
	} catch {
		throw new NodeOperationError(
			node,
			`Parameter "${fieldName}" is not valid JSON: ${String(raw).slice(0, 120)}`,
			{ itemIndex },
		);
	}
}

/** Converts a fixedCollection of { header: [{ name, value }] } into a plain map. */
export function headersToMap(fixedCollection: unknown): IDataObject | undefined {
	const list = (fixedCollection as any)?.header;
	if (!Array.isArray(list) || list.length === 0) return undefined;
	const map: IDataObject = {};
	for (const entry of list) {
		if (entry?.name) map[entry.name] = entry.value ?? '';
	}
	return Object.keys(map).length ? map : undefined;
}

/**
 * Rebuilds a full UpdateFeedDto body from a fetched FeedDto, applying overrides.
 * FeedDto serializes startBlock/endBlock as strings; UpdateFeedDto expects numbers.
 */
export function feedToUpdateBody(feed: AtriaFeedLike, overrides: IDataObject = {}): IDataObject {
	const toBlockNumber = (value: unknown) => {
		if (value === undefined || value === null || value === '') return null;
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	};

	return {
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
		...overrides,
	};
}
