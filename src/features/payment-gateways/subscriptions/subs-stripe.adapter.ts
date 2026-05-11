// Stripe Subscription Adapter
// Handles dynamic price_data generation and "Pay Now, Align Later" billing logic.
import {
	STRIPE_SECRET_KEY,
	STRIPE_WEBHOOK_SECRET,
} from "astro:env/server";
import { alertWithRateLimit } from "@log-alert/alert";
import { logger } from "@log-alert/logger";
import type { Address } from "@users/user.model.ts";
import type { NormalizedSubscriptionEvent } from "@payment-gateways/gateway.model.ts";
import type {
	CreateSessionResult,
	CreateSubscriptionSessionParams,
	SubscriptionGateway,
} from "./subs.factory.ts";
import type { SubscriptionInterval } from "@cart/cart.model.ts";
import { getAssetUrl } from "@scripts/asset-handling/r2-linking.js";
import { siteInfo } from "@shared/siteInfo.js";

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const STRIPE_API_VERSION = "2026-04-22.dahlia";
const DEFAULT_COUNTRY = "US";
const STRIPE_INTERVAL_CONFIG: Record<
	SubscriptionInterval,
	{ interval: "week" | "month" | "year"; intervalCount: number }
> = {
	BIWK: { interval: "month", intervalCount: 1 },
	BIMTH: { interval: "month", intervalCount: 2 },
	YR: { interval: "year", intervalCount: 1 },
	MTH: { interval: "month", intervalCount: 1 },
};

interface StripeCheckoutSession {
	id: string;
	url: string;
	status: string;
	payment_intent?: string;
	subscription?: string;
	customer?: string;
	metadata?: Record<string, string>;
}

interface StripeCustomer {
	id: string;
	email: string | null;
	name: string | null;
	phone: string | null;
}

interface StripeError {
	error: { message: string; type: string; code?: string; };
}

interface StripeWebhookRaw {
	type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
	data?: { object?: any; };
}

export class StripeSubscriptionAdapter implements SubscriptionGateway {
	constructor() {
		if (!STRIPE_SECRET_KEY) {
			throw new Error("STRIPE_SECRET_KEY is required in environment variables.");
		}
	}

	private getRequestHeaders(withContentType = false): Record<string, string> {
		const headers: Record<string, string> = {
			Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
			"Stripe-Version": STRIPE_API_VERSION,
		};
		if (withContentType) {
			headers["Content-Type"] = "application/x-www-form-urlencoded";
		}
		return headers;
	}

	private appendAddressBlock(params: URLSearchParams, prefix: string, address: Address): void {
		params.append(`${prefix}[line1]`, address.street1);
		if (address.street2) params.append(`${prefix}[line2]`, address.street2);
		params.append(`${prefix}[city]`, address.city);
		params.append(`${prefix}[postal_code]`, address.postalCode);
		params.append(`${prefix}[state]`, address.state);
		params.append(`${prefix}[country]`, address.country || DEFAULT_COUNTRY);
	}

	private appendAddressParams(params: URLSearchParams, shipping: Address, billing: Address): void {
		const name = `${shipping.firstName} ${shipping.lastName || ""}`.trim();
		params.append("name", name);
		params.append("phone", shipping.phone);
		this.appendAddressBlock(params, "address", billing);
		params.append("shipping[name]", name);
		params.append("shipping[phone]", shipping.phone);
		this.appendAddressBlock(params, "shipping[address]", shipping);
	}

	private appendLineItem(
		params: URLSearchParams,
		index: number,
		name: string,
		amount: number,
		recurring?: { interval: string; intervalCount: number },
		image?: string,
	): void {
		params.append(`line_items[${index}][price_data][currency]`, siteInfo.defaultCurrency.toLowerCase());
		params.append(`line_items[${index}][price_data][product_data][name]`, name);
		params.append(`line_items[${index}][price_data][unit_amount]`, amount.toString());
		params.append(`line_items[${index}][quantity]`, "1");

		if (image) { params.append(`line_items[${index}][price_data][product_data][images][0]`, image); }

		if (recurring) {
			params.append(`line_items[${index}][price_data][recurring][interval]`, recurring.interval);
			params.append(`line_items[${index}][price_data][recurring][interval_count]`, recurring.intervalCount.toString());
		}
	}

	private appendProductAndShipping(
		params: URLSearchParams,
		index: number,
		productName: string,
		productAmount: number,
		shippingAmount: number,
		shippingLabel: string,
		recurring?: { interval: string; intervalCount: number },
		image?: string,
	): number {
		this.appendLineItem(params, index++, productName, productAmount, recurring, image);
		if (shippingAmount > 0) {
			this.appendLineItem(params, index++, shippingLabel, shippingAmount, recurring);
		}
		return index;
	}

