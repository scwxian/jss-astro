import { formatPrice } from "@cart/cart.store.ts";

export const DOM = {};
const addressFields = [
	"FirstName",
	"LastName",
	"Company",
	"Street1",
	"Street2",
	"City",
	"PostalCode",
	"Country",
	"State",
	"Phone",
];
const paymentBtnState = { loading: false, formReady: false };
function initDOMCache() {
	DOM.fallback = document.getElementById("checkout-fallback");
	DOM.layout = document.getElementById("checkout-layout");
	DOM.form = document.getElementById("checkout-form");
	DOM.shippingSection = document.getElementById("shipping-section");
	DOM.billingSection = document.getElementById("billing-section");
	DOM.pickupInfo = document.getElementById("pickup-info");

	// Buttons & Toggles
  DOM.paymentBtn = document.getElementById("payment-btn");
	DOM.toggleButtons = document.querySelectorAll(".toggle-btn");
	DOM.promoInput = document.getElementById("promoCode");
	DOM.promoBtn = document.getElementById("promo-btn");

	// Form Fields
	DOM.emailInput = document.getElementById("email");
  DOM.sameAsShippingWrapper = document.getElementById("same-as-shipping-wrapper");
  DOM.sameAsShippingCheckbox = document.getElementById("sameAsShipping");
	DOM.saveInfoCheckbox = document.getElementById("saveInfo");
	["shipping", "billing"].forEach((prefix) => {
		addressFields.forEach((field) => {
			DOM[`${prefix}${field}`] = document.getElementById(`${prefix}${field}`);
		});
	});

	// Summary & Price Display
	DOM.summaryContainer = document.getElementById("summary-items");
	DOM.subtotal = document.getElementById("subtotal");
	DOM.discountRow = document.getElementById("discount-row");
	DOM.discount = document.getElementById("discount");
	DOM.shipping = document.getElementById("shipping");
	DOM.total = document.getElementById("total");
}

// --- DATA EXTRACTORS ---
function getAddressFormData(prefix) {
	return {
		firstName: DOM[`${prefix}FirstName`]?.value?.trim() || "",
		lastName: DOM[`${prefix}LastName`]?.value?.trim() || undefined,
		company: DOM[`${prefix}Company`]?.value?.trim() || undefined,
		street1: DOM[`${prefix}Street1`]?.value?.trim() || "",
		street2: DOM[`${prefix}Street2`]?.value?.trim() || undefined,
		city: DOM[`${prefix}City`]?.value?.trim() || "",
		postalCode: DOM[`${prefix}PostalCode`]?.value?.trim() || "",
		country: DOM[`${prefix}Country`]?.value?.trim(),
		state: DOM[`${prefix}State`]?.value?.trim() || "",
		phone: DOM[`${prefix}Phone`]?.value?.trim() || "",
	};
}

export function getDeliveryMethod() {
	// Default to "ship" when no delivery toggle exists (subscription checkout)
	if (!DOM.toggleButtons || DOM.toggleButtons.length === 0) return "ship";
	const activeToggle = Array.from(DOM.toggleButtons).find((btn) =>
		btn.classList.contains("active"),
	);
	return activeToggle?.dataset.delivery === "ship" ? "ship" : "pickup";
}

export function getLocationEstimate() {
	if (getDeliveryMethod() !== "ship") return undefined;
	const postalCode = DOM.shippingPostalCode?.value?.trim();
	const city = DOM.shippingCity?.value?.trim();
	const state = DOM.shippingState?.value?.trim();
	const country = DOM.shippingCountry?.value?.trim();
	if (!postalCode || !city || !state) return undefined;
	return { postalCode, city, state, country };
}

export function getPromoCode() { return DOM.promoInput?.value?.trim() || undefined; }

export function getCheckoutFormData() {
	const deliveryMethod = getDeliveryMethod();
	const sameAsShipping = DOM.sameAsShippingCheckbox?.checked ?? true;
	const basePayload = {
		email: DOM.emailInput?.value?.trim() || "",
		saveInfo: DOM.saveInfoCheckbox?.checked ?? false,
		deliveryMethod,
		sameAsShipping,
	};

	let shipping;
	let billing;
	if (deliveryMethod === "pickup") {
		billing = getAddressFormData("billing");
		shipping = { ...billing };
	} else {
		shipping = getAddressFormData("shipping");
		if (sameAsShipping) {
			billing = { ...shipping };
		} else {
			billing = getAddressFormData("billing");
		}
	}
	return {
		...basePayload,
		shipping,
		billing,
	};
}

