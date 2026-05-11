import { getEntry } from "astro:content";
import { logger } from "@log-alert/logger";
import { resolveBaseProducts } from "@calc-engine/api/base-product.ts";
import { resolvePromo } from "@calc-engine/api/promos.ts";
import { resolveShipping } from "@calc-engine/api/shipping.ts";
import { resolveTax } from "@calc-engine/api/taxes.ts";
import type {
	CartEngineConfig,
	CartState,
	Product,
	QuotePayload,
} from "@calc-engine/calc-engine.model.ts";
import {
	createInitialCartState,
	DEFAULT_ENGINE_CONFIG,
} from "@calc-engine/calc-engine.model.ts";
import { resolveSubscriptionSchedule } from "@payment-gateways/subscriptions/subscription-schedule.ts";
import type { PhysicalVariant, SubscriptionVariant } from "@contentconfig";
import type { SubscriptionInterval } from "@cart/cart.model";

export async function resolveCartData(
	input: QuotePayload,
	config: CartEngineConfig = DEFAULT_ENGINE_CONFIG,
): Promise<CartState> {
	const state = createInitialCartState();

	const productFetches = input.items.map(async (item) => {
		try {
			const product = await getEntry("products", item.slug);
			return { item, product };
		} catch (error) {
			logger.error(
				{ component: "ProductResolver" },
				`Failed to fetch product ${item.slug}:`
				,error,
			);
			return { item, product: null };
		}
	});

	const results = await Promise.all(productFetches);

	// Build products map from successfully fetched entries
	const productsMap = new Map<string, Product>();
	for (const { product } of results) {
		if (product) {
			productsMap.set(product.data.masterSku, product.data as Product);
		}
	}

	// Resolve and validate base products (fail-fast)
	const { items: resolvedItems, errors: baseErrors } = resolveBaseProducts(
		input.items,
		productsMap,
	);

	if (baseErrors.length > 0) {
		state.errors.push(...baseErrors);
		state.isValid = false;
		return state;
	}

	state.items = resolvedItems;
  state.location = input.location;

	// Calculate total weight from physical + subscription items
	const totalWeightInGrams = resolvedItems.reduce((sum, item) => {
		if (item.productType === "digital") return sum;
		const itemWeight = item.priceVariants.reduce((variantSum, rv) => {
      const weight = (rv.variant as PhysicalVariant | SubscriptionVariant).weightInGrams ?? 0;
			return variantSum + weight;
		}, 0);
		return sum + itemWeight * item.quantity;
	}, 0);

	state.totalWeightInGrams = totalWeightInGrams;

	// Populate subscriptionMetadata for subscription products
	const subItem = resolvedItems.find((item) => item.productType === "subscription");
	if (subItem) {
		const scheduleVariant = subItem.nonPriceVariants.find(
			(v) => v.groupName === "Schedule" || v.groupName === "Billing Interval",
		);
		const scheduleSuffix = scheduleVariant?.choice?.skuSuffix || "MTH";
		const product = productsMap.get(subItem.masterSku);
		const subProduct = product as Extract<Product, { type: "subscription" }>;
		const schedule = resolveSubscriptionSchedule(scheduleSuffix as SubscriptionInterval, {
			billingAlignment: subProduct.billingAlignment,
			hasDeliverySchedule: subProduct.hasDeliverySchedule,
		});
		const weightVariant = subItem.priceVariants.find((v) => v.groupName === "Weight")?.variant.name;
		const variantName = weightVariant ? weightVariant : "";
		const planName = variantName ? `${variantName} / ${schedule.perInterval}` : schedule.interval;

		state.subscriptionMetadata = {
			billingAlignment: subProduct.billingAlignment,
			hasDeliverySchedule: subProduct.hasDeliverySchedule,
			planName,
			interval: schedule.interval,
			billingInterval: schedule.billingInterval,
			nextBillingDate: schedule.nextBillingDate,
			nextBillingTimestamp: schedule.nextBillingTimestamp,
			...(schedule.nextDeliveryDate ? { nextDeliveryDate: schedule.nextDeliveryDate } : {}),
		};
	}

	// Only call promo/shipping/tax APIs after base validation passes
	const promoFetch =
		config.enablePromos && input.promoCode
			? resolvePromo(input.promoCode)
			: Promise.resolve(null);

	const shippingFetch =
		config.enableShipping &&
		input.location &&
		input.deliveryMethod === "ship"
			? resolveShipping(state)
			: Promise.resolve(null);

	const taxFetch =
		config.enableTaxes && input.location
			? resolveTax(input.location)
			: Promise.resolve(null);

	const [promoResult, shippingResult, taxResult] = await Promise.all([
		promoFetch,
		shippingFetch,
		taxFetch,
	]);

	if (promoResult) {
		state.promoDefinition = promoResult.promoDefinition;
		if (promoResult.promoError) state.promoError = promoResult.promoError;
	}

	if (shippingResult) {
		state.shippingCost = shippingResult.shippingCost;
		if (shippingResult.shippingError)
			state.shippingError = shippingResult.shippingError;
	}

	if (taxResult) {
		state.taxDefinition = taxResult.taxDefinition;
		if (taxResult.taxError) state.taxError = taxResult.taxError;
	}

	return state;
}
