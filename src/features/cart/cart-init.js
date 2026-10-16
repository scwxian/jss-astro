/**
 * Cart Initialization and Cart Popover Event Handler Script
 * Imports cart stores and actions from cart.store.ts.
 * Validates cart products on first open and removes invalid items.
 */
import { actions } from "astro:actions";
import { logger } from "@log-alert/logger";
import {
	$cartCount,
	$cartItems,
	$cartSubtotal,
	$removedItems,
	addRemovedItem,
	clearCart,
	dismissRemovedItem,
	formatPrice,
	removeFromCart,
	updateQuantity,
} from "./cart.store.ts";

const VALIDATION_COMPLETE_KEY = "cart-validation-complete";
function hasValidationCompleted() {
	return sessionStorage.getItem(VALIDATION_COMPLETE_KEY) === "true";
}
function markValidationComplete() {
	sessionStorage.setItem(VALIDATION_COMPLETE_KEY, "true");
}

// CART ITEM VALIDATOR FOR BROKEN PRODUCTS
async function validateCartProducts() {
	if (hasValidationCompleted()) return;

	const items = $cartItems.get();
	if (!items || items.length === 0) {
		markValidationComplete();
		return;
	}

	const validItems = items.filter((item) => {
		if (!item.slug || !item.name || !item.key) {
			logger.warn({ component: "Cart" }, "Cart item missing required fields:", item);
			if (item.key) {
				removeFromCart(item.key);
				addRemovedItem({
					name: item.name || "Unknown Product",
					slug: item.slug || "unknown",
				});
			}
			return false;
		}
		return true;
	});

	if (validItems.length === 0) {
		markValidationComplete();
		return;
	}

	try {
		const result = await actions.validateCartProducts({ items: validItems });

		if (result.error) {
			logger.error({ component: "Cart" }, "Cart validation failed:", result.error);
			markValidationComplete();
			return;
		}

		const { invalidItems } = result.data;

		for (const invalid of invalidItems) {
			removeFromCart(invalid.key);
			addRemovedItem({
				name: invalid.name,
				slug: invalid.slug,
			});
		}

		markValidationComplete();
	} catch (error) {
		logger.error({ component: "Cart" }, "Failed to validate cart:", error);
		markValidationComplete();
	}
}

function createRemovedItemMessageHTML(item) {
	return `
		<div class="cart-item-removed" data-removed-slug="${item.slug}">
			<p class="removed-message">
				<strong>${item.name}</strong> has been removed from your cart as it's no longer available.
			</p>
			<button class="removed-item-close" data-action="dismiss-removed" data-slug="${item.slug}" aria-label="Dismiss message">&times;</button>
		</div>
	`;
}

// HELPER FUNCS
// Opens the cart popover and backdrop. Closes QuickView modal if open.
function openCartPopover() {
	const quickViewModal = document.getElementById("quick-view-modal");
	if (quickViewModal && quickViewModal.open) {
		quickViewModal.close();
	}
	const popover = document.getElementById("cart-popover");
	const backdrop = document.getElementById("cart-backdrop");
	if (popover && backdrop) {
		popover.setAttribute("data-visible", "true");
		backdrop.setAttribute("data-visible", "true");
		document.body.style.overflow = "hidden";

		// Validate cart products on first open
		validateCartProducts();
	}
}

// Closes the cart popover and backdrop.
function closeCartPopover() {
	const popover = document.getElementById("cart-popover");
	const backdrop = document.getElementById("cart-backdrop");

	if (popover && backdrop) {
		popover.setAttribute("data-visible", "false");
		backdrop.setAttribute("data-visible", "false");
		document.body.style.overflow = "";
	}
}

let isCartInitiallyRendered = false;

