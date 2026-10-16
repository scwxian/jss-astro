import type { BaseVariantSelection, CartItemCalcEnginePayload } from "@cart/cart.model.ts";
import type {
	Product,
	ResolvedCartItem,
	ResolvedPriceVariant,
	ResolvedNonPriceVariant,
} from "@calc-engine/calc-engine.model.ts";
import type {
	PhysicalVariant,
} from "@contentconfig";

export interface BaseProductResult {
	items: ResolvedCartItem[];
	errors: string[];
}

export function resolveBaseProducts(
	items: CartItemCalcEnginePayload[],
	productsMap: Map<string, Product>,
): BaseProductResult {
	const resolvedItems: ResolvedCartItem[] = [];
	const errors: string[] = [];

	for (const item of items) {
		const product = productsMap.get(item.masterSku);
		if (!product) {
			errors.push(
				`Product "${item.slug}" not found. It may have been removed from our catalog.`,
			);
			continue;
		}

		if (product.masterSku !== item.masterSku) {
			errors.push(
				`Product verification failed for "${product.name}". Please refresh your cart and try again.`,
			);
			continue;
		}

		const itemErrors = validateItem(item, product);
		if (itemErrors.length > 0) {
			errors.push(...itemErrors);
			continue;
		}

		const { resolved: resolvedPriceVariants, errors: priceErrors } =
			resolvePriceVariants(item.priceVariants, product);
		if (priceErrors.length > 0) {
			errors.push(...priceErrors);
			continue;
		}

		const { resolved: resolvedNonPriceVariants, errors: optionErrors } =
			resolveNonPriceVariants(item.nonPriceVariants, product);
		if (optionErrors.length > 0) {
			errors.push(...optionErrors);
			continue;
		}

		const { inStock, availableQuantity } = resolveStock(
			resolvedPriceVariants,
			product,
		);

		if (!inStock) {
			errors.push(`${product.name} is currently unavailable.`);
			continue;
		}

		if (
			availableQuantity !== undefined &&
			item.quantity > availableQuantity
		) {
			errors.push(
				`Only ${availableQuantity} units of ${product.name} are available.`,
			);
			continue;
		}

		resolvedItems.push({
			masterSku: item.masterSku,
			fullSku: item.fullSku,
			slug: item.slug,
			quantity: item.quantity,
			priceVariants: resolvedPriceVariants,
			nonPriceVariants: resolvedNonPriceVariants,
			productName: product.name,
			productType: product.type,
			basePrice: product.basePrice,
			variantPriceAdjustment: 0,
			lineTotal: 0,
			maxQuantity: product.maxQuantity ?? 10,
			inStock,
			availableQuantity,
			heroImage: product.images?.[0],
		});
	}

	return {
		items: errors.length > 0 ? [] : resolvedItems,
		errors,
	};
}

// --- VALIDATION ---
function validateItem(item: CartItemCalcEnginePayload, product: Product): string[] {
	const errors: string[] = [];
	if (product.status === "draft") {
		errors.push(`${product.name} is not available.`);
	}
	if (product.status === "out-of-stock") {
		errors.push(`${product.name} is out of stock.`);
	}

	const max = product.maxQuantity ?? 10;
	if (item.quantity < 1) {
		errors.push(`Quantity for ${product.name} must be at least 1.`);
	}
	if (item.quantity > max) {
		errors.push(
			`Only ${max} units of ${product.name} can be ordered at once.`,
		);
	}
	return errors;
}

// --- PRICE VARIANT RESOLUTION ---
function resolvePriceVariants(
	selections: CartItemCalcEnginePayload["priceVariants"],
	product: Product,
): { resolved: ResolvedPriceVariant[]; errors: string[] } {
	const resolved: ResolvedPriceVariant[] = [];
	const errors: string[] = [];
	const groups = product.priceVariantGroups ?? [];

	for (const group of groups) {
		const groupSelections = selections.filter(
			(s: BaseVariantSelection) => s.groupName === group.name,
		);
		if (groupSelections.length === 0) {
			errors.push(`Please select a ${group.name} for ${product.name}.`);
			continue;
		}
		if (groupSelections.length > 1) {
			errors.push(
				`Only one ${group.name} can be selected for ${product.name}.`,
			);
			continue;
		}

		const selection = groupSelections[0];
		const variant = group.variants.find(
			(v) => v.skuSuffix === selection.skuSuffix,
		);
		if (!variant) {
			errors.push(`Invalid ${group.name} selection for ${product.name}.`);
			continue;
		}
		resolved.push({ groupName: group.name, variant });
	}
	return { resolved, errors };
}

// --- NON-PRICE OPTION RESOLUTION ---
function resolveNonPriceVariants(
	selections: CartItemCalcEnginePayload["nonPriceVariants"],
	product: Product,
): { resolved: ResolvedNonPriceVariant[]; errors: string[] } {
	const resolved: ResolvedNonPriceVariant[] = [];
	const errors: string[] = [];
	const groups = product.options ?? [];

	for (const group of groups) {
		const groupSelections = selections.filter(
			(s: BaseVariantSelection) => s.groupName === group.name,
		);
		if (groupSelections.length === 0) {
			errors.push(`Please select a ${group.name} for ${product.name}.`);
			continue;
		}

		// Multi-select allows several picks at once
		if (group.multiSelect) {
			const required = group.pickCount;
			const max = required ?? group.choices.length;
			if (
				groupSelections.length > max ||
				(required !== undefined && groupSelections.length < required)
			) {
				errors.push(
					`Please select ${max} ${group.name} for ${product.name}.`,
				);
				continue;
			}
			if (
				new Set(groupSelections.map((s) => s.skuSuffix)).size !==
				groupSelections.length
			) {
				errors.push(
					`Please select ${max} different ${group.name} for ${product.name}.`,
				);
				continue;
			}
			for (const selection of groupSelections) {
				const choice = group.choices.find(
					(c) => c.skuSuffix === selection.skuSuffix,
				);
				if (!choice) {
					errors.push(`Invalid ${group.name} selection for ${product.name}.`);
					break;
				}
				resolved.push({ groupName: group.name, choice });
			}
			continue;
		}

		if (groupSelections.length > 1) {
			errors.push(
				`Only one ${group.name} can be selected for ${product.name}.`,
			);
			continue;
		}

		const selection = groupSelections[0];
		const choice = group.choices.find(
			(c) => c.skuSuffix === selection.skuSuffix,
		);
		if (!choice) {
			errors.push(`Invalid ${group.name} selection for ${product.name}.`);
			continue;
		}
		resolved.push({ groupName: group.name, choice });
	}
	return { resolved, errors };
}

// --- STOCK RESOLUTION ---
function resolveStock(
	resolvedVariants: ResolvedPriceVariant[],
	product: Product,
): { inStock: boolean; availableQuantity?: number } {
	if (product.status === "out-of-stock" || product.status === "draft") {
		return { inStock: false };
	}

	if (product.type === "physical") {
		const physicalProduct = product as Extract<Product, { type: "physical" }>;
		for (const rv of resolvedVariants) {
			const physicalVariant = rv.variant as PhysicalVariant;
			if (physicalVariant.inStock === false) {
				return { inStock: false };
			}
			if (
				physicalProduct.trackVariantInventory &&
				physicalVariant.quantity !== undefined
			) {
				return { inStock: true, availableQuantity: physicalVariant.quantity };
			}
		}
		if (
			!physicalProduct.trackVariantInventory &&
			physicalProduct.globalQuantity !== undefined
		) {
			return {
				inStock: true,
				availableQuantity: physicalProduct.globalQuantity,
			};
		}
	}

	return { inStock: true };
}
