/**
 * Shipping API Resolver
 * Config-driven flat rates based on country and weight.
 * Replace SHIPPING_TIERS with your own country/rate structure.
 * Future: integrate external shipping provider API.
 */

import type { CartState, ShippingResult } from "@calc-engine/calc-engine.model.ts";

// Example shipping tier config — customize for your target countries
const SHIPPING_TIERS: Record<string, {
	baseCost: number;
	baseWeight: number;
	extraCost: number;
	extraUnit: number | null;
}> = {
	US: { baseCost: 600, baseWeight: 3000, extraCost: 1000, extraUnit: null },
	CA: { baseCost: 3000, baseWeight: 1000, extraCost: 500, extraUnit: 1000 },
};

export async function resolveShipping(state: CartState): Promise<ShippingResult> {
	// Fast pass: zero weight means nothing to ship
	if (state.totalWeightInGrams === 0) return { shippingCost: 0 };

	const hasShippable = state.items.some((i) => i.productType !== "digital");
	if (!hasShippable) return { shippingCost: 0 };

	const country = state.location?.country?.toUpperCase() ?? "";
	const tier = country ? SHIPPING_TIERS[country] : undefined;
	if (!tier) return { shippingCost: 0, shippingError: "Delivery is not available to this address." };

	let cost = tier.baseCost;
	if (state.totalWeightInGrams > tier.baseWeight) {
		cost += tier.extraUnit === null
			? tier.extraCost
			: Math.ceil((state.totalWeightInGrams - tier.baseWeight) / tier.extraUnit) * tier.extraCost;
	}

	return { shippingCost: cost };
}