// Generate the HTML string for single cart item.
function createCartItemHTML(item) {
	const variantHtml = (item.variantDisplay || [])
		.map((v) => `<p class="cart-item-variant">${v}</p>`)
		.join("");
	const decreaseDisabled = item.quantity <= 1 ? " disabled" : "";
	const increaseDisabled = item.quantity >= item.maxQuantity ? " disabled" : "";
	const productUrl = `/products/${item.slug}`;

	return `
		<div class="cart-item" data-item-key="${item.key}">
			<a href="${productUrl}" class="cart-item-image-link">
				<div class="cart-item-image">
					<img src="${item.image}" alt="${item.name}" loading="lazy" />
				</div>
			</a>
			<div class="cart-item-info">
				<a href="${productUrl}" class="cart-item-name-link"><p class="cart-item-name">${item.name}</p></a>
				${variantHtml}
				<p class="cart-item-price">${formatPrice(item.displayPrice)}</p>
			</div>
			<div class="cart-item-controls">
				<div class="qty-controls">
          <button class="qty-btn" data-action="decrease" data-item-key="${item.key}"${decreaseDisabled}><svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 -12 32 32"><path fill="currentColor" fill-rule="evenodd" d="M28 0H4C1.791 0 0 1.79 0 4s1.791 4 4 4h24c2.209 0 4-1.79 4-4s-1.791-4-4-4"/></svg></button> 
					<span class="qty-value">${item.quantity}</span>
					<button class="qty-btn" data-action="increase" data-item-key="${item.key}"${increaseDisabled}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="currentColor" fill-rule="evenodd" d="M28 12h-8V4c0-2.21-1.791-4-4-4s-4 1.79-4 4v8H4c-2.209 0-4 1.79-4 4s1.791 4 4 4h8v8c0 2.21 1.791 4 4 4s4-1.79 4-4v-8h8c2.209 0 4-1.79 4-4s-1.791-4-4-4"/></svg></button>
				</div>
				<button class="remove-btn" data-action="remove" data-item-key="${item.key}">Remove</button>
			</div>
		</div>
	`;
}

// Updates only the quantity displays and button states for existing cart items.
function updateCartItemsQuantities(items) {
	items.forEach((item) => {
		const itemEl = document.querySelector(`[data-item-key="${item.key}"]`);
		if (!itemEl) return;

		// Update quantity text
		const qtyValue = itemEl.querySelector(".qty-value");
		if (qtyValue) {
			qtyValue.textContent = item.quantity;
		}

		// Update inc/dec button disabled state
		const decreaseBtn = itemEl.querySelector('[data-action="decrease"]');
		if (decreaseBtn) {
			if (item.quantity <= 1) {
				decreaseBtn.setAttribute("disabled", "");
			} else {
				decreaseBtn.removeAttribute("disabled");
			}
		}
		const increaseBtn = itemEl.querySelector('[data-action="increase"]');
		if (increaseBtn) {
			if (item.quantity >= item.maxQuantity) {
				increaseBtn.setAttribute("disabled", "");
			} else {
				increaseBtn.removeAttribute("disabled");
			}
		}
	});
}

// RENDERING FUNCS
// Render cart popover with current cart items
function renderCartPopover() {
	const cartItemsEl = document.getElementById("cart-items");
	const subtotalEl = document.getElementById("cart-subtotal-amount");
	const checkoutBtn = document.getElementById("cart-checkout-btn");

	if (!cartItemsEl) return;

	const items = $cartItems.get();
	const removedItems = $removedItems.get();

	// Handle Empty State
	if (items.length === 0 && removedItems.length === 0) {
		cartItemsEl.innerHTML = `
			<div class="cart-empty">
				<p>Your cart is empty</p>
				<a href="/shop/" class="button">Go to Shop</a>
			</div>
		`;
		if (subtotalEl) subtotalEl.textContent = formatPrice(0);
		if (checkoutBtn) checkoutBtn.setAttribute("aria-disabled", "true");
		isCartInitiallyRendered = false;
		return;
	}

	// Calculate if we need a full DOM replacement
	const currentDisplayedItems =
		cartItemsEl.querySelectorAll(".cart-item").length;
	const currentDisplayedMessages =
		cartItemsEl.querySelectorAll(".cart-item-removed").length;

	// If the amount of products OR the amount of messages changes, we re-render the HTML.
	const needsFullRender =
		!isCartInitiallyRendered ||
		currentDisplayedItems !== items.length ||
		currentDisplayedMessages !== removedItems.length;

	if (needsFullRender) {
		const messagesHTML = removedItems
			.map(createRemovedItemMessageHTML)
			.join("");
		const itemsHTML = items.map(createCartItemHTML).join("");

		cartItemsEl.innerHTML = messagesHTML + itemsHTML;
		isCartInitiallyRendered = true;
	} else {
		// Only quantities changed, run the fast update
		updateCartItemsQuantities(items);
	}
	if (checkoutBtn) checkoutBtn.removeAttribute("aria-disabled");
}

