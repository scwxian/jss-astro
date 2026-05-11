import { actions } from "astro:actions";
import { logger } from "@log-alert/logger";
import {
	getCheckoutFormData,
	getDeliveryMethod,
	getLocationEstimate,
	getPromoCode,
} from "./checkout.ui.js";

// PAYLOAD PREP & TRANSFORMATION
export function prepareCheckoutPayload(cartItems, checkoutType) {
	const baseFormData = getCheckoutFormData();
  return {
		...baseFormData,
		deliveryMethod: checkoutType === "subscription" ? "ship" : baseFormData.deliveryMethod,
		cartItems: cartItems, 
		checkoutType: checkoutType, 
	};
}

export function prepareQuotePayload(cartItems) {
	const deliveryMethod = getDeliveryMethod();
	const location = getLocationEstimate();
	const promoCode = getPromoCode();
	const payload = {
		items: cartItems,
		deliveryMethod,
	};

	if (deliveryMethod === "ship" && location) {
		payload.location = location;
	}
	if (promoCode) {
		payload.promoCode = promoCode;
	}
	return payload;
}

// CALL BACKEND CALC & CHECKOUT FUNC
export async function calculateFinalPrice(payload) {
	try {
		const result = await actions.calculateFinalPrice(payload);
		return result;
	} catch (err) {
		logger.error({ component: "CheckoutAction" }, "Failed to calculate final price:", err);
		return {
			data: null,
			error: { message: "Failed to calculate prices. Please try again." },
		};
	}
}

export async function processCheckout(payload) {
	try {
		const result = await actions.createCheckoutSession(payload);
		return result;
	} catch (err) {
		logger.error(
			{ component: "CheckoutAction" },
			"createCheckoutSession failed:",
			{ error: err.message, payload },
		);
		return {
			data: null,
			error: {
				code: "NETWORK_ERROR",
				message: "Failed to initiate payment. Please try again.",
			},
		};
	}
}
