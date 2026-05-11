class VariantSelector extends HTMLElement {
	connectedCallback() {
		this.masterSku = this.dataset.masterSku || "";
		this.basePrice = parseInt(this.dataset.basePrice || "0", 10);

		this.addEventListener("change", (e) => {
			const target = e.target;
			if (
				target.name?.startsWith("price_variant_group_") ||
				target.dataset.skuSuffix !== undefined
			) {
				this.calculateVariantState();
			}
		});

		this.calculateVariantState();
	}

	calculateVariantState() {
		const checkedPriceRadios = Array.from(
			this.querySelectorAll('input[name^="price_variant_group_"]:checked'),
		);
		let unitPrice = this.basePrice;
		const priceSkuSuffixes = [];
		const priceVariantsPayload = [];

		checkedPriceRadios.forEach((radio) => {
			const priceAdj = parseInt(radio.dataset.price || "0", 10);
			unitPrice += priceAdj;
			priceSkuSuffixes.push(radio.value);

			priceVariantsPayload.push({
				groupName: radio.closest("fieldset").dataset.groupName || "",
				variantName: radio.dataset.variantName || radio.value,
				skuSuffix: radio.value,
				priceAdjustment: priceAdj,
			});
		});

		const checkedNonPriceRadios = Array.from(
			this.querySelectorAll("input[data-sku-suffix]:checked"),
		);
		const nonPriceSkuSuffixes = [];
		const nonPriceVariantsPayload = [];
		const includeSkuGroups = this.dataset.includeSkuGroups?.split(",") || null;

		checkedNonPriceRadios.forEach((radio) => {
			const groupName = radio.closest("fieldset").dataset.groupName || "";
			const includeInSku =
				!includeSkuGroups || includeSkuGroups.includes(groupName);
			if (includeInSku) nonPriceSkuSuffixes.push(radio.dataset.skuSuffix);
			nonPriceVariantsPayload.push({
				groupName: groupName,
				choiceName: radio.value,
				skuSuffix: radio.dataset.skuSuffix || "",
			});
		});

		// Construct Final SKU
		const priceSuffix = `-${priceSkuSuffixes.join("-")}`;
		const nonPriceSuffix =
			nonPriceSkuSuffixes.length > 0 ? `-${nonPriceSkuSuffixes.join("")}` : "";
		const finalSku = `${this.masterSku}${priceSuffix}${nonPriceSuffix}`;

		this.dispatchEvent(
			new CustomEvent("variant-change", {
				detail: {
					unitPrice: unitPrice,
					finalSku: finalSku,
					priceVariants: priceVariantsPayload,
					nonPriceVariants: nonPriceVariantsPayload,
				},
				bubbles: true,
				composed: true,
			}),
		);
	}
}

if (!customElements.get("variant-selector")) {
	customElements.define("variant-selector", VariantSelector);
}