// Update the subtotal display.
function updateSubtotalDisplay(subtotal) {
	const subtotalEl = document.getElementById("cart-subtotal-amount");
	if (subtotalEl) {
		subtotalEl.textContent = formatPrice(subtotal);
	}
}

// Update the cart badge count.
function updateCartBadge(count) {
	const badge = document.getElementById("cart-badge");
	if (badge) {
		badge.textContent = count > 0 ? count : "";
		badge.style.display = count > 0 ? "flex" : "none";
	}
}

// Toggle FAB visibility from per-page mode on <body data-fab-mode>.
function syncCartFabVisibility() {
	const fab = document.getElementById("cart-button");
	if (!fab) return;
	const mode = document.body?.dataset.fabMode ?? "default";
	if (mode === "auto") fab.classList.toggle("is-hidden", $cartCount.get() === 0);
	else if (mode === "hidden") fab.classList.add("is-hidden");
	else fab.classList.remove("is-hidden");
}

// CART POPOVER SET GLOBAL EVENT HANDLERS
function handleGlobalClicks(event) {
	// Handle closing the popover
	if (
		event.target.closest("#cart-close") ||
		event.target.closest("#cart-backdrop")
	) {
		closeCartPopover();
		return;
	}

	// Handle dismiss removed item message
	if (event.target.closest('[data-action="dismiss-removed"]')) {
		const dismissBtn = event.target.closest('[data-action="dismiss-removed"]');
		const slug = dismissBtn.dataset.slug;
		if (slug) {
			dismissRemovedItem(slug);
		}
		return;
	}

	// Handle Cart Item Quantity/Remove Actions
	const actionBtn = event.target.closest("[data-action]");
	if (!actionBtn || !event.target.closest("#cart-popover")) return;
	const action = actionBtn.dataset.action;
	const itemKey = actionBtn.dataset.itemKey;
	if (!itemKey) return;

	const items = $cartItems.get();
	const item = items.find((i) => i.key === itemKey);

	if (!item) return;

	switch (action) {
		case "increase":
			updateQuantity(itemKey, item.quantity + 1);
			break;
		case "decrease":
			if (item.quantity > 1) {
				updateQuantity(itemKey, item.quantity - 1);
			} else {
				removeFromCart(itemKey);
			}
			break;
		case "remove":
			removeFromCart(itemKey);
			break;
	}
}

// INIT GLOBAL EVENT LISTENERS
document.addEventListener("click", handleGlobalClicks);

// Subscribe to cart stores to trigger UI updates automatically
$cartItems.subscribe(() => {
	renderCartPopover();
});

$cartSubtotal.subscribe((subtotal) => {
	updateSubtotalDisplay(subtotal);
});

$cartCount.subscribe((count) => {
	updateCartBadge(count);
	syncCartFabVisibility();
});

$removedItems.subscribe(() => {
	renderCartPopover();
});

// RE-RENDER CART ITEMS ON ASTRO PAGE LOAD
document.addEventListener("astro:page-load", () => {
	isCartInitiallyRendered = false;
	renderCartPopover();
	updateSubtotalDisplay($cartSubtotal.get());
	updateCartBadge($cartCount.get());
	syncCartFabVisibility();
});

// GLOBAL EXPORTS
// Expose openCartPopover globally for CartButton FAB
window.openCartPopover = openCartPopover;
