import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

/** One executable operation of the Atria node, resolved from the operations registry. */
export interface IOperation {
	execute(): Promise<INodeExecutionData[]>;
}

/**
 * Base for operation classes: holds the execute context and the current item
 * index, so subclasses read parameters and build services the same way the
 * old per-resource switch did.
 */
export abstract class NodeOperation implements IOperation {
	constructor(
		protected readonly ctx: IExecuteFunctions,
		protected readonly itemIndex: number,
	) {}

	/**
	 * Reads a node parameter for this item. The `any` here is deliberate: it is the
	 * single choke-point where untyped UI parameters enter the typed stack.
	 * Everything downstream of `this.get(...) as SomeType` is checked.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	protected get(name: string, fallback?: any): any {
		return this.ctx.getNodeParameter(name, this.itemIndex, fallback);
	}

	abstract execute(): Promise<INodeExecutionData[]>;
}

/** Signature every operation class satisfies — used by the registry map. */
export type OperationConstructor = new (
	ctx: IExecuteFunctions,
	itemIndex: number,
) => IOperation;
