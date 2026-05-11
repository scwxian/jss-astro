import { cartItemCalcEngineSchema } from "@cart/cart.model.ts";
import { deliveryMethodSchema } from "@shared/shared.model.ts";
import { addressSchema } from "@users/user.model.ts";
import { z } from "astro/zod";
import type {
	NonPriceAlteringChoice,
	PhysicalVariant,
	DigitalVariant,
	SubscriptionVariant,
	ProductData,
	BillingAlignment,
} from "@contentconfig";

export const locationEstimateSchema = addressSchema.pick({
	postalCode: true,
	city: true,
	state: true,
	country: true,
});

export const quotePayloadSchema = z
	.object({
		items: z.array(cartItemCalcEngineSchema).min(1),
		promoCode: z.string().optional(),
		location: locationEstimateSchema.optional(),
		deliveryMethod: deliveryMethodSchema,
	})
	.superRefine((data, ctx) => {
		if (data.deliveryMethod === "ship" && !data.location) {
			ctx.addIssue({
				code: "custom",
				message: "Shipping address is required for delivery",
				path: ["location"],
			});
		}
	});

// --- Input Types ---
export type QuotePayload = z.infer<typeof quotePayloadSchema>;
export type LocationEstimate = z.infer<typeof locationEstimateSchema>;

// Aliases for the specific API functions to keep naming contextually accurate
export type TaxAddress = LocationEstimate;
export type ShippingAddress = LocationEstimate;
export type Product = ProductData;

export interface ResolvedPriceVariant {
	groupName: string;
	variant: PhysicalVariant | DigitalVariant | SubscriptionVariant;
}
export interface ResolvedNonPriceVariant {
	groupName: string;
	choice: NonPriceAlteringChoice;
}

export interface ResolvedCartItem {
	masterSku: string;
	fullSku: string;
	slug: string;
	quantity: number;
	priceVariants: ResolvedPriceVariant[];
	nonPriceVariants: ResolvedNonPriceVariant[];
	productName: string;
	productType: "physical" | "digital" | "subscription";
	basePrice: number;
	variantPriceAdjustment: number;
	lineTotal: number;
	maxQuantity: number;
	inStock: boolean;
	availableQuantity?: number;
	heroImage?: string;
}

export interface SubscriptionMetadata {
	billingAlignment: BillingAlignment;
  hasDeliverySchedule: boolean;
	nextBillingDate?: string;
	nextDeliveryDate?: string;
  nextBillingTimestamp?: number;
  planName: string;
  interval: string;
  billingInterval: string;
}

export interface PromoDefinition {
	code: string;
	type: "fixed" | "percentage";
	value: number; // cents for fixed (e.g., 500 = $5.00), or percentage (e.g., 10 = 10%)
	minSubtotal?: number; // In cents
}

export interface TaxDefinition {
	name: string; // e.g., "Default Tax"
	rate: number; // Percentage (e.g., 8 for 8%)
	isShippingTaxable: boolean;
}

export interface CartState {
	items: ResolvedCartItem[];
  location?: LocationEstimate;
  totalWeightInGrams: number;
	shippingCost: number; // In cents
	shippingError?: string;
	promoDefinition?: PromoDefinition;
	promoDiscount: number;
	promoError?: string;
	taxDefinition?: TaxDefinition;
	taxError?: string;
	subtotal: number;
	discount: number;
	shipping: number;
	tax: number;
	grandTotal: number; // Floored to prevent negative
	errors: string[];
	isValid: boolean;
	subscriptionMetadata?: SubscriptionMetadata;
}

export type Modifier = (state: CartState) => CartState;

export interface ShippingResult {
	shippingCost: number;
	shippingError?: string;
}

export interface PromoResult {
	promoDefinition?: PromoDefinition;
	promoError?: string;
}

export interface TaxResult {
	taxDefinition?: TaxDefinition;
	taxError?: string;
}

export interface CartEngineConfig {
	enablePromos?: boolean;
	enableShipping?: boolean;
	enableTaxes?: boolean;
}

// CONSTANTS & FACTORIES
export const DEFAULT_ENGINE_CONFIG: CartEngineConfig = {
	enablePromos: false,
	enableShipping: true,
	enableTaxes: false,
};

export function createInitialCartState(): CartState {
	return {
		items: [],
    totalWeightInGrams: 0,
		shippingCost: 0,
		promoDiscount: 0,
		subtotal: 0,
		discount: 0,
		shipping: 0,
		tax: 0,
		grandTotal: 0,
		errors: [],
		isValid: true,
    location: undefined,
	};
}