	private async findCustomerByEmail(email: string): Promise<string | null> {
		const searchParams = new URLSearchParams({ query: `email:'${email}'`, limit: "1" });
		const response = await fetch(`${STRIPE_API_BASE}/customers/search?${searchParams}`, {
			headers: this.getRequestHeaders(),
		});
		if (!response.ok) return null;
		const result = (await response.json()) as { data: StripeCustomer[] };
		return result.data.length > 0 ? result.data[0].id : null;
	}

	private async stripePost<T>(endpoint: string, body: URLSearchParams): Promise<T> {
		const response = await fetch(`${STRIPE_API_BASE}${endpoint}`, {
			method: "POST",
			headers: this.getRequestHeaders(true),
			body: body.toString(),
		});
		if (!response.ok) {
			const errorData = (await response.json()) as StripeError;
			throw new Error(errorData?.error?.message || `Stripe API error: ${response.status}`);
		}
		return response.json() as Promise<T>;
	}

	private async createCustomer(email: string, shipping: Address, billing: Address): Promise<string> {
		const params = new URLSearchParams();
		params.append("email", email);
		this.appendAddressParams(params, shipping, billing);
		const customer = await this.stripePost<StripeCustomer>("/customers", params);
		return customer.id;
	}

	private async updateCustomer(customerId: string, email: string, shipping: Address, billing: Address): Promise<void> {
		const params = new URLSearchParams();
		params.append("email", email);
		this.appendAddressParams(params, shipping, billing);
		await this.stripePost<StripeCustomer>(`/customers/${customerId}`, params);
	}

	private async getOrCreateCustomer(email: string, shipping: Address, billing: Address): Promise<string> {
		const existingId = await this.findCustomerByEmail(email);
		if (existingId) {
			await this.updateCustomer(existingId, email, shipping, billing);
			return existingId;
		}
		return this.createCustomer(email, shipping, billing);
	}

