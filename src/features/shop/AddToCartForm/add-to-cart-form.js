import { addToCart, formatPrice } from "@cart/cart.store.ts";
import { updateSlashPrice } from "@shop/VariantSelector/variant-selector.js";
import { initLiveStock, invalidateStockCache } from "@live-stock/live-stock.js";
import { getQtyLimitCopy, isQtyLimitVisible } from "./qty-limit.copy.ts";

class AddToCartForm extends HTMLElement {
	connectedCallback() {
		this.masterSku = this.dataset.masterSku || "";
		this.slug = this.dataset.slug || "";
		this.name = this.dataset.name || "";
		this.image = this.dataset.image || "";
		this.basePrice = parseInt(this.dataset.basePrice || "0", 10);
		this.maxQuantity = parseInt(this.dataset.maxQuantity || "10", 10);
		this.stockCheck = this.dataset.stockCheck === "true";
		this.stockFallback = this.dataset.stockFallback || "out-of-stock";
		this.isOut = this.dataset.isOut === "true";
		this.stockPending = this.stockCheck;

		this.currentUnitPrice = this.basePrice;
		this.currentCompareAtPrice = null;
		this.currentFullSku = this.masterSku;
		this.currentPriceVariants = [];
		this.currentNonPriceVariants = [];

		this.form = this.querySelector("[data-form]");
		this.priceDisplay = this.querySelector("[data-dynamic-price]");
		this.quantityInput = this.querySelector("[data-quantity]");
		this.qtyDecrease = this.querySelector("[data-qty-decrease]");
		this.qtyIncrease = this.querySelector("[data-qty-increase]");
		this.qtyLimitMsg = this.querySelector("[data-qty-limit-msg]");
		this.submitBtn = this.querySelector("[data-submit-btn]");

		// 4. Setup Event Listeners
		this.setupEventListeners();
		this.updatePriceDisplay();
		const vs = this.querySelector("variant-selector");
		if (vs?.calculateVariantState) vs.calculateVariantState();

		if (this.stockCheck && !this._stockInit) {
			this._stockInit = true;
			initLiveStock(this);
		}

		this.updateSubmitState();
	}

	setupEventListeners() {
		this.addEventListener("variant-change", (e) => {
			const detail = e.detail;
			this.currentUnitPrice = detail.unitPrice;
			this.currentCompareAtPrice = detail.compareAtPrice;
			this.currentFullSku = detail.finalSku;
			this.currentPriceVariants = detail.priceVariants;
			this.currentNonPriceVariants = detail.nonPriceVariants;

			this.updatePriceDisplay();
			this.updateSubmitState();
		});

		if (this.quantityInput) {
			this.qtyDecrease?.addEventListener("click", () =>
				this.adjustQuantity(-1),
			);
			this.qtyIncrease?.addEventListener("click", () => this.adjustQuantity(1));

			this.quantityInput.addEventListener("input", () =>
				this.validateQuantity(),
			);
			this.quantityInput.addEventListener("blur", () => {
				this.validateQuantity();
				this.updatePriceDisplay();
			});
		}

		if (this.form) {
			this.form.addEventListener("submit", (e) => this.handleSubmit(e));
		}
	}

	adjustQuantity(delta) {
		const currentVal = parseInt(this.quantityInput.value, 10) || 1;
		let newVal = currentVal + delta;

		if (newVal < 1) newVal = 1;
		if (newVal > this.maxQuantity) newVal = this.maxQuantity;

		this.quantityInput.value = newVal;
		this.validateQuantity();
		this.updatePriceDisplay();
	}

	validateQuantity() {
		let value = parseInt(this.quantityInput.value, 10);
		if (Number.isNaN(value) || value < 1) {
			value = 1;
		} else if (value > this.maxQuantity) {
			value = this.maxQuantity;
		}

		if (this.quantityInput.value !== value.toString()) {
			this.quantityInput.value = value;
		}

		if (this.qtyDecrease) {
			this.qtyDecrease.disabled = value <= 1;
		}
		if (this.qtyIncrease) {
			this.qtyIncrease.disabled = value >= this.maxQuantity;
		}
		if (this.qtyLimitMsg) {
			this.qtyLimitMsg.style.display =
				isQtyLimitVisible(this.maxQuantity, value) ? "block" : "none";
		}
	}

