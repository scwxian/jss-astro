import type { CartState } from "../calc-engine.model.ts";

export function applyBasePrices(state: CartState): CartState {
	const newState: CartState = {
		...state,
		items: [...state.items],
		errors: [...state.errors],
	};

	let subtotal = 0;
	for (let i = 0; i < newState.items.length; i++) {
		const item = newState.items[i];
		const variantPriceAdjustment = item.priceVariants.reduce(
			(sum, rv) => sum + rv.variant.price,
			0,
		);

		const unitPrice = item.basePrice + variantPriceAdjustment;
		const lineTotal = unitPrice * item.quantity;
		newState.items[i] = {
			...item,
			variantPriceAdjustment,
			lineTotal,
		};
		subtotal += lineTotal;
	}

	newState.subtotal = subtotal;
	newState.grandTotal = Math.max(0, subtotal);
	newState.isValid = newState.errors.length === 0;
	return newState;
}
