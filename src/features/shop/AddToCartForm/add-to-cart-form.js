import { addToCart, formatPrice } from "@cart/cart.store.ts";

class AddToCartForm extends HTMLElement {
	connectedCallback() {
		this.masterSku = this.dataset.masterSku || "";
		this.slug = this.dataset.slug || "";
		this.name = this.dataset.name || "";
		this.image = this.dataset.image || "";
		this.basePrice = parseInt(this.dataset.basePrice || "0", 10);
		this.maxQuantity = parseInt(this.dataset.maxQuantity || "10", 10);

		this.currentUnitPrice = this.basePrice;
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
	}

	setupEventListeners() {
		this.addEventListener("variant-change", (e) => {
			const detail = e.detail;
			this.currentUnitPrice = detail.unitPrice;
			this.currentFullSku = detail.finalSku;
			this.currentPriceVariants = detail.priceVariants;
			this.currentNonPriceVariants = detail.nonPriceVariants;

			this.updatePriceDisplay();
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
				value >= this.maxQuantity ? "block" : "none";
		}
	}

	updatePriceDisplay() {
		if (!this.priceDisplay) return;
		const quantity = this.quantityInput
			? parseInt(this.quantityInput.value, 10) || 1
			: 1;
		this.priceDisplay.textContent = formatPrice(
			this.currentUnitPrice * quantity,
		);
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

		if (typeof window.openCartPopover === "function") {
			window.openCartPopover();
		}
	}
}

if (!customElements.get("add-to-cart-form")) {
	customElements.define("add-to-cart-form", AddToCartForm);
}
