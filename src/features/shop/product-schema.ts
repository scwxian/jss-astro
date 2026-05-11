import type { CollectionEntry } from "astro:content";
import { getAssetUrl } from "@scripts/asset-handling/r2-linking.js";
import { siteInfo } from "@shared/siteInfo.js";

const SCHEMA_BASE = "https://schema.org";

function toDecimal(cents: number): string {
	return (cents / 100).toFixed(2);
}

function formatCategoryLabel(slug: string): string {
	return slug
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

function resolveAvailability(
	data: CollectionEntry<"products">["data"]
): string {
	if (data.status === "out-of-stock") {
		return `${SCHEMA_BASE}/OutOfStock`;
	}
	if (data.status === "pre-order") {
		return `${SCHEMA_BASE}/PreOrder`;
	}
	if (data.status !== "active") {
		return `${SCHEMA_BASE}/OutOfStock`;
	}

	if (data.type === "physical" && data.trackVariantInventory) {
		const anyInStock = data.priceVariantGroups.some((group) =>
			group.variants.some((v) => v.inStock)
		);
		return anyInStock
			? `${SCHEMA_BASE}/InStock`
			: `${SCHEMA_BASE}/OutOfStock`;
	}

	return `${SCHEMA_BASE}/InStock`;
}

export function buildProductSchema(
	product: CollectionEntry<"products">,
	pageUrl: string
): Record<string, unknown> {
	const { data, id } = product;

	const images = data.images.map((img) =>
		getAssetUrl("products", id, img)
	);

	let lowPrice = data.basePrice;
	let highPrice = data.basePrice;
	let offerCount = 1;

	for (const group of data.priceVariantGroups) {
		offerCount *= group.variants.length;
		for (const variant of group.variants) {
			const finalPrice = data.basePrice + variant.price;
			if (finalPrice < lowPrice) lowPrice = finalPrice;
			if (finalPrice > highPrice) highPrice = finalPrice;
		}
	}

	const categoryLabel = formatCategoryLabel(data.category);
	const subCategoryLabel = data.subCategory
		? formatCategoryLabel(data.subCategory)
		: null;

	const availabilityUrl = resolveAvailability(data);

  const shippingDestinationsMap = siteInfo.shippingDestinations.map(country => ({
		"@type": "DefinedRegion",
		addressCountry: country
	}));

	return {
		"@type": "Product",
		name: data.name,
		description: data.shortDescription,
		image: images,
		sku: data.masterSku,
		url: pageUrl,
		brand: {
			"@type": "Brand",
			name: siteInfo.businessName,
		},
		category: subCategoryLabel
			? `${categoryLabel} > ${subCategoryLabel}`
			: categoryLabel,
		offers: {
			"@type": "AggregateOffer",
			priceCurrency: siteInfo.defaultCurrency,
			lowPrice: toDecimal(lowPrice),
			highPrice: toDecimal(highPrice),
			offerCount,
			availability: availabilityUrl,
			url: pageUrl,
			itemCondition: "https://schema.org/NewCondition",
			seller: {
				"@type": "Organization",
				name: siteInfo.businessName,
			},
      shippingDetails: {
				"@type": "OfferShippingDetails",
				shippingDestination: shippingDestinationsMap
			},
		},
	};
}
