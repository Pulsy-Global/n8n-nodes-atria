import type { IDataObject } from 'n8n-workflow';
import { AtriaApiClient, encodePath, odataLiteral, type AtriaContext } from '../lib/api-client';
import { listAll, unwrapPaged } from '../lib/pagination';
import { feedToUpdateBody } from '../lib/feed.dto';
import type { AtriaPage, CreateFeedDto, FeedDto } from '../lib/dtos';
import { FEED_LOOKUP_TOP, PAGE_SIZE } from '../constants';

/**
 * All `/feeds` endpoints — used by the Atria node's Feed resource and by the
 * Atria Trigger's registration lifecycle.
 */
export class FeedService {
	private readonly client: AtriaApiClient;

	constructor(ctx: AtriaContext) {
		this.client = new AtriaApiClient(ctx);
	}

	/** Paged list honouring returnAll/limit via skip/top OData params. */
	async list(qs: IDataObject, limit: number, returnAll: boolean): Promise<FeedDto[]> {
		return listAll<FeedDto>(this.client, '/feeds', limit, returnAll, qs);
	}

	/** One page of feeds for `methods.listSearch`, with the total count. */
	async searchPage(skip = 0, top = PAGE_SIZE, filter?: string): Promise<AtriaPage<FeedDto>> {
		const qs: IDataObject = { skip, top };
		if (filter) qs.search = filter;
		const response = await this.client.request<unknown>({ method: 'GET', endpoint: '/feeds', qs });
		return unwrapPaged<FeedDto>(response);
	}

	async getById(feedId: string): Promise<FeedDto> {
		return this.client.request<FeedDto>({ method: 'GET', endpoint: `/feeds/${encodePath(feedId)}` });
	}

	async update(feedId: string, body: CreateFeedDto): Promise<FeedDto> {
		return this.client.request<FeedDto>({ method: 'PUT', endpoint: `/feeds/${encodePath(feedId)}`, body });
	}

	/** Rebuilds a full update body from a fetched feed and applies overrides. */
	async updateFromDto(feed: FeedDto, overrides: Partial<CreateFeedDto> = {}): Promise<FeedDto> {
		return this.update(feed.id, feedToUpdateBody(feed, overrides));
	}

	async delete(feedId: string): Promise<void> {
		await this.client.request<void>({ method: 'DELETE', endpoint: `/feeds/${encodePath(feedId)}` });
	}

	async start(feedId: string, resetCursor = false): Promise<FeedDto | null> {
		return this.client.request<FeedDto | null>({
			method: 'POST',
			endpoint: `/feeds/${encodePath(feedId)}/start`,
			qs: { resetCursor },
		});
	}

	async pause(feedId: string): Promise<FeedDto | null> {
		return this.client.request<FeedDto | null>({ method: 'POST', endpoint: `/feeds/${encodePath(feedId)}/pause` });
	}

	/** Recent delivery results of a feed, normalised to an array. */
	async getResults(feedId: string, limit: number): Promise<IDataObject[]> {
		const results = await this.client.request<IDataObject | IDataObject[]>({
			method: 'GET',
			endpoint: `/feeds/${encodePath(feedId)}/results`,
			qs: { limit },
		});
		return Array.isArray(results) ? results : [results];
	}

	async test(body: IDataObject): Promise<IDataObject | null> {
		return this.client.request<IDataObject | null>({ method: 'POST', endpoint: '/feeds/test', body });
	}

	/** Finds the first feed whose `outputIds` include `outputId`. */
	async findAttachedToOutput(outputId: string, top = FEED_LOOKUP_TOP): Promise<FeedDto | undefined> {
		// Server-side $filter so a larger account cannot hide the match beyond the
		// first `top` rows; deployments that reject $filter fall back to the old
		// top-N scan (see AtriaApiClient.requestFiltered). Exact match checked below.
		const response = await this.client.requestFiltered<AtriaPage<FeedDto>>(
			{
				method: 'GET',
				endpoint: '/feeds',
				qs: { $filter: `outputIds/any(o:o eq ${odataLiteral(outputId)})` },
			},
			{ top },
		);
		return (response?.items ?? []).find((f) => (f.outputIds ?? []).includes(outputId));
	}
}
