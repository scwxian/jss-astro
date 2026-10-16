// Live Stock — normalized result + provider contract.
// NOTE (future): to upgrade to per-variant stock, extend LiveStockResult with a
// variant map and add getVariantQuantityBySlug(); the factory keeps this contained.
export type LiveStockResult =
	| { status: "in_stock"; quantity: number }
	| { status: "out_of_stock" }
	| { status: "pre_order" }
	| { status: "unavailable" }
	| { status: "skipped" };

export interface LiveStockProvider {
	readonly name: string;
	// Returns available quantity for a product slug, or null when no row matches.
	// NOTE (future): add getVariantQuantityBySlug for per-variant granularity.
	getQuantityBySlug(slug: string): Promise<number | null>;
}
