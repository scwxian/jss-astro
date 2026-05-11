/**
 * Tax Calculation Modifier
 *
 * Pure function that calculates and applies taxes to the cart state.
 * Runs LAST in the pipeline, after all discounts and shipping are finalized.
 */

import type { CartState } from "@calc-engine/calc-engine.model.ts";

export function applyTaxes(state: CartState): CartState {
	const newState: CartState = {
		...state,
		errors: [...state.errors],
	};

	// Pass through any API-level errors
	if (state.taxError) {
		newState.errors.push(state.taxError);
		newState.isValid = false;
		return newState;
	}

	// If no tax definition exists, default to 0 tax and finish calculation
	if (!state.taxDefinition) {
		newState.tax = 0;
		newState.grandTotal = Math.max(
			0,
			state.subtotal - state.discount + state.shipping,
		);
		return newState;
	}

	// Standard practice: Tax applies to the subtotal AFTER discounts.
	const taxRule = state.taxDefinition;
	let taxableAmount = state.subtotal - state.discount;

	// Some jurisdictions require you to tax the shipping fee as well
	if (taxRule.isShippingTaxable) {
		taxableAmount += state.shipping;
	}

	taxableAmount = Math.max(0, taxableAmount);

	const calculatedTax = Math.floor(taxableAmount * (taxRule.rate / 100));

	newState.tax = calculatedTax;

	newState.grandTotal = Math.max(
		0,
		state.subtotal - state.discount + state.shipping + calculatedTax,
	);

	return newState;
}
