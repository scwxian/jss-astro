import { ACTIVE_SUBSCRIPTION_GATEWAY } from "astro:env/server";
import type { CartState } from "@calc-engine/calc-engine.model.ts";
import type { CheckoutPayload } from "@checkout/checkout.model.ts";
import type { NormalizedSubscriptionEvent } from "@payment-gateways/gateway.model.ts";
import { StripeSubscriptionAdapter } from "./subs-stripe.adapter.ts";

export interface CreateSubscriptionSessionParams {
	payload: CheckoutPayload;
	cartState: CartState;
	transactionId: string;
  orderId: string;
	successUrl: string;
	cancelUrl: string;
	webhookUrl: string;
}

export interface CreateSessionResult {
	checkoutUrl: string;
	providerOrderId: string;
}

export interface SubscriptionGateway {
	createSubscriptionSession(
		params: CreateSubscriptionSessionParams,
	): Promise<CreateSessionResult>;
	verifyWebhookSignature(
		rawBody: string,
		signature: string | null,
	): Promise<boolean>;
	normalizeWebhookEvent(rawPayload: unknown): NormalizedSubscriptionEvent;
}

export function getSubscriptionGateway(): SubscriptionGateway {
	const provider = ACTIVE_SUBSCRIPTION_GATEWAY || "stripe";

	switch (provider) {
		case "stripe":
			return new StripeSubscriptionAdapter();
		default:
			throw new Error(`Unsupported subscription payment gateway: ${provider}`);
	}
}
