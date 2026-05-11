import {
	addToSubscriptionCart,
	formatPrice,
	resolveSubscriptionSchedule,
} from "@cart/sub-cart.store.ts";

const intervalGroupName = "Schedule";
const intervalDesc = {
	"bi-weekly": {
		uiMap: "Bi-Weekly",
		priceLabel: "Month",
		priceMultiplier: 2,
		getNextBillingText: (dates) => `every month (Next charge: ${dates.nextBillingDate})`,
		deliveryFrequencyText: "First and third week of every month",
		rollingText: (schedule) => `${schedule.interval.toLowerCase()} on the same day each ${schedule.billingInterval.toLowerCase()}`,
	},
	monthly: {
		uiMap: "Monthly",
		priceLabel: "Month",
		priceMultiplier: 1,
		getNextBillingText: (dates) => `every month (Next charge: ${dates.nextBillingDate})`,
		deliveryFrequencyText: "First week of every month",
		rollingText: (schedule) => `${schedule.interval.toLowerCase()} on the same day each ${schedule.billingInterval.toLowerCase()}`,
	},
	"bi-monthly": {
		uiMap: "Bi-Monthly",
		priceLabel: "2 Months",
		priceMultiplier: 1,
		getNextBillingText: (dates) => `every other month (Next charge: ${dates.nextBillingDate})`,
		deliveryFrequencyText: "First week, every 2 months",
		rollingText: (schedule) => `${schedule.interval.toLowerCase()} on the same day each ${schedule.billingInterval.toLowerCase()}`,
	},
	yearly: {
		uiMap: "Yearly",
		priceLabel: "Year",
		priceMultiplier: 12,
		getNextBillingText: (dates) => `the same month every year (Next charge: ${dates.nextBillingDate})`,
		deliveryFrequencyText: "First week of every month",
		rollingText: (schedule) => `${schedule.interval.toLowerCase()} on the same day each ${schedule.billingInterval.toLowerCase()}`,
	},
};

class PurchaseSubscriptionForm extends HTMLElement {
	connectedCallback() {
		this.masterSku = this.dataset.masterSku || "";
		this.slug = this.dataset.slug || "";
		this.name = this.dataset.name || "";
		this.image = this.dataset.image || "";
		this.basePrice = parseInt(this.dataset.basePrice || "0", 10);
		this.billingAlignment = this.dataset.billingAlignment || "anchored";
		this.hasDeliverySchedule = this.dataset.hasDeliverySchedule === "true";

		try {
			this.variants = JSON.parse(this.dataset.variants || "[]");
		} catch {
			this.variants = [];
		}

		this.currentVariant = null;
		this.currentInterval = null;
		this.currentNonPriceVariants = [];
		this.currentUnitPrice = this.basePrice;
		this.currentFullSku = this.masterSku;

		this.form = this.querySelector("[data-form]");
		this.priceDisplay = this.querySelector("[data-dynamic-price]");
		this.submitBtn = this.querySelector("[data-submit-btn]");
		this.nextBillingEl = this.querySelector("[data-next-billing]");
		this.deliveryFreqEl = this.querySelector("[data-delivery-frequency]");
		this.nextDeliveryEl = this.querySelector("[data-next-delivery]");
		this.rollingTextEl = this.querySelector("[data-rolling-text]");
		this.showBillingInfo = this.dataset.showBillingInfo === "true";

		this.setupEventListeners();
	}

	setupEventListeners() {
		this.addEventListener("variant-change", (e) =>
			this.handleVariantChange(e.detail),
		);
		if (this.form)
			this.form.addEventListener("submit", (e) => this.handleSubmit(e));
	}

	handleVariantChange(detail) {
		this.currentUnitPrice = detail.unitPrice;
		this.currentFullSku = detail.finalSku;
		this.currentPriceVariants = detail.priceVariants || [];
		this.currentNonPriceVariants = detail.nonPriceVariants || [];

		const intervalOption = this.currentNonPriceVariants.find((v) => v.groupName === intervalGroupName);
		if (intervalOption) {
			const uiChoice = intervalOption.choiceName;
			this.currentInterval = Object.keys(intervalDesc).find(
				k => intervalDesc[k].uiMap === uiChoice
			) || "monthly";
			this.currentScheduleSuffix = intervalOption.skuSuffix || "MTH";
			this.updateBillingInfoUI(this.currentInterval);
		}
		this.updatePriceDisplay();
	}

	getDisplayUnitPrice() {
		const multiplier = intervalDesc[this.currentInterval]?.priceMultiplier ?? 1;
		return this.currentUnitPrice * multiplier;
	}

	updatePriceDisplay() {
		if (!this.priceDisplay) return;
		const priceStr = formatPrice(this.getDisplayUnitPrice());
		const data = intervalDesc[this.currentInterval];
		this.priceDisplay.textContent = data?.priceLabel
			? `${priceStr} / ${data.priceLabel}`
			: priceStr;
	}

	updateBillingInfoUI(interval) {
		const data = intervalDesc[interval];
		if (!data) return;
		const schedule = resolveSubscriptionSchedule(this.currentScheduleSuffix, {
			billingAlignment: this.billingAlignment,
			hasDeliverySchedule: this.hasDeliverySchedule,
		});
		if (this.showBillingInfo) {
			if (this.nextBillingEl && schedule.nextBillingDate)
				this.nextBillingEl.textContent = data.getNextBillingText(schedule);
			if (this.deliveryFreqEl && schedule.nextDeliveryDate)
				this.deliveryFreqEl.textContent = data.deliveryFrequencyText;
			if (this.nextDeliveryEl && schedule.nextDeliveryDate)
				this.nextDeliveryEl.textContent = schedule.nextDeliveryDate;
		} else if (this.rollingTextEl) {
			this.rollingTextEl.textContent = data.rollingText(schedule);
		}
	}

	handleSubmit(event) {
		event.preventDefault();
		if (!this.currentPriceVariants.length || !this.currentInterval || this.submitBtn?.disabled) return;
		const schedule = resolveSubscriptionSchedule(this.currentScheduleSuffix, {
			billingAlignment: this.billingAlignment,
			hasDeliverySchedule: this.hasDeliverySchedule,
		});
		// Update to match your product variant group name (e.g., "Size", "Weight")
		const weightVariant = this.currentPriceVariants.find((v) => v.groupName === "Weight")?.variantName;
		const variantName = weightVariant ? weightVariant : "";
		const planName = variantName ? `${variantName} / ${schedule.perInterval}` : schedule.interval;

		addToSubscriptionCart({
			masterSku: this.masterSku,
			fullSku: this.currentFullSku,
			slug: this.slug,
			name: this.name,
			image: this.image,
			displayPrice: this.getDisplayUnitPrice(),
			priceVariants: this.currentPriceVariants,
			nonPriceVariants: this.currentNonPriceVariants,
			interval: schedule.interval,
			billingInterval: schedule.billingInterval,
			planName,
			...(schedule.nextBillingDate ? { nextBillingDate: schedule.nextBillingDate } : {}),
			...(schedule.nextDeliveryDate ? { nextDeliveryDate: schedule.nextDeliveryDate } : {}),
		});

		window.location.href = "/checkout/subscription/";
	}
}

if (!customElements.get("purchase-subscription-form")) {
	customElements.define("purchase-subscription-form", PurchaseSubscriptionForm);
}
