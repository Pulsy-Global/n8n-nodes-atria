import type { INodePropertyOptions } from 'n8n-workflow';
import { AtriaApiClient, type AtriaContext } from '../lib/api-client';
import type { NetworkConfigDto } from '../lib/dtos';
import { NETWORK_FALLBACKS } from '../constants';

/**
 * `GET /config/networks` — blockchain networks and their environments.
 * The endpoint requires a Bearer token on some deployments, so API-key users
 * fall back to the bundled list in `NETWORK_FALLBACKS` (those ids are still
 * valid for creating feeds). Labels carry the raw env id for both nodes.
 */
export class NetworkService {
	private readonly client: AtriaApiClient;

	constructor(ctx: AtriaContext) {
		this.client = new AtriaApiClient(ctx);
	}

	/** Flattens every network × environment pair into load options. */
	async getEnvironmentOptions(): Promise<INodePropertyOptions[]> {
		try {
			const response = await this.client.request<NetworkConfigDto>({
				method: 'GET',
				endpoint: '/config/networks',
			});
			const results: INodePropertyOptions[] = [];
			for (const network of response?.networks ?? []) {
				for (const env of network.environments ?? []) {
					results.push({
						name: `${network.title} — ${env.title} (${env.id})`,
						value: env.id,
					});
				}
			}
			if (results.length) return results;
		} catch {
			/* fall through to the bundled list */
		}

		return NETWORK_FALLBACKS.map((n) => ({ name: `${n.name} (${n.value})`, value: n.value }));
	}
}