	updatePriceDisplay() {
		if (!this.priceDisplay) return;
		const quantity = this.quantityInput
			? parseInt(this.quantityInput.value, 10) || 1
			: 1;
		const total = this.currentUnitPrice * quantity;
		const compareTotal = this.currentCompareAtPrice
			? this.currentCompareAtPrice * quantity
			: null;
		this.priceDisplay.textContent = formatPrice(total);
		updateSlashPrice(this, total, compareTotal);
	}

	isSelectionValid() {
		for (const fieldset of this.querySelectorAll("fieldset")) {
			const inputs = fieldset.querySelectorAll("input");
			if (inputs.length === 0) continue;
			const checked = fieldset.querySelectorAll("input:checked").length;
			if (fieldset.dataset.multiSelect === "true") {
				const pickCount = parseInt(fieldset.dataset.pickCount || "0", 10);
				if (checked === 0) return false;
				if (pickCount > 0 && checked !== pickCount) return false;
			} else if (checked !== 1) {
				return false;
			}
		}
		return true;
	}

	updateSubmitState() {
		if (!this.submitBtn) return;
		this.submitBtn.disabled = this.isOut || this.stockPending || !this.isSelectionValid();
	}

	handleSubmit(event) {
		event.preventDefault();
		if (this.submitBtn?.disabled) return;

		const quantity = this.quantityInput
			? parseInt(this.quantityInput.value, 10) || 1
			: 1;

		addToCart({
			masterSku: this.masterSku,
			fullSku: this.currentFullSku,
			slug: this.slug,
			name: this.name,
			image: this.image,
			displayPrice: this.currentUnitPrice,
			quantity: quantity,
			maxQuantity: this.maxQuantity,
			priceVariants: this.currentPriceVariants,
			nonPriceVariants: this.currentNonPriceVariants,
		});

		if (this.stockCheck) invalidateStockCache(this.slug);

		if (typeof window.openCartPopover === "function") {
			window.openCartPopover();
		}
	}

	applyStockState(result) {
		const btn = this.submitBtn;
		const root = this.closest(".product-core-ui") ?? document;
		const setBtn = (text) => {
			if (!btn) return;
			btn.removeAttribute("aria-busy");
			btn.textContent = text;
		};
		const showBadge = (which) => {
			root.querySelectorAll("[data-stock-badge]").forEach((b) => {
				b.classList.toggle("is-hidden", b.dataset.stockBadge !== which);
			});
		};
		const callout = root.querySelector("[data-preorder-callout]");
		if (callout) callout.classList.add("is-hidden");

		this.stockPending = false;
		switch (result.status) {
			case "in_stock":
				this.isOut = false;
				setBtn("Add to Cart");
				showBadge(null);
				this.setMaxQuantity(result.quantity);
				break;
			case "pre_order":
				this.isOut = false;
				setBtn("Pre-Order Now");
				showBadge("pre");
				if (callout) callout.classList.remove("is-hidden");
				break;
			case "out_of_stock":
			case "unavailable":
			default:
				this.isOut = true;
				setBtn("Currently Unavailable");
				showBadge("out");
				break;
		}
		this.updateSubmitState();
	}

	setMaxQuantity(qty) {
		this.maxQuantity = qty;
		this.dataset.maxQuantity = String(qty);
		if (this.quantityInput) this.quantityInput.max = String(qty);
		this.renderQtyLimitMessage();
		this.validateQuantity();
	}

	renderQtyLimitMessage() {
		if (!this.qtyLimitMsg) return;
		this.qtyLimitMsg.innerHTML = getQtyLimitCopy(this.maxQuantity)?.html ?? "";
	}
}

if (!customElements.get("add-to-cart-form")) {
	customElements.define("add-to-cart-form", AddToCartForm);
}
