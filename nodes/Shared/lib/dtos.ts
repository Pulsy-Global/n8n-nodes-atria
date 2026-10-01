import type { IDataObject } from 'n8n-workflow';

/**
 * Response DTOs for the Atria Cloud REST API, plus the write bodies the nodes
 * send. Declared as type aliases, not interfaces: aliases of object types get
 * an implicit index signature, so a DTO is directly assignable to
 * `IDataObject` (`{ json: feed }`) without casts.
 */

/** Envelope of every paged list endpoint. */
export type AtriaPage<T> = {
	items: T[];
	totalCount: number;
};

/** A feed as returned by the API (`GET/POST/PUT /feeds`). Block heights come back as strings. */
export type FeedDto = {
	id: string;
	name: string;
	status?: string;
	version?: string;
	description?: string | null;
	networkId?: string;
	dataType?: string;
	startBlock?: string | number | null;
	endBlock?: string | number | null;
	errorHandling?: string;
	filterCode?: string | null;
	functionCode?: string | null;
	outputIds?: string[];
	tagIds?: string[];
	blockDelay?: number;
};

/** Write body of `POST /feeds` and `PUT /feeds/{id}` (UpdateFeedDto is the same shape). */
export type CreateFeedDto = {
	name: string;
	version: string;
	networkId?: string;
	dataType: string;
	errorHandling: string;
	description?: string | null;
	startBlock: number | null;
	endBlock: number | null;
	filterCode: string | null;
	functionCode: string | null;
	outputIds: string[];
	tagIds: string[];
	blockDelay: number;
};

/** Delivery config of a webhook output. */
export type OutputConfigDto = {
	url?: string;
	method?: string;
	timeoutSeconds?: number;
	headers?: IDataObject;
};

/** An output as returned by the API (`GET/POST/PUT /outputs`). */
export type OutputDto = {
	id: string;
	name: string;
	description?: string | null;
	type?: string;
	config?: OutputConfigDto;
	tagIds?: string[];
};

/** Write body of `POST /outputs` and `PUT /outputs/{id}`. */
export type UpsertOutputDto = {
	name: string;
	description?: string | null;
	type: string;
	config: OutputConfigDto;
	tagIds?: string[];
};

/** A deployable feed template (`GET /libraries`). filterConfig/functionConfig keys are template-defined. */
export type LibraryDto = {
	id: string;
	name: string;
	description?: string | null;
	networkId?: string;
	dataType?: string;
	filterConfig?: IDataObject;
	functionConfig?: IDataObject;
};

/** A tag attached to feeds and outputs (`GET /tags`). */
export type TagDto = {
	id: string;
	name: string;
};

/** One network environment from `GET /config/networks`. */
export type NetworkEnvironmentDto = {
	id: string;
	title: string;
};

/** One network and its environments. */
export type NetworkDto = {
	title: string;
	environments?: NetworkEnvironmentDto[];
};

/** Response of `GET /config/networks`. */
export type NetworkConfigDto = {
	networks?: NetworkDto[];
};