// --- UI STATE HELPERS ---
function formatErrorMessages(input) {
	if (!input) return "";
	if (Array.isArray(input)) {
		return input.map((err) =>
			typeof err === "object" && err.message ? err.message : String(err),
		);
	}

	if (typeof input === "string") {
		if (input.includes("Failed to validate:") && input.includes("[")) {
			try {
				const startIndex = input.indexOf("[");
				const jsonPart = input.substring(startIndex);
				const parsed = JSON.parse(jsonPart);
				if (Array.isArray(parsed)) {
					return parsed.map((err) => err.message || "Invalid input");
				}
			} catch (e) {}
		}
		return input;
	}
	if (typeof input === "object" && input.message) {
		return formatErrorMessages(input.message);
	}
	return String(input);
}

export function toggleError(elementId, rawMessage = "") {
	const errorEl = document.getElementById(`${elementId}-error`);
	const inputEl = document.getElementById(elementId);
	const cleanMessage = formatErrorMessages(rawMessage);
	const hasError = Array.isArray(cleanMessage)
		? cleanMessage.length > 0
		: !!cleanMessage;

	if (errorEl) {
		errorEl.innerHTML = Array.isArray(cleanMessage)
			? cleanMessage.map((e) => `<div>• ${e}</div>`).join("")
			: cleanMessage;
		errorEl.style.display = hasError ? "block" : "none";
		errorEl.style.alignSelf = "flex-start";
	}
	if (inputEl) {
		inputEl.classList.toggle("error", hasError);
	}
}

// -- BUTTON STATE MANAGEMENT ---
function syncPaymentButtonState(){
  if (!DOM.paymentBtn) return;
  DOM.paymentBtn.disabled = paymentBtnState.loading || !paymentBtnState.formReady;
	const btnText = DOM.paymentBtn.querySelector(".btn-text");
	const btnLoader = DOM.paymentBtn.querySelector(".btn-loader");
  if (btnText) btnText.style.display = paymentBtnState.loading ? "none" : "inline";
  if (btnLoader) btnLoader.style.display = paymentBtnState.loading ? "flex" : "none";
}

export function setPaymentButtonEnabled(enabled) {
  paymentBtnState.formReady = enabled;
  syncPaymentButtonState();
}

export function setButtonLoading(buttonId, isLoading) {
	const button = buttonId === "payment-btn" ? DOM.paymentBtn : document.getElementById(buttonId);
	if (!button) return;

  if (buttonId === "payment-btn") {
    paymentBtnState.loading = isLoading;
    syncPaymentButtonState();
  } else {
    button.disabled = isLoading;
    const btnText = button.querySelector(".btn-text");
    const btnLoader = button.querySelector(".btn-loader");
    if (btnText) btnText.style.display = isLoading ? "none" : "inline";
    if (btnLoader) btnLoader.style.display = isLoading ? "flex" : "none";
  }
}

export function toggleSectionInputs(section, isEnabled) {
	if (!section) return;
	section.querySelectorAll("input, select").forEach((input) => {
		input.disabled = !isEnabled;
	});
}

// --- CART RENDERING ---
const createOneTimeItemHTML = (item) => {
	const variants = [
		...(item.priceVariants || []).map(
			(v) => `<p class="cart-item-variant"><span class="variant-name">${v.groupName}:</span> <span class="variant-choice">${v.variantName}</span></p>`
		),
		...(item.nonPriceVariants || []).map(
			(v) => `<p class="cart-item-variant"><span class="variant-name">${v.groupName}:</span> <span class="variant-choice">${v.choiceName}</span></p>`
		),
	].join("");

	return `
	<div class="cart-item">
		<div class="cart-item-image">
			<img src="${item.image}" alt="${item.name}" loading="lazy" />
			<span class="item-quantity">${item.quantity}</span>
		</div>
		<div class="cart-item-info">
			<p class="cart-item-name">${item.name}</p>
			${variants}
		</div>
		<p class="item-price">${formatPrice(item.displayPrice * item.quantity)}</p>
	</div>
	`;
};

