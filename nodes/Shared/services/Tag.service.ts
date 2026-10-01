import { AtriaApiClient, type AtriaContext } from '../lib/api-client';
import { unwrapPaged } from '../lib/pagination';
import type { AtriaPage, TagDto } from '../lib/dtos';
import { PAGE_SIZE } from '../constants';

/** All `/tags` endpoints — tags attached to feeds and outputs. */
export class TagService {
	private readonly client: AtriaApiClient;

	constructor(ctx: AtriaContext) {
		this.client = new AtriaApiClient(ctx);
	}

	/** First `top` tags in a single request, for `loadOptions` loaders. */
	async listTop(top: number): Promise<AtriaPage<TagDto>> {
		const response = await this.client.request<unknown>({ method: 'GET', endpoint: '/tags', qs: { top } });
		return unwrapPaged<TagDto>(response);
	}

	/** One page of tags for `methods.listSearch`, with the total count. */
	async searchPage(skip = 0, top = PAGE_SIZE): Promise<AtriaPage<TagDto>> {
		const response = await this.client.request<unknown>({ method: 'GET', endpoint: '/tags', qs: { skip, top } });
		return unwrapPaged<TagDto>(response);
	}
}
