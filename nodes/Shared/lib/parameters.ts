import type { IDataObject, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/** Parses an optional JSON-string node parameter into an object, or throws. */
export function parseJsonParameter(
	node: INode,
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
	const list = (fixedCollection as { header?: unknown } | null | undefined)?.header;
	if (!Array.isArray(list) || list.length === 0) return undefined;
	const map: IDataObject = {};
	for (const entry of list as Array<{ name?: string; value?: string }>) {
		if (entry?.name) map[entry.name] = entry.value ?? '';
	}
	return Object.keys(map).length ? map : undefined;
}
