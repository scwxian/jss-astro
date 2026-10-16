// Astro Actions Index
// Exports all Astro Actions available in the application.

import { validateCartProducts } from "@cart/validate-cart-products.ts";
import { calculateFinalPrice } from "@checkout/get-final-price.ts";
import { createCheckoutSession } from "@features/checkout/checkout.orchestrator";
import { getOrderStatus } from "@checkout/get-order-status.ts";
import { checkLiveStock } from "@live-stock/check-live-stock.ts";
import { getUser } from "@users/get-user.ts";

export const server = {
	getUser,
	validateCartProducts,
	calculateFinalPrice,
  createCheckoutSession,
	getOrderStatus,
	checkLiveStock,
};