	async createSubscriptionSession(params: CreateSubscriptionSessionParams): Promise<CreateSessionResult> {
		const {
			payload,
			cartState,
			transactionId,
			orderId,
			successUrl,
			cancelUrl,
		} = params;

		const item = cartState.items[0];
		if (!item) throw new Error("Cart is empty");
		const productImage = item.heroImage
			? getAssetUrl("products", item.slug, item.heroImage)
			: undefined;

		// --- Parse Schedule for Billing Interval ---
    const billingAlignment = cartState.subscriptionMetadata?.billingAlignment;
		const scheduleVariant = item.nonPriceVariants.find((v) => v.groupName === "Schedule" || v.groupName === "Billing Interval");
		const scheduleSuffix = scheduleVariant?.choice.skuSuffix;
		const suffix = (scheduleSuffix || "MTH") as SubscriptionInterval;
		const { interval, intervalCount } = STRIPE_INTERVAL_CONFIG[suffix] ?? STRIPE_INTERVAL_CONFIG["MTH"];

		const productUnitAmount = item.lineTotal;
		const shippingUnitAmount = cartState.shipping;
		const customerId = await this.getOrCreateCustomer(payload.email, payload.shipping, payload.billing);

		// --- Build Base Params ---
		const stripeParams = new URLSearchParams();
		stripeParams.append("mode", "subscription");
		stripeParams.append("success_url", successUrl);
		stripeParams.append("cancel_url", cancelUrl);
		stripeParams.append("payment_method_types[0]", "card");
		stripeParams.append("customer", customerId);
		stripeParams.append("metadata[transactionId]", transactionId);
		stripeParams.append("metadata[orderId]", orderId);
		stripeParams.append("metadata[masterSku]", item.masterSku);
		stripeParams.append("metadata[productName]", item.productName);
		stripeParams.append("shipping_address_collection[allowed_countries][0]", payload.shipping.country || DEFAULT_COUNTRY);
    item.nonPriceVariants.forEach((v) => stripeParams.append(`metadata[${v.groupName}]`, v.choice.name));

		// --- Dynamic price_data Line Items ---
		let lineItemIndex = 0;
    const recurringConfig = { interval, intervalCount };
    if (billingAlignment === "anchored") {

			// ANCHORED ALIGNMENT
			const anchorTimestamp = cartState.subscriptionMetadata?.nextBillingTimestamp;
			if (!anchorTimestamp) throw new Error("Anchor timestamp required for anchored billing");
      if (cartState.subscriptionMetadata?.hasDeliverySchedule) {
				// PATH 1: Anchor + Delivery = True: Manual One-Time Charge + Trial End
				// One-time immediate charge (Product + Shipping)
				lineItemIndex = this.appendProductAndShipping(
          stripeParams,
          lineItemIndex,
          `${item.productName} (Initial Delivery)`,
          productUnitAmount,
          shippingUnitAmount,
          "Shipping (Initial Delivery)",
          undefined,
          productImage
        );

				// Future Recurring charge (Product + Shipping)
				this.appendProductAndShipping(
          stripeParams,
          lineItemIndex,
          item.productName,
          productUnitAmount,
          shippingUnitAmount,
          "Shipping",
          recurringConfig
        );
				
				// Delay the recurring items until the exact anchor date, prevents proration
				stripeParams.append("subscription_data[trial_end]", anchorTimestamp.toString());

			} else {
				// PATH 2: Anchor + Delivery = False: Native Stripe Proration + Billing Cycle Anchor
				this.appendProductAndShipping(
          stripeParams,
          lineItemIndex,
          item.productName,
          productUnitAmount,
          shippingUnitAmount,
          "Shipping",
          recurringConfig,
          productImage
        );

        stripeParams.append("subscription_data[proration_behavior]", "create_prorations");
				stripeParams.append("subscription_data[billing_cycle_anchor]", anchorTimestamp.toString());
			}
		} else {

			// PATH 3: ROLLING ALIGNMENT
			this.appendProductAndShipping(
        stripeParams,
        lineItemIndex,
        item.productName,
        productUnitAmount,
        shippingUnitAmount,
        "Shipping",
        recurringConfig,
        productImage
      );
		}

		// --- API Call ---
		const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
			method: "POST",
			headers: this.getRequestHeaders(true),
			body: stripeParams.toString(),
		});

		if (!response.ok) {
			const errorData = (await response.json()) as StripeError;
			const err = new Error(errorData?.error?.message || `Stripe API error: ${response.status}`);
			await alertWithRateLimit(
				{ component: "StripeAdapter", operation: "createSubscriptionSession", threshold: 3, windowMs: 10 * 60 * 1000, context: { transactionId } },
				"Stripe checkout session failed",
				err,
			);
			throw err;
		}
		const session = (await response.json()) as StripeCheckoutSession;
		return { checkoutUrl: session.url, providerOrderId: session.id };
	}

	async verifyWebhookSignature(rawBody: string, signature: string | null): Promise<boolean> {
		if (!STRIPE_WEBHOOK_SECRET) {
			logger.warn(
				{ component: "STRIPE" },
				"STRIPE_WEBHOOK_SECRET missing, cannot verify signature",
			);
			return false;
    }
		if (!signature) {
			logger.error({ component: "STRIPE" }, "Missing Stripe-Signature header");
			return false;
		}

		const parts = signature.split(",");
		let timestamp = "";
		let v1Signature = "";
		for (const part of parts) {
			const [key, value] = part.split("=");
			if (key === "t") timestamp = value;
			if (key === "v1") v1Signature = value;
		}
		if (!timestamp || !v1Signature) {
			logger.error({ component: "STRIPE" }, "Invalid Stripe-Signature format");
			return false;
		}

		const signedPayload = `${timestamp}.${rawBody}`;
		const encoder = new TextEncoder();
		const keyData = encoder.encode(STRIPE_WEBHOOK_SECRET);
		const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
		const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
		const hashArray = Array.from(new Uint8Array(signatureBuffer));
		const expectedSignature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
		return expectedSignature === v1Signature;
	}

	normalizeWebhookEvent(rawPayload: unknown): NormalizedSubscriptionEvent {
		const payload = rawPayload as StripeWebhookRaw;
		const eventType = payload.type || "";
		const obj = payload.data?.object || {};
		const metadata = obj.metadata || {};
		
		const result: Partial<NormalizedSubscriptionEvent> = { 
			eventType,
			providerOrderId: obj.id,
			metadata: metadata      
		};

		if (metadata.transactionId) result.transactionId = metadata.transactionId;
		if (metadata.orderId) result.orderId = metadata.orderId;
		
		const rawAmount = obj.amount_total ?? obj.amount_paid;
		if (typeof rawAmount === "number") result.amountPaid = rawAmount;
		if (obj.currency) result.currency = obj.currency.toUpperCase();

		result.customerEmail = obj.customer_email || obj.customer_details?.email || metadata.email;
		result.customerName = obj.customer_name || obj.customer_details?.name || metadata.customerName;
		
		const objectId = obj.id || "";
		if (obj.subscription) {
			result.providerSubscriptionId = typeof obj.subscription === "string" ? obj.subscription : obj.subscription.id;
		} else if (objectId.startsWith("sub_")) {
			result.providerSubscriptionId = objectId;
		}
		if (objectId.startsWith("cs_")) result.providerCheckoutId = objectId;
		if (objectId.startsWith("in_")) result.providerInvoiceId = objectId;

		if (obj.customer) {
			result.providerCustomerId = typeof obj.customer === "string" ? obj.customer : obj.customer.id;
		}
		
		if (obj.status) result.subscriptionStatus = obj.status;
		if (obj.current_period_end) result.nextBillingDate = obj.current_period_end;
		if (obj.canceled_at) result.canceledAt = obj.canceled_at;
		
		// Fallback for payment Status
		if (obj.payment_status) result.paymentStatus = obj.payment_status;
		else if (eventType === "invoice.paid") result.paymentStatus = "paid";
		else if (eventType === "invoice.payment_failed") result.paymentStatus = "failed";

		return result as NormalizedSubscriptionEvent; 
	}
}
