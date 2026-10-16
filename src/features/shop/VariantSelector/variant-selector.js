import { formatPrice } from "@scripts/utils.js";

class VariantSelector extends HTMLElement {
	connectedCallback() {
		this.masterSku = this.dataset.masterSku || "";
		this.basePrice = parseInt(this.dataset.basePrice || "0", 10);

		this.addEventListener("change", (e) => {
			const target = e.target;
			const fieldset = target.closest("fieldset");
			const pickCount = parseInt(fieldset?.dataset.pickCount || "0", 10);
			if (target.type === "checkbox" && pickCount > 0) {
				const checked = fieldset.querySelectorAll('input[type="checkbox"]:checked');
				if (target.checked && checked.length > pickCount) target.checked = false;
				this.setMultiSelectState(fieldset, pickCount);
			}
			if (
				target.name?.startsWith("price_variant_group_") ||
				target.dataset.skuSuffix !== undefined
			) {
				this.calculateVariantState();
				this.updateVariantInfos();
			}
		});

		this.calculateVariantState();
		this.updateVariantInfos();
		this.initMultiSelectState();
	}

	initMultiSelectState() {
		this.querySelectorAll('fieldset[data-multi-select="true"]').forEach((fieldset) => {
			const pickCount = parseInt(fieldset.dataset.pickCount || "0", 10);
			if (pickCount > 0) this.setMultiSelectState(fieldset, pickCount);
		});
	}

	setMultiSelectState(fieldset, pickCount) {
		const boxes = [...fieldset.querySelectorAll('input[type="checkbox"]')];
		const atCap = boxes.filter((box) => box.checked).length >= pickCount;
		// Lock remaining options once the cap is reached
		boxes.forEach((box) => { box.disabled = !box.checked && atCap; });
	}

	calculateVariantState() {
		const checkedPriceRadios = Array.from(
			this.querySelectorAll('input[name^="price_variant_group_"]:checked'),
		);
		let unitPrice = this.basePrice;
		let compareAtPrice = null;
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

			const cap = parseInt(radio.dataset.compareAtPrice || "0", 10);
			if (cap > 0) compareAtPrice = cap;
		});

		const checkedNonPriceRadios = Array.from(
			this.querySelectorAll("input[data-sku-suffix]:checked"),
		);
		const nonPriceSkuSuffixes = [];
		const nonPriceVariantsPayload = [];
		const includeSkuGroups = this.dataset.includeSkuGroups?.split(",") || null;

		checkedNonPriceRadios.forEach((radio) => {
			const fieldset = radio.closest("fieldset");
			const groupName = fieldset?.dataset.groupName || "";
			const includeInSku =
				!includeSkuGroups || includeSkuGroups.includes(groupName);
			if (includeInSku) {
				// Hyphenate multi-select picks for readable SKUs
				const prefix =
					fieldset?.dataset.multiSelect === "true" && nonPriceSkuSuffixes.length > 0
						? "-"
						: "";
				nonPriceSkuSuffixes.push(`${prefix}${radio.dataset.skuSuffix}`);
			}
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
					compareAtPrice: compareAtPrice,
					finalSku: finalSku,
					priceVariants: priceVariantsPayload,
					nonPriceVariants: nonPriceVariantsPayload,
				},
				bubbles: true,
				composed: true,
			}),
		);
	}

	updateVariantInfos() {
		const fieldsets = this.querySelectorAll("fieldset");
		fieldsets.forEach((fieldset) => {
			const infoSpan = fieldset.querySelector(".variant-choice-info");
			if (!infoSpan) return;
			const checked = fieldset.querySelector("input:checked");
			const moreInfo = checked?.dataset.moreInfo;
			if (moreInfo) {
				infoSpan.innerHTML = moreInfo;
				infoSpan.hidden = false;
			} else {
				infoSpan.hidden = true;
			}
		});
	}
}

if (!customElements.get("variant-selector")) {
	customElements.define("variant-selector", VariantSelector);
}

export function updateSlashPrice(container, displayPrice, compareAtPrice) {
	const slashEl = container.querySelector("[data-slash-price]");
	if (!slashEl) return;
	const compareAtEl = slashEl.querySelector(".compare-at-price");
	const badgeEl = slashEl.querySelector(".discount-badge");

	if (compareAtPrice && compareAtPrice > displayPrice && compareAtEl && badgeEl) {
		const pct = Math.round((1 - displayPrice / compareAtPrice) * 100);
		compareAtEl.textContent = formatPrice(compareAtPrice);
		badgeEl.textContent = `-${pct}%`;
		slashEl.classList.remove("is-hidden");
	} else {
		slashEl.classList.add("is-hidden");
	}
}
