import { cartItemCalcEngineSchema, } from "@cart/cart.model.ts";
import {
	deliveryMethodSchema,
	emailSchema,
	saveInfoSchema,
} from "@shared/shared.model.ts";
import { addressSchema } from "@users/user.model.ts";
import { z } from "astro/zod";

// --- Base Checkout ---
const baseCheckoutSchema = z.object({
	email: emailSchema,
	saveInfo: saveInfoSchema,
	sameAsShipping: z.boolean(),
	shipping: addressSchema,
	billing: addressSchema,
  cartItems: z
		.array(cartItemCalcEngineSchema)
		.min(1, { message: "Your cart is empty" })
		.max(20, { message: "Cart exceeds maximum unique items limit" }),
});

export const checkoutPayloadSchema = z.discriminatedUnion("checkoutType", [
	baseCheckoutSchema.extend({
		checkoutType: z.literal("one_time"),
		deliveryMethod: deliveryMethodSchema,
	}),
	baseCheckoutSchema.extend({
		checkoutType: z.literal("subscription"),
		deliveryMethod: z.literal("ship"),
	}),
]);

export type CheckoutPayload = z.infer<typeof checkoutPayloadSchema>;

export type LockStatus = "processing" | "completed";
export interface IdempotencyLock {
	status: LockStatus;
	transactionId?: string;
	checkoutUrl?: string;
	providerOrderId?: string;
	createdAt: number;
}

export type AcquireLockResult =
	| { status: "acquired"; lockKey: string }
	| { status: "processing" }
	| { status: "completed"; checkoutUrl: string; transactionId?: string };

export interface GatewayUrls {
	successUrl: string;
	failureUrl: string;
	cancelUrl: string;
	webhookUrl: string;
}
