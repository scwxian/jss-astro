import { actions } from "astro:actions";
import { persistentMap } from "@nanostores/persistent";
import {
	calculateFinalPrice,
	prepareCheckoutPayload,
	prepareQuotePayload,
} from "./checkout.action.js";
import {
  DOM,
	getDeliveryMethod,
	getLocationEstimate,
	getPromoCode,
	isFormValid,
	setButtonLoading,
	setPaymentButtonEnabled,
  getCheckoutFormData,
	toggleError,
	updatePriceDisplay,
  autofillForm,
} from "./checkout.ui.js";
import { logger } from "@log-alert/logger";

// --- STATE & UTILITIES ---
let currentCalcSeq = 0;
let cartUnsubscribe = null;
let isInitialized = false;
const debouncedSaveSession = debounce(saveSessionData, 500);
export const debouncedCheckoutCalc = debounce(checkoutCalc, 50);

let getCheckoutItems = () => [];
export function setCheckoutItemsGetter(getterFn) {
	getCheckoutItems = getterFn;
}

export const $checkoutSession = persistentMap(
	"checkout:",
	{},
	{
		listen: false,
		engine: {
			getItem: (key) => window.sessionStorage.getItem(key),
			setItem: (key, val) => window.sessionStorage.setItem(key, val),
			removeItem: (key) => window.sessionStorage.removeItem(key),
		},
	},
);

// Standard debounce, micro-pause for DOM updates.
function debounce(func, defaultDelay = 50) {
	let timeoutId = null;
  const debounced = (overrideDelay) => {
		const delay = typeof overrideDelay === "number" ? overrideDelay : defaultDelay;
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => func(), delay);
	};
	debounced.cancel = () => clearTimeout(timeoutId);
	return debounced;
}

// Save form data to sessionStorage
export function saveSessionData() {
	const currentData = getCheckoutFormData();
	$checkoutSession.setKey("formData", JSON.stringify(currentData));
}

// --- DATA FETCHING ---
// Loads user data from session storage or server.
export async function loadUserData() {
	try {
		const sessionState = $checkoutSession.get();
		if (sessionState && sessionState.formData) {
			logger.info({ component: "loadUserData" }, "Found formData in sessionStorage");
			try {
				const parsedData = JSON.parse(sessionState.formData);
				autofillForm(parsedData);
				debouncedCheckoutCalc(); 
				logger.info({ component: "loadUserData" }, "Hydrated from session storage");
				return;
			} catch (parseError) {
				logger.error(
					{ component: "loadUserData" },
					"Failed to parse session data, falling back to server:",
					parseError,
				);
			}
		}

		const { data, error } = await actions.getUser();
		if (error) {
			logger.error({ component: "loadUserData" }, "getUser returned error:", error);
			return;
		}
		if (data && data.success && data.data) {
			autofillForm(data.data);
			debouncedCheckoutCalc();
			logger.info({ component: "loadUserData" }, "Hydrated from server user profile");
		}
	} catch (err) {
		logger.error({ component: "loadUserData" }, "Error details:", err.message, err.stack);
	}
}

// FIELD TRACKING
export function initInteractionListeners() {
	if (!DOM.form) return;
	if (DOM.promoBtn) DOM.promoBtn.addEventListener("click", handlePromoApply);

	function checkReadiness() {
		const delivery = getDeliveryMethod();
		const locationReady = delivery === "ship" ? !!getLocationEstimate() : true;
		const formReady = isFormValid();
		if (locationReady || formReady) {
			debouncedCheckoutCalc();
		} else {
			setPaymentButtonEnabled(false);
		}
	}

	function shouldHandle(e) {
		return e.target.matches("input:not([disabled]), select:not([disabled])");
	}

	DOM.form.addEventListener("focusout", (e) => {
		if (!shouldHandle(e)) return;
		checkReadiness();
	});

	DOM.form.addEventListener("change", (e) => {
		if (!shouldHandle(e)) return;
		checkReadiness();
		debouncedSaveSession();
	});

	DOM.form.addEventListener("input", (e) => {
		if (!e.target.matches("input:not([disabled]), select:not([disabled])"))
			return;
		debouncedSaveSession();
	});
}