// HTML Template for Subscription Items
const createSubscriptionItemHTML = (item) => {
	const nonPriceVariantsHtml = (item.nonPriceVariants || [])
		.filter((v) => v.groupName !== "Schedule")
		.map(
			(v) => `<p class="cart-item-variant"><span class="variant-name">${v.groupName}:</span> <span class="variant-choice">${v.choiceName}</span></p>`
		)
		.join("");

	const dateLines = [
		item.nextDeliveryDate ? `<p class="cart-item-variant"><span class="variant-name">Next Delivery Date:</span> <span class="variant-choice">${item.nextDeliveryDate}</span></p>` : "",
		item.nextBillingDate ? `<p class="cart-item-variant"><span class="variant-name">Next Billing Date:</span> <span class="variant-choice">${item.nextBillingDate}</span></p>` : "",
	].join("");

	return `
	<div class="cart-item">
		<div class="cart-item-image">
			<img src="${item.image}" alt="${item.name}" loading="lazy" />
		</div>
		<div class="cart-item-info">
			<p class="cart-item-name">${item.name}</p>
      ${nonPriceVariantsHtml}
			<p class="cart-item-variant"><span class="variant-name">Plan:</span> <span class="variant-choice">${item.planName}</span></p>
			${dateLines}
      <p class="item-price subscription">${formatPrice(item.displayPrice)} / ${item.billingInterval}</p>
    </div>
	</div>
	`;
};

export function renderCartItems(items) {
	if (!DOM.summaryContainer) return;
	DOM.summaryContainer.innerHTML = items.map((item) => {
		const isSubscription = !!item.planName;
		return isSubscription 
			? createSubscriptionItemHTML(item) 
			: createOneTimeItemHTML(item);
	}).join("");
}

// --- PRICE DISPLAY ---
export function initialPriceDisplay(subtotal) {
	if (DOM.subtotal) DOM.subtotal.textContent = formatPrice(subtotal);
	if (DOM.total) DOM.total.textContent = formatPrice(subtotal);
}

export function updatePriceDisplay(cartState) {
	if (DOM.subtotal) DOM.subtotal.textContent = formatPrice(cartState.subtotal);
	if (DOM.total) DOM.total.textContent = formatPrice(cartState.grandTotal);

	if (DOM.discountRow && DOM.discount) {
		const hasDiscount = cartState.discount > 0;
		DOM.discountRow.style.display = hasDiscount ? "flex" : "none";
		if (hasDiscount)
			DOM.discount.textContent = `-${formatPrice(cartState.discount)}`;
	}

	if (DOM.shipping) {
		DOM.shipping.innerHTML =
			cartState.shipping === 0
				? "<strong>Free</strong>"
				: formatPrice(cartState.shipping);
	}
}

// --- FORM VALIDATION ---
export function validateField(input) {
	if (input.checkValidity()) {
		toggleError(input.id, "");
		return true;
	}

	let errorMessage = input.validationMessage;
	const validity = input.validity;
	if (validity.valueMissing) {
		errorMessage = "This field is required";
	} else if (validity.typeMismatch && input.type === "email") {
		errorMessage = "Please enter a valid email address";
	} else if (validity.patternMismatch) {
		errorMessage = input.id.toLowerCase().includes("postalcode")
			? "Please enter a valid postcode"
			: "Please match the requested format";
	}
	toggleError(input.id, errorMessage);
	return false;
}

export function isFormValid(silent = true) {
	if (!DOM.form) return false;
	let isValid = true;
	const inputs = DOM.form.querySelectorAll(
		"input:not([disabled])[required], select:not([disabled])[required]",
	);

	inputs.forEach((input) => {
		const fieldIsValid = silent ? input.checkValidity() : validateField(input);
		if (!fieldIsValid) isValid = false;
	});
	return isValid;
}

// --- EVENT LISTENERS ---
function initValidationEvents() {
	if (!DOM.form) return;
	DOM.form.addEventListener("focusout", (e) => {
		if (e.target.matches("input:not([disabled]), select:not([disabled])")) {
			validateField(e.target);
		}
	});

	DOM.form.addEventListener("input", (e) => {
		if (!e.target.matches("input, select")) return;
		if (e.target.type === "tel") {
			e.target.value = e.target.value.replace(/\D/g, "");
		}
		if (e.target.classList.contains("error")) {
			toggleError(e.target.id, "");
		}
	});
}

