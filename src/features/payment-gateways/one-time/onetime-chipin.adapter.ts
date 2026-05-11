import {
	CHIPIN_BRAND_ID,
	CHIPIN_SECRET_KEY,
	CHIPIN_WEBHOOK_PUBLIC_KEY,
} from "astro:env/server";
import type { CartState } from "@calc-engine/calc-engine.model.ts";
import { alert, alertWithRateLimit } from "@log-alert/alert";
import { logger } from "@log-alert/logger";
import { z } from "astro/zod";
import type { NormalizedOneTimeOrder } from "@payment-gateways/gateway.model.ts";
import type {
	CreateSessionParams,
	CreateSessionResult,
	OneTimePaymentGateway,
} from "./onetime.factory.ts";
import { formatVariantDescription } from "@payment-gateways/gateway.utils.ts";
import { siteInfo } from "@shared/siteInfo.js";

const CHIPIN_API_BASE = "https://gate.chip-in.asia/api/v1";

// CHIP-IN API REQUEST TYPES
interface ChipInClient {
	email: string;
	full_name?: string;
	phone?: string;
	street_address?: string;
	country?: string;
	city?: string;
	zip_code?: string;
	state?: string;
	shipping_street_address?: string;
	shipping_country?: string;
	shipping_city?: string;
	shipping_zip_code?: string;
	shipping_state?: string;
}

interface ChipInProduct {
	name: string;
	price: number; // In cents
	quantity: number;
	description?: string;
	product_id?: string;
	sku?: string;
}

interface ChipInPurchase {
	products: ChipInProduct[];
	currency?: string;
	total_override?: number; // Not visual only, real override
	total_discount_override?: number; // Visual only
}

interface CreatePurchaseBody {
	client: ChipInClient;
	purchase: ChipInPurchase;
	brand_id: string;
	reference: string;
	success_redirect: string;
	failure_redirect: string;
	cancel_redirect: string;
	success_callback: string;
	send_receipt?: boolean;
}

// CHIP-IN API RESPONSE TYPES
interface ChipInPurchaseResponse {
	id: string;
	checkout_url: string;
	status: string;
	client: { email: string; full_name?: string };
	purchase: {
		total: number;
		currency: string;
		products: ChipInProduct[];
	};
}

const chipInWebhookPayloadSchema = z.looseObject({
	event_type: z.string(),
	id: z.string(),
	type: z.string(),
	status: z.string(),
	created_on: z.coerce.number(),
	updated_on: z.coerce.number(),
	client: z.looseObject({
		email: z.email(),
		full_name: z.string().optional(),
		// Billing address fields
		street_address: z.string().optional(),
		country: z.string().optional(),
		city: z.string().optional(),
		zip_code: z.string().optional(),
		state: z.string().optional(),
		phone: z.string().optional(),
		// Shipping address fields
		shipping_street_address: z.string().optional(),
		shipping_country: z.string().optional(),
		shipping_city: z.string().optional(),
		shipping_zip_code: z.string().optional(),
		shipping_state: z.string().optional(),
	}),
	purchase: z.looseObject({
		total: z.coerce.number(),
		currency: z.string().optional(),
		products: z
			.array(
				z.looseObject({
					name: z.string(),
					price: z.coerce.number(), // req x >= 0
					quantity: z.coerce.number(),
				}),
			)
			.optional(),
	}),
	reference: z.string(),
	payment: z
		.looseObject({
			payment_method: z.string().optional(),
		})
		.optional(),
	transaction_data: z
		.looseObject({
			payment_method: z.string().optional(),
		})
		.optional(),
});

// CHIP-IN ADAPTER IMPLEMENTATION
export class ChipInAdapter implements OneTimePaymentGateway {
	private readonly secretKey: string;
	private readonly brandId: string;
	private readonly webhookPublicKey: string;

