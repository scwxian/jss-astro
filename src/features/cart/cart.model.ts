import { z } from "astro/zod";

// --- Variants ---
export const baseVariantSelectionSchema = z.object({
	groupName: z.string().trim().min(1).max(50),
	skuSuffix: z
		.string()
		.trim()
		.regex(/^[a-zA-Z0-9-_]+$/, "Invalid suffix format")
		.max(50),
});

export const priceVariantSelectionSchema = baseVariantSelectionSchema.extend({
	variantName: z.string(),
	priceAdjustment: z.number(),
});

export const nonPriceVariantSelectionSchema = baseVariantSelectionSchema.extend(
	{ choiceName: z.string(), },
);

// --- Core Shared Fields ---
export const coreCartItemSchema = z.object({
	masterSku: z
		.string()
		.trim()
		.regex(/^[a-zA-Z0-9-_]+$/, "Invalid Master SKU")
		.max(50),
	fullSku: z
		.string()
		.trim()
		.regex(/^[a-zA-Z0-9-_]+$/, "Invalid Full SKU")
		.max(100),
	slug: z
		.string()
		.trim()
		.regex(/^[a-zA-Z0-9-_]+$/, "Invalid Slug")
		.max(100),
	quantity: z.number().int("Quantity must be a whole number").min(1).max(99),
});

const baseCartItemInputSchema = coreCartItemSchema.extend({
	name: z.string(),
	image: z.string(),
	displayPrice: z.number(),
	nonPriceVariants: z.array(nonPriceVariantSelectionSchema),
	priceVariants: z.array(priceVariantSelectionSchema),
});

export const cartItemCalcEngineSchema = coreCartItemSchema.extend({
  priceVariants: z.array(baseVariantSelectionSchema).max(5).default([]),
  nonPriceVariants: z.array(baseVariantSelectionSchema).max(5).default([]),
});

// --- One-Time Schemas ---
// For Nanostores Cart Object
export const cartItemInputSchema = baseCartItemInputSchema.extend({
	maxQuantity: z.number(),
});

export const cartItemSchema = cartItemInputSchema.extend({
	key: z.string(),
	variantDisplay: z.array(z.string()),
});

// --- Subscription Schemas ---
export const subscriptionIntervalSchema = z.enum([
	"BIWK",
	"MTH",
	"BIMTH",
	"YR",
]);

// For Store Action Input
export const subscriptionCartItemInputSchema = baseCartItemInputSchema
	.extend({
    quantity: z.literal(1).default(1),
		interval: z.string(),
    billingInterval: z.string(),
    planName: z.string(),
    nextDeliveryDate: z.string().optional(),
    nextBillingDate: z.string().optional(),
	});

// For Nanostores Cart Object
export const subscriptionCartItemSchema =
	subscriptionCartItemInputSchema.extend({ key: z.literal("current"), });

// --- Utilities ---
export const cartValidationItemSchema = cartItemSchema.pick({
	slug: true,
	name: true,
	key: true,
});

export const removedItemSchema = cartItemSchema.pick({
	name: true,
	slug: true,
});

// --- Exports ---
export type BaseVariantSelection = z.infer<typeof baseVariantSelectionSchema>;
export type PriceVariantSelection = z.infer<typeof priceVariantSelectionSchema>;
export type NonPriceVariantSelection = z.infer< typeof nonPriceVariantSelectionSchema >;
export type CartItemCalcEnginePayload = z.infer<typeof cartItemCalcEngineSchema>;
export type CartItemInput = z.infer<typeof cartItemInputSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type RemovedItem = z.infer<typeof removedItemSchema>;
export type SubscriptionInterval = z.infer<typeof subscriptionIntervalSchema>;
export type SubscriptionCartItem = z.infer<typeof subscriptionCartItemSchema>;
export type SubscriptionCartItemInput = z.infer<typeof subscriptionCartItemInputSchema>;