// Billing Field Handlers
const requiredBillingFields = [
	"FirstName",
	"Street1",
	"City",
	"PostalCode",
	"State",
	"Phone",
];

function setBillingRequired(isRequired) {
	requiredBillingFields.forEach((field) => {
		const input = DOM[`billing${field}`];
		if (input) input.required = isRequired;
	});
}

function initDeliveryToggle() {
	DOM.toggleButtons.forEach((btn) => {
		btn.addEventListener("click", (e) => {
			DOM.toggleButtons.forEach((b) => {
				b.classList.remove("active");
				b.setAttribute("aria-pressed", "false");
			});

			const currentBtn = e.currentTarget;
			currentBtn.classList.add("active");
			currentBtn.setAttribute("aria-pressed", "true");

			const isShip = currentBtn.dataset.delivery === "ship";
			DOM.shippingSection.style.display = isShip ? "block" : "none";
			DOM.sameAsShippingWrapper.style.display = isShip ? "block" : "none";
			DOM.pickupInfo.style.display = isShip ? "none" : "flex";

			toggleSectionInputs(DOM.shippingSection, isShip);
			if (isShip && DOM.sameAsShippingCheckbox?.checked) {
				DOM.billingSection.style.display = "none";
				toggleSectionInputs(DOM.billingSection, false);
				setBillingRequired(false);
			} else {
				DOM.billingSection.style.display = "block";
				toggleSectionInputs(DOM.billingSection, true);
				setBillingRequired(true);
			}
		});
	});
}

function initBillingCheckbox() {
	if (!DOM.sameAsShippingCheckbox) return;
	DOM.sameAsShippingCheckbox.addEventListener("change", (e) => {
    const isShip = getDeliveryMethod() === "ship";
    const isSame = e.target.checked;
    const shouldHideBilling = isShip && isSame;
		DOM.billingSection.style.display = shouldHideBilling ? "none" : "block";
		toggleSectionInputs(DOM.billingSection, !shouldHideBilling);
		setBillingRequired(!shouldHideBilling);
	});
}

// --- AUTOFILL UI ---
function autofillAddress(prefix, address) {
	const fields = [
		"firstName",
		"lastName",
		"company",
		"street1",
		"street2",
		"city",
		"postalCode",
		"country",
		"state",
		"phone",
	];

	fields.forEach((field) => {
		const capitalizedName = field.charAt(0).toUpperCase() + field.slice(1);
		const input = DOM[`${prefix}${capitalizedName}`];
		if (input && address[field] !== undefined) {
			if (field === "state") {
				input.dataset.savedState = address[field];
			}
			input.value = address[field];
			input.dispatchEvent(new Event("input", { bubbles: true }));
		}
	});
}

export function autofillForm(userData) {
	if (DOM.emailInput && userData.email) {
		DOM.emailInput.value = userData.email;
		DOM.emailInput.dispatchEvent(new Event("input", { bubbles: true }));
	}
	const deliveryToggle = Array.from(DOM.toggleButtons).find(
		(btn) => btn.dataset.delivery === userData.deliveryMethod,
	);

	if (deliveryToggle) deliveryToggle.click();
	if (userData.shipping) autofillAddress("shipping", userData.shipping);
	if (DOM.sameAsShippingCheckbox && userData.sameAsShipping !== undefined) {
		DOM.sameAsShippingCheckbox.checked = !!userData.sameAsShipping;
		DOM.sameAsShippingCheckbox.dispatchEvent(
			new Event("change", { bubbles: true }),
		);
	}
	if (userData.billing) autofillAddress("billing", userData.billing);
}

// --- CHECKOUT VIEW TOGGLE ---
export function toggleCheckoutView(hasItems) {
	if (hasItems) {
		if (DOM.fallback) DOM.fallback.style.display = "none";
		if (DOM.layout) DOM.layout.style.display = "";
	} else {
		if (DOM.fallback) DOM.fallback.style.display = "";
		if (DOM.layout) DOM.layout.style.display = "none";
	}
}

// --- INITIALIZATION ---
export function initCheckoutUI() {
	initDOMCache();
  paymentBtnState.loading = false;
  paymentBtnState.formReady = false;
  syncPaymentButtonState();
	initValidationEvents();
	initDeliveryToggle();
	initBillingCheckbox();

}