// --- EVENT LIFECYCLE CLEANUP ---
export function checkIsInitialized() { return isInitialized; }
export function setInitialized(status) { isInitialized = status; }
export function registerCartUnsubscribe(unsubscribeFn) { cartUnsubscribe = unsubscribeFn; }
export function cleanupCheckout() {
	if (cartUnsubscribe) {
		cartUnsubscribe();
		cartUnsubscribe = null;
	}
	if (typeof debouncedCheckoutCalc.cancel === 'function') {
		debouncedCheckoutCalc.cancel();
	}
	isInitialized = false;
}

// --- ALL CALC AND CHECKOUT LOGIC ---
// PRE-CHECKOUT PRICE CALCULATION
export async function checkoutCalc() {
  if (DOM.paymentBtn && DOM.paymentBtn.matches(':active')) {
		return;
	}
	const seq = ++currentCalcSeq;
	setButtonLoading("payment-btn", true);
	toggleError("payment", "");
	let isCheckoutReady = false;

	try {
    const cartItems = getCheckoutItems();
		if (!cartItems || cartItems.length === 0) {
			toggleError("payment", "Your cart is empty.");
			return;
		}
		const payload = prepareQuotePayload(cartItems);
		const { data, error } = await calculateFinalPrice(payload);
		if (seq !== currentCalcSeq) return;
		if (error) {
			toggleError("payment", error.message || "Failed to calculate prices.");
			return;
		}
		if (!data) {
			toggleError("payment", "No response from server.");
			return;
		}

		updatePriceDisplay(data);
		if (data.isValid && isFormValid()) {
			isCheckoutReady = true;
		} else if (data.errors && data.errors.length > 0) {
			toggleError("payment", data.errors);
		}
	} catch (err) {
		if (seq !== currentCalcSeq) return;
		logger.error({ component: "OneTimeCheckout" }, "checkoutCalc error:", err);
		toggleError("payment", "An unexpected error occurred. Please try again.");
	} finally {
		if (seq === currentCalcSeq) {
      setPaymentButtonEnabled(isCheckoutReady);
			setButtonLoading("payment-btn", false);
		}
	}
}

// --- PROMO CODE HANDLER ---
export async function handlePromoApply() {
	const promoCode = getPromoCode();
	if (!promoCode) {
		toggleError("promo", "Please enter a promo code");
		return;
	}

	toggleError("promo", "");
	setButtonLoading("promo-btn", true);
	try {
		await checkoutCalc();
	} catch (error) {
		toggleError("promo", "Failed to apply promo code. Please try again.");
	} finally {
		setButtonLoading("promo-btn", false);
	}
}

// --- CHECKOUT HANDLER ---
export function createPaymentHandler(config) {
	const { processAction, logComponent, emptyCartMessage, checkoutType } = config;

	return async function handlePayment(e) {
		e.preventDefault();
    debouncedCheckoutCalc.cancel();
		if (!isFormValid(false)) {
			toggleError("payment", "Please fill in all required fields correctly.");
      setPaymentButtonEnabled(false);
			return;
		}
		const items = getCheckoutItems();
		if (!items || items.length === 0) {
			toggleError("payment", emptyCartMessage || "Your cart is empty.");
			return;
		}
		toggleError("payment", "");
		setButtonLoading("payment-btn", true);

		try {
			const payload = prepareCheckoutPayload(items, checkoutType);
			const { data, error } = await processAction(payload);

			if (error) {
				if (error.code !== "TOO_MANY_REQUESTS") {
					toggleError(
						"payment",
						error.message || "Payment provider issue. Please try again.",
					);
				}
				setButtonLoading("payment-btn", false);
				return;
			}

			if (data && data.success && data.checkoutUrl) {
        $checkoutSession.setKey("formData", undefined);
				window.location.href = data.checkoutUrl;
				return;
			} else {
				throw new Error("Invalid response from server");
			}
		} catch (error) {
			logger.error({ component: logComponent }, "Payment handler error:", error);
			toggleError(
				"payment",
				"Our payment provider is experiencing issues. Please try again after a short moment.",
			);
		} finally {
			setButtonLoading("payment-btn", false);
		}
	};
}
