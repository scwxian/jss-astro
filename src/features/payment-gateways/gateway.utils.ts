import type { ResolvedCartItem } from "@calc-engine/calc-engine.model.ts";

// Formats product variants into a readable description string for payment gateways.
export function formatVariantDescription(item: ResolvedCartItem): string {
	const variants: string[] = [];

	if (item.priceVariants) {
		item.priceVariants.forEach((rv) => {
			variants.push(`${rv.groupName}: ${rv.variant.name}`);
		});
	}

	if (item.nonPriceVariants) {
		item.nonPriceVariants.forEach((rv) => {
			variants.push(`${rv.groupName}: ${rv.choice.name}`);
		});
	}

	return variants.join(", ");
}
