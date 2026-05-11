/**
 * Shipping Cost Modifier
 * Pure function that applies shipping logic to the cart state against subtotal (does not include promos)
 */

import type { CartState } from "@calc-engine/calc-engine.model.ts";

const FREE_SHIPPING_THRESHOLDS: Record<string, number> = {
	US: 5000, // e.g., free shipping on orders above $50
};

const SUBSCRIPTION_FREE_COUNTRIES = ["US"]; // e.g., free shipping for all subscriptions

export function applyShipping(state: CartState): CartState {
	const newState: CartState = {
		...state,
		errors: [...state.errors],
	};

	// Pass through any API-level errors (e.g., "Unserviceable address")
	if (state.shippingError) {
		newState.errors.push(state.shippingError);
		newState.isValid = false;
		return newState;
	}

	const country = state.location?.country?.toUpperCase() ?? "";
	const hasSubscription = state.items.some((i) => i.productType === "subscription");

	const subscriptionFree = hasSubscription && SUBSCRIPTION_FREE_COUNTRIES.includes(country);
	const threshold = FREE_SHIPPING_THRESHOLDS[country];
	const thresholdFree = threshold !== undefined && state.subtotal >= threshold;

	const calculatedShipping = subscriptionFree || thresholdFree ? 0 : state.shippingCost;

	newState.shipping = calculatedShipping;
	newState.grandTotal = Math.max(
		0,
		state.subtotal - state.discount + calculatedShipping,
	);

	return newState;
}
