// Payment Gateway Models: Standardized data structures for all payment gateway providers.
import { emailSchema } from "@features/shared/shared.model";
import { siteInfo } from "@shared/siteInfo.js";
import { z } from "astro/zod";

export type PaymentStatus = "success" | "failed" | "pending" | "cancelled";

// Base normalized schema shared across all payment types
const baseNormalizedSchema = z.object({
	mode: z.enum(["test", "live"]).optional(),
	providerOrderId: z.string(),
	transactionId: z.string().optional(),
  orderId: z.string().optional(),
	amountPaid: z.number().optional(),
	currency: z.string().default(siteInfo.defaultCurrency).optional(),
	customerEmail: emailSchema,
	customerName: z.string().optional(),
	paymentStatus: z.string().optional(),
	paymentMethod: z.string().optional(),
	paidAt: z.number().optional(),
	eventType: z.string(),
});
export type NormalizedOneTimeOrder = z.infer< typeof baseNormalizedSchema >;

// Normalized subscription event schema
export const normalizedSubscriptionEventSchema = baseNormalizedSchema.extend({
	providerSubscriptionId: z.string().optional(),
	providerCheckoutId: z.string().optional(),
	providerCustomerId: z.string().optional(),
	providerInvoiceId: z.string().optional(),
	subscriptionStatus: z.string().optional(),
	billingReason: z.string().optional(),
	planInterval: z.string().optional(),
	nextBillingDate: z.number().optional(),
  invoiceUrl: z.url().optional(),
	canceledAt: z.number().optional(),
	cancelAtPeriodEnd: z.boolean().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});
export type NormalizedSubscriptionEvent = z.infer< typeof normalizedSubscriptionEventSchema >;



