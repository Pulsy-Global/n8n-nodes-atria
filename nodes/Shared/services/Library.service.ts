import { AtriaApiClient, encodePath, type AtriaContext } from '../lib/api-client';
import { listAll, unwrapPaged } from '../lib/pagination';
import type { AtriaPage, LibraryDto } from '../lib/dtos';
import { PAGE_SIZE } from '../constants';

/** All `/libraries` endpoints — deployable feed templates. */
export class LibraryService {
	private readonly client: AtriaApiClient;

	constructor(ctx: AtriaContext) {
		this.client = new AtriaApiClient(ctx);
	}

	/** Paged list honouring returnAll/limit via skip/top OData params. */
	async list(limit: number, returnAll: boolean): Promise<LibraryDto[]> {
		return listAll<LibraryDto>(this.client, '/libraries', limit, returnAll);
	}

	async getById(libraryId: string): Promise<LibraryDto> {
		return this.client.request<LibraryDto>({ method: 'GET', endpoint: `/libraries/${encodePath(libraryId)}` });
	}

	/** One page of templates for `methods.listSearch`, with the total count. */
	async searchPage(skip = 0, top = PAGE_SIZE): Promise<AtriaPage<LibraryDto>> {
		const response = await this.client.request<unknown>({ method: 'GET', endpoint: '/libraries', qs: { skip, top } });
		return unwrapPaged<LibraryDto>(response);
	}
}
