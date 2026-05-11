import { persistentMap } from "@nanostores/persistent";
import { logger } from "@log-alert/logger";
import { computed } from "nanostores";
import {
	type SubscriptionCartItem,
	type SubscriptionCartItemInput,
	subscriptionCartItemSchema,
} from "./cart.model.ts";
export { resolveSubscriptionSchedule } from "@payment-gateways/subscriptions/subscription-schedule.ts";
export { formatPrice } from "@scripts/utils.js";

const sessionStorageEngine = {
	getItem(key: string) { return window.sessionStorage.getItem(key); },
	setItem(key: string, val: string) { window.sessionStorage.setItem(key, val); },
	removeItem(key: string) { window.sessionStorage.removeItem(key); },
};

// --- CORE STORES ---
const SUBSCRIPTION_CART_VERSION = "v1";
const subscriptionCartOptions = {
	encode: JSON.stringify,
	decode: (value: string) => {
		try {
			const parsed = JSON.parse(value);
			const validation = subscriptionCartItemSchema.safeParse(parsed);
			if (validation.success) return validation.data;
			
			logger.error({ component: "SubscriptionCart" }, "Validation failed:", validation.error);
			return undefined;
		} catch {
			return undefined;
		}
	},
	listen: false,
	engine: sessionStorageEngine,
};

export const $subscriptionCart = persistentMap<Record<string, SubscriptionCartItem>>(
	`sub-cart:${SUBSCRIPTION_CART_VERSION}:`, 
	{}, 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
	subscriptionCartOptions as any
);

export const $subscriptionItems = computed($subscriptionCart, (cart) =>
	Object.values(cart)
);

export const $subscriptionSubtotal = computed($subscriptionCart, (cart) =>
	Object.values(cart).reduce((total, item) => total + item.displayPrice, 0)
);

// --- CART ACTIONS ---
export function addToSubscriptionCart(input: SubscriptionCartItemInput): void {
	$subscriptionCart.set({
		current: {
			...input,
      quantity: 1,
			key: "current",
		}
	});
}

export function clearSubscriptionCart(): void {
	const keepAwake = $subscriptionCart.listen(() => {});
	$subscriptionCart.set({});
	keepAwake();
}
