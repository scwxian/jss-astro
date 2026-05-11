import type { CartState } from "../calc-engine.model.ts";
import type { SubscriptionInterval } from "@cart/cart.model.ts";

const SUBSCRIPTION_MULTIPLIER_CONFIG: Record<SubscriptionInterval, number> = {
	MTH: 1,
	BIWK: 2,
	BIMTH: 1,
	YR: 12,
};

const DEFAULT_MULTIPLIER = 1;

function getCartScheduleMultiplier(state: CartState): number {
	if (!state.subscriptionMetadata) return DEFAULT_MULTIPLIER;

	for (const item of state.items) {
		if (item.productType !== "subscription") continue;
		const schedule = item.nonPriceVariants.find(
			(v) => v.groupName === "Schedule" || v.groupName === "Billing Interval",
		);
		const suffix = schedule?.choice.skuSuffix as SubscriptionInterval | undefined;
		if (suffix && suffix in SUBSCRIPTION_MULTIPLIER_CONFIG) {
			return SUBSCRIPTION_MULTIPLIER_CONFIG[suffix];
		}
	}
	return DEFAULT_MULTIPLIER;
}

export function applySubscriptionMultiplier(state: CartState): CartState {
	if (!state.subscriptionMetadata) return state;

	const multiplier = getCartScheduleMultiplier(state);
	if (multiplier === DEFAULT_MULTIPLIER) return state;

	const newItems = state.items.map((item) => ({
		...item,
		lineTotal: item.lineTotal * multiplier,
	}));
	const subtotal = newItems.reduce((sum, i) => sum + i.lineTotal, 0);
	const shipping = state.shipping * multiplier;

	return {
		...state,
		items: newItems,
		subtotal,
		shipping,
		grandTotal: Math.max(0, subtotal - state.discount + shipping + state.tax),
	};
}
