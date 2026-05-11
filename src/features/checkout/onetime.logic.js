import { $cartItems, $cartSubtotal } from "@cart/cart.store.ts";
import { processCheckout } from "./checkout.action.js";
import {
  DOM,
	initCheckoutUI,
	renderCartItems,
	toggleCheckoutView,
	initialPriceDisplay,
} from "./checkout.ui.js";
import {
	loadUserData,
  initInteractionListeners,
  setCheckoutItemsGetter,
  createPaymentHandler,
  debouncedCheckoutCalc,
  checkIsInitialized,      
	setInitialized,          
	registerCartUnsubscribe, 
	cleanupCheckout,
} from "./shared.logic.js";

// --- CART SUBSCRIPTIONS ---
setCheckoutItemsGetter(() => $cartItems.get());
function initCartSubscriptions() {
	const cartItems = $cartItems.get();
	toggleCheckoutView(cartItems && cartItems.length > 0);
  const unsubscribe = $cartItems.subscribe((items) => {
		renderCartItems(items);
		toggleCheckoutView(items && items.length > 0);
	});
  registerCartUnsubscribe(unsubscribe);
}

function initDeliveryToggleListener() {
	DOM.toggleButtons.forEach((btn) => {
		btn.addEventListener("click", () => {
			debouncedCheckoutCalc();
		});
	});
}

const handlePayment = createPaymentHandler({
	processAction: processCheckout,
	logComponent: "OneTimeCheckout",
	emptyCartMessage: "Your cart is empty.",
  checkoutType: "one_time"
});

// --- INITIALIZATION ---
function initCheckout() {
  const checkoutForm = document.getElementById("checkout-form");
	if (!checkoutForm) return;
  if (checkIsInitialized()) return;

	initCheckoutUI();
	initialPriceDisplay($cartSubtotal.get());
	initCartSubscriptions();
	initInteractionListeners();
	initDeliveryToggleListener();
	loadUserData();
	if (DOM.form) DOM.form.addEventListener("submit", handlePayment);
	setInitialized(true);
}

document.addEventListener("astro:page-load", initCheckout);
document.addEventListener("astro:before-swap", cleanupCheckout);
