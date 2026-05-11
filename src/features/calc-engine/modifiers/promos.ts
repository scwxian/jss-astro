/**
 * Promo Code Modifier
 *
 * Pure function that applies promo code logic to the cart state.
 * Runs AFTER base prices, so state.subtotal is accurate.
 */

import type { CartState } from "@calc-engine/calc-engine.model.ts";

export function applyPromos(state: CartState): CartState {
	const newState: CartState = {
		...state,
		errors: [...state.errors],
	};

	// Pass through any API-level errors
	if (state.promoError) {
		newState.errors.push(state.promoError);
		newState.isValid = false;
		return newState; // Stop processing promo if it was invalid
	}

	// do nothing if no valid promo
	if (!state.promoDefinition) {
		return newState;
	}

	const promo = state.promoDefinition;
	let calculatedDiscount = 0;

	if (promo.minSubtotal && state.subtotal < promo.minSubtotal) {
		newState.errors.push(
			`The code ${promo.code} requires a minimum order of $${(promo.minSubtotal / 100).toFixed(2)}.`,
		);
		newState.isValid = false;
		return newState;
	}

	// Calculate the math based on promo type
	if (promo.type === "fixed") {
		calculatedDiscount = promo.value;
	} else if (promo.type === "percentage") {
		calculatedDiscount = Math.floor(state.subtotal * (promo.value / 100));
	}

	const effectiveDiscount = Math.min(calculatedDiscount, state.subtotal);

	newState.promoDiscount = effectiveDiscount;
	newState.discount += effectiveDiscount;
	newState.grandTotal = Math.max(0, state.subtotal - newState.discount);

	return newState;
}
