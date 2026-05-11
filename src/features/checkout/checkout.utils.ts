import type { CartState } from "@calc-engine/calc-engine.model.ts";
import type { GatewayUrls } from "./checkout.model";

// UUIDv4 as Primary Key
export function generateTransactionId(): string {
	return crypto.randomUUID();
}

// Order IDs
const RANDOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateOrderId(): string {
	const datePart = generateDatePart();
	const randomPart = generateRandomSuffix(4);
	return `${datePart}_${randomPart}`;
}

function generateDatePart(): string {
	const now = new Date();
	const year = now.getFullYear().toString().slice(-2);
	const month = (now.getMonth() + 1).toString().padStart(2, "0");
	const day = now.getDate().toString().padStart(2, "0");
	return `${year}${month}${day}`;
}

function generateRandomSuffix(length: number): string {
	const randomValues = new Uint8Array(length);
	crypto.getRandomValues(randomValues);

	let result = "";
	for (let i = 0; i < length; i++) {
		const index = randomValues[i] % RANDOM_CHARS.length;
		result += RANDOM_CHARS[index];
	}
	return result;
}

// Gateway urls
export const buildGatewayUrls = (
	origin: string,
	gatewaySlug: string,
	transactionId: string,
): GatewayUrls => {
	const baseUrl = origin.replace(/\/$/, "");

	return {
		successUrl: `${baseUrl}/checkout/success/?id=${transactionId}`,
		failureUrl: `${baseUrl}/checkout/failure/`,
		cancelUrl: `${baseUrl}/checkout/failure/?cancelled=true`,
		webhookUrl: `${baseUrl}/api/webhooks/${gatewaySlug}/`,
	};
};

// Subscription State Serializer
export interface SubscriptionStateInput {
	productName: string;
	planInterval: string;
	masterSku: string;
	fullSku: string;
	options?: Record<string, string>;
}

export function serializeSubscriptionState(
	input: SubscriptionStateInput,
): string {
	return JSON.stringify({
		type: "subscription",
		...input,
	});
}