	constructor() {
		if (!CHIPIN_SECRET_KEY || !CHIPIN_BRAND_ID || !CHIPIN_WEBHOOK_PUBLIC_KEY) {
			const missing = [];
			if (!CHIPIN_SECRET_KEY) missing.push("CHIPIN_SECRET_KEY");
			if (!CHIPIN_BRAND_ID) missing.push("CHIPIN_BRAND_ID");
			if (!CHIPIN_WEBHOOK_PUBLIC_KEY) missing.push("CHIPIN_WEBHOOK_PUBLIC_KEY");
			throw new Error(
				`Missing required Chip-in env vars: ${missing.join(", ")}`,
			);
		}

		this.secretKey = CHIPIN_SECRET_KEY;
		this.brandId = CHIPIN_BRAND_ID;
		this.webhookPublicKey = CHIPIN_WEBHOOK_PUBLIC_KEY;
	}

	// Creates a payment session with Chip-in.
	async createPaymentSession(
		params: CreateSessionParams,
	): Promise<CreateSessionResult> {
		const {
			payload,
			cartState,
			transactionId,
			orderId,
			successUrl,
			failureUrl,
			cancelUrl,
			webhookUrl,
		} = params;

		// build payload
		const client = this.buildClient(payload);
		const products = this.buildProducts(cartState);
		const purchase: ChipInPurchase = {
			products,
			currency: siteInfo.defaultCurrency,
			total_override: cartState.grandTotal,
		};

		// Currently discounts are not handled in Chip-in, their team
		// recommends using total_discount_override as a visual discount and
    // real override with total_override. Or else, we need to split
		// disounts per line item, which would require helper func to do
		// if (cartState.discount > 0) {
		//   purchase.total_discount_override = cartState.discount;
		// }

		// build request body
		const body: CreatePurchaseBody = {
			client,
			purchase,
			brand_id: this.brandId,
			reference: orderId,
			send_receipt: true,
			success_redirect: successUrl,
			failure_redirect: failureUrl,
			cancel_redirect: cancelUrl,
			success_callback: webhookUrl,
		};

		// make API call
		const response = await fetch(`${CHIPIN_API_BASE}/purchases/`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.secretKey}`,
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorText = await response.text();
			const err = new Error(
				`Chip-in API error: ${response.status} - ${errorText}`,
			);
			await alertWithRateLimit(
				{
					component: "CHIPIN",
					operation: "createPaymentSession",
					threshold: 3,
					windowMs: 10 * 60 * 1000,
					context: { transactionId },
				},
				"Chipin checkout session creation failed - customers cannot complete one-time purchases",
				err,
			);
			throw err;
		}

		const data = (await response.json()) as ChipInPurchaseResponse;

		return {
			checkoutUrl: data.checkout_url,
			providerOrderId: data.id,
		};
	}

	// Verifies webhook signature using RSA-SHA256. Chip-in sends X-Signature header with base64-encoded signature.
	async verifyWebhookSignature(
		rawBody: string,
		signature: string | null,
	): Promise<boolean> {
		if (!signature) {
			logger.warn(
				{ component: "CHIPIN" },
				"Webhook signature: missing X-Signature header",
			);
			return false;
		}

		try {
			const publicKey = await crypto.subtle.importKey(
				"spki",
				this.pemToArrayBuffer(this.webhookPublicKey),
				{ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
				false,
				["verify"],
			);
			const signatureBuffer = this.base64ToArrayBuffer(signature);
			const dataBuffer = new TextEncoder().encode(rawBody);
			const isValid = await crypto.subtle.verify(
				"RSASSA-PKCS1-v1_5",
				publicKey,
				signatureBuffer,
				dataBuffer,
			);

			if (!isValid) {
				logger.warn(
					{ component: "CHIPIN" },
					"Webhook signature: verification failed",
					{
						keyLength: this.webhookPublicKey.length,
						signatureLength: signature.length,
						bodyLength: rawBody.length,
					},
				);
			}

			return isValid;
		} catch (error) {
			await alert(
				{ component: "CHIPIN", operation: "verifyWebhookSignature" },
				"Webhook signature verification failed",
				error instanceof Error ? error : new Error(String(error)),
			);
			return false;
		}
	}

	// normalizes Chip-in webhook payload to standard format.
	normalizeWebhookPayload(rawPayload: unknown): NormalizedOneTimeOrder {
		const payload = chipInWebhookPayloadSchema.parse(rawPayload);
		const statusMap: Record<
			string,
			"success" | "failed" | "pending" | "cancelled"
		> = {
			paid: "success",
			error: "failed",
			created: "pending",
			pending_execute: "pending",
			pending_capture: "pending",
			cancelled: "cancelled",
		};

		const client = payload.client;

		return {
			providerOrderId: payload.id,
			orderId: payload.reference,
			paymentStatus: statusMap[payload.status] || "pending",
			amountPaid: payload.purchase.total,
			currency: payload.purchase.currency || siteInfo.defaultCurrency,
			customerEmail: client.email,
			customerName: client.full_name || "",
			paidAt: payload.updated_on, // unix seconds, not ms
			paymentMethod:
				payload.transaction_data?.payment_method ||
				payload.payment?.payment_method,
			eventType: payload.event_type,
		};
	}

	// HELPER FUNCS
	// Builds client object from checkout payload.
	private buildClient(payload: CreateSessionParams["payload"]): ChipInClient {
		const client: ChipInClient = {
			email: payload.email,
			full_name:
				`${payload.shipping.firstName} ${payload.shipping.lastName || ""}`.trim(),
			phone: payload.shipping.phone,
		};

		Object.assign(
			client,
			this.mapAddressToChipIn(payload.shipping, "shipping_"),
			this.mapAddressToChipIn(payload.billing, ""),
		);

		return client;
	}

	// Format our Address model into Chip-in's required format. prefix "shipping_" shipping or "" for billing.
	private mapAddressToChipIn(
		address: NonNullable<CreateSessionParams["payload"]["shipping"]>,
		prefix: "shipping_" | "",
	) {
		return {
			[`${prefix}street_address`]:
				`${address.street1}${address.street2 ? ` ${address.street2}` : ""}`.trim(),
			[`${prefix}city`]: address.city,
			[`${prefix}zip_code`]: address.postalCode,
			[`${prefix}state`]: address.state,
			[`${prefix}country`]: address.country,
		};
	}

	// Builds products array from cart items.
	private buildProducts(cartState: CartState): ChipInProduct[] {
		const products: ChipInProduct[] = cartState.items.map((item) => {
			const variantDesc = formatVariantDescription(item);
			const description = variantDesc
				? `${item.productName} - ${variantDesc}`
				: `${item.productName} (${item.fullSku})`;

			return {
				name: item.productName,
				price: item.basePrice + item.variantPriceAdjustment,
				quantity: item.quantity,
				description: description,
				product_id: item.slug,
				sku: item.fullSku,
			};
		});

		// Add taxes and shipping as a additional line items, as chip-in total_override is visual only
		if (cartState.shipping > 0) {
			products.push({
				name: "Shipping",
				price: cartState.shipping,
				quantity: 1,
				description: "Standard Delivery",
			});
		}
		if (cartState.tax > 0) {
			products.push({
				name: cartState.taxDefinition?.name || "Tax",
				price: cartState.tax,
				quantity: 1,
				description: "Calculated Taxes",
			});
		}

		return products;
	}

	// Converts PEM string to ArrayBuffer.
	private pemToArrayBuffer(pem: string): ArrayBuffer {
		const pemContents = pem
			.replace(/-----BEGIN PUBLIC KEY-----/, "")
			.replace(/-----END PUBLIC KEY-----/, "")
			.replace(/\s/g, "");
		return this.base64ToArrayBuffer(pemContents);
	}

	// Converts base64 string to ArrayBuffer.
	private base64ToArrayBuffer(base64: string): ArrayBuffer {
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes.buffer;
	}
}
