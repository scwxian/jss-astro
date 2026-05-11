import { ACTIVE_ONETIME_GATEWAY } from "astro:env/server";
import type { CartState } from "@calc-engine/calc-engine.model.ts";
import type { CheckoutPayload } from "@checkout/checkout.model.ts";
import type { NormalizedOneTimeOrder } from "@payment-gateways/gateway.model.ts";
import { ChipInAdapter } from "./onetime-chipin.adapter.ts";

export interface CreateSessionParams {
	payload: CheckoutPayload;
	cartState: CartState;
	transactionId: string;
	orderId: string;
	successUrl: string;
	failureUrl: string;
	cancelUrl: string;
	webhookUrl: string;
}

export interface CreateSessionResult {
	checkoutUrl: string;
	providerOrderId: string;
}

export interface OneTimePaymentGateway {
	createPaymentSession(
		params: CreateSessionParams,
	): Promise<CreateSessionResult>;
	verifyWebhookSignature(
		rawBody: string,
		signature: string | null,
	): Promise<boolean>;
	normalizeWebhookPayload(rawPayload: unknown): NormalizedOneTimeOrder;
}

// No-op gateway: safe default when no provider configured
class NoOpOneTimeGateway implements OneTimePaymentGateway {
	async createPaymentSession(): Promise<CreateSessionResult> {
		throw new Error(
			"No one-time payment gateway configured. Set ACTIVE_ONETIME_GATEWAY env var (e.g., 'chip-in') or implement your own adapter.",
		);
	}
	async verifyWebhookSignature(): Promise<boolean> {
		throw new Error("No one-time payment gateway configured.");
	}
	normalizeWebhookPayload(): NormalizedOneTimeOrder {
		throw new Error("No one-time payment gateway configured.");
	}
}

export function getOneTimeGateway(): OneTimePaymentGateway {
	const provider = ACTIVE_ONETIME_GATEWAY || "";

	switch (provider) {
		// Keep chip-in as reference adapter example
		case "chip-in":
			return new ChipInAdapter();
		// Add your own adapter here:
		// case "stripe":
		// 	return new StripeOneTimeAdapter();
		case "":
		default:
			return new NoOpOneTimeGateway();
	}
}
