import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHttpRequestMethods,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

/** Anything that can execute an authenticated Atria API request. */
export type AtriaContext = IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions;

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

/**
 * Path-segment encoder for entity ids interpolated into endpoints. Ids can
 * arrive through the user-typed "By ID" parameter mode, so a value like
 * `../../admin` or one containing `/ ? #` must never reshape the request path.
 * Applied exactly once per segment at the call site — do not pre-encode ids.
 */
export const encodePath = (segment: string): string => encodeURIComponent(segment);

/**
 * Wraps a value as an OData filter string literal, escaping embedded single
 * quotes by doubling them (`'` → `''`). URL-encoding of the whole query is
 * left to the request library's `qs` serialization.
 */
export const odataLiteral = (value: string): string => `'${value.replace(/'/g, "''")}'`;

/**
 * Transport for the Atria Cloud REST API.
 * Auth: `X-API-KEY` header. Serializer: camelCase JSON, enums as string names.
 * Callers declare the response DTO — it documents the fields the code may
 * touch, though the wire payload itself is only trusted, not validated.
 */
export class AtriaApiClient {
	constructor(private readonly ctx: AtriaContext) {}

	async request<T>(options: AtriaRequestOptions): Promise<T> {
		const credentials = (await this.ctx.getCredentials('atriaApi')) as AtriaCredentials;

		const baseUrl = (credentials.baseUrl || '').replace(/\/+$/, '');
		if (!baseUrl) {
			throw new NodeOperationError(this.ctx.getNode(), 'Atria credential "Base URL" is empty');
		}

		// The option set is byte-identical to the original genericFunctions helper.
		// `resolveBodyOnly` is a request-promise flag forwarded through httpRequest; it is
		// not in IHttpRequestOptions, so the literal stays untyped (as before) to bypass
		// the excess-property check rather than silently dropping the flag.
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

		return this.ctx.helpers.httpRequest(requestOptions);
	}

	/**
	 * GET whose OData-`$filter` query degrades gracefully: when the deployment
	 * rejects the filtered request with a 4xx (older Atria releases do not
	 * support `$filter`), the same request is retried once with the legacy
	 * query. Deployment-compatibility fallback only — errors other than 4xx
	 * propagate untouched.
	 */
	async requestFiltered<T>(options: AtriaRequestOptions, fallbackQs: IDataObject): Promise<T> {
		try {
			return await this.request<T>(options);
		} catch (error) {
			const { httpStatusCode, statusCode, response } = (error ?? {}) as {
				httpStatusCode?: number;
				statusCode?: number;
				response?: { statusCode?: number };
			};
			const status = httpStatusCode ?? statusCode ?? response?.statusCode;
			if (status === undefined || status < 400 || status > 499) {
				throw new NodeApiError(this.ctx.getNode(), error as JsonObject);
			}
			return this.request<T>({ ...options, qs: fallbackQs });
		}
	}
}
