import type { IDataObject } from 'n8n-workflow';

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
