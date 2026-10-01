import { AtriaApiClient, encodePath, odataLiteral, type AtriaContext } from '../lib/api-client';
import { listAll, unwrapPaged } from '../lib/pagination';
import type { AtriaPage, OutputDto, UpsertOutputDto } from '../lib/dtos';
import { DEFAULT_TIMEOUT_SECONDS, OUTPUT_SEARCH_TOP, PAGE_SIZE } from '../constants';

/**
 * All `/outputs` endpoints — used by the Atria node's Output resource and by
 * the Atria Trigger's webhook-output registration lifecycle.
 */
export class OutputService {
	private readonly client: AtriaApiClient;

	constructor(ctx: AtriaContext) {
		this.client = new AtriaApiClient(ctx);
	}

	/** Paged list honouring returnAll/limit via skip/top OData params. */
	async list(limit: number, returnAll: boolean): Promise<OutputDto[]> {
		return listAll<OutputDto>(this.client, '/outputs', limit, returnAll);
	}

	/** First `top` outputs in a single request, for `loadOptions` loaders. */
	async listTop(top: number): Promise<AtriaPage<OutputDto>> {
		const response = await this.client.request<unknown>({ method: 'GET', endpoint: '/outputs', qs: { top } });
		return unwrapPaged<OutputDto>(response);
	}

	/** One page of outputs for `methods.listSearch`, with the total count. */
	async searchPage(skip = 0, top = PAGE_SIZE): Promise<AtriaPage<OutputDto>> {
		const response = await this.client.request<unknown>({ method: 'GET', endpoint: '/outputs', qs: { skip, top } });
		return unwrapPaged<OutputDto>(response);
	}

	async getById(outputId: string): Promise<OutputDto> {
		return this.client.request<OutputDto>({ method: 'GET', endpoint: `/outputs/${encodePath(outputId)}` });
	}

	async create(body: UpsertOutputDto): Promise<OutputDto> {
		return this.client.request<OutputDto>({ method: 'POST', endpoint: '/outputs', body });
	}

	async update(outputId: string, body: UpsertOutputDto): Promise<OutputDto> {
		return this.client.request<OutputDto>({ method: 'PUT', endpoint: `/outputs/${encodePath(outputId)}`, body });
	}

	async delete(outputId: string): Promise<void> {
		await this.client.request<void>({ method: 'DELETE', endpoint: `/outputs/${encodePath(outputId)}` });
	}

	/** Finds an output by exact name, so a retried registration never duplicates it. */
	async findByName(name: string): Promise<OutputDto | undefined> {
		// Server-side case-insensitive $filter so an account with more than
		// OUTPUT_SEARCH_TOP outputs cannot hide the match; deployments that reject
		// $filter fall back to the old search/top query (see requestFiltered).
		// Exact match is still verified client-side because the filter may hit rows
		// whose name differs in case only.
		const response = await this.client.requestFiltered<AtriaPage<OutputDto>>(
			{
				method: 'GET',
				endpoint: '/outputs',
				qs: { $filter: `tolower(name) eq tolower(${odataLiteral(name)})` },
			},
			{ search: name, top: OUTPUT_SEARCH_TOP },
		);
		return (response?.items ?? []).find((o) => o.name === name);
	}

	/** Creates the webhook output that delivers feed results to `url`; returns its id. */
	async createWebhookOutput(spec: {
		name: string;
		description: string;
		url: string;
	}): Promise<string> {
		const output = await this.create({
			name: spec.name,
			description: spec.description,
			type: 'Webhook',
			config: { url: spec.url, method: 'Post', timeoutSeconds: DEFAULT_TIMEOUT_SECONDS },
		});
		return output.id;
	}

	/** Replaces the delivery URL of an existing output, keeping the rest of its body. */
	async updateWebhookOutputUrl(outputId: string, existing: OutputDto, url: string): Promise<void> {
		await this.update(outputId, {
			name: existing.name,
			description: existing.description,
			type: 'Webhook',
			config: { ...existing.config, url },
			tagIds: existing.tagIds ?? [],
		});
	}
}
