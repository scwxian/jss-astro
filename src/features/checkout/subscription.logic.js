import { $subscriptionItems, $subscriptionSubtotal } from "@cart/sub-cart.store.ts";
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
  checkIsInitialized,     
	setInitialized,         
	registerCartUnsubscribe,
	cleanupCheckout,
} from "./shared.logic.js";

// --- CART SUBSCRIPTIONS ---
setCheckoutItemsGetter(() => $subscriptionItems.get());
function initCartSubscriptions() {
	const subCartItems = $subscriptionItems.get();
	toggleCheckoutView(subCartItems && subCartItems.length > 0);
  const unsubscribe = $subscriptionItems.subscribe((items) => {
		renderCartItems(items);
		toggleCheckoutView(items && items.length > 0);
	});
  registerCartUnsubscribe(unsubscribe);
}

const handlePayment = createPaymentHandler({
	processAction: processCheckout,
	logComponent: "SubscriptionCheckout",
	emptyCartMessage: "No subscription selected. Choose a plan to proceed.",
  checkoutType: "subscription"
});

// --- INITIALIZATION ---
function initCheckout() {
  const checkoutForm = document.getElementById("checkout-form");
	if (!checkoutForm) return;
  if (checkIsInitialized()) return;

	initCheckoutUI();
	initialPriceDisplay($subscriptionSubtotal.get());
	initCartSubscriptions();
	initInteractionListeners();
	loadUserData();
	if (DOM.form) DOM.form.addEventListener("submit", handlePayment);
	setInitialized(true);
}

document.addEventListener("astro:page-load", initCheckout);
document.addEventListener("astro:before-swap", cleanupCheckout);
