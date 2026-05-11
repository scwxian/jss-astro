import type {
	CartItem,
	CartItemInput,
	NonPriceVariantSelection,
	PriceVariantSelection,
} from "@cart/cart.model.ts";
import { logger } from "@log-alert/logger";
import { persistentMap } from "@nanostores/persistent";
import { atom, computed } from "nanostores";
export { formatPrice } from "@scripts/utils.js";

export type RemovedItem = {
	name: string;
	slug: string;
};

// Re-export types for convenience
export type {
	CartItem,
	CartItemInput,
	NonPriceVariantSelection,
	PriceVariantSelection,
} from "@cart/cart.model.ts";

// REMOVE BROKEN ITEMS FROM CART FEATURE
const initialRemovedItems: RemovedItem[] =
	typeof window !== "undefined"
		? JSON.parse(sessionStorage.getItem("cart-removed-items") || "[]")
		: [];

export const $removedItems = atom<RemovedItem[]>(initialRemovedItems);

if (typeof window !== "undefined") {
	$removedItems.listen((items) => {
		sessionStorage.setItem("cart-removed-items", JSON.stringify(items));
	});
}

export function addRemovedItem(item: RemovedItem): void {
	const current = $removedItems.get();
	if (!current.some((i) => i.slug === item.slug)) {
		$removedItems.set([...current, item]);
	}
}

export function dismissRemovedItem(slug: string): void {
	const current = $removedItems.get();
	$removedItems.set(current.filter((item) => item.slug !== slug));
}

// UTILITY FUNCTIONS
// Generates a unique cart item key from masterSku and variant selections.
function generateItemKey(
	masterSku: string,
	priceVariants: PriceVariantSelection[],
	nonPriceVariants: NonPriceVariantSelection[],
): string {
	const formatKey = <T>(variants: T[], mapper: (v: T) => string) =>
		variants.map(mapper).sort().join("|");
	const priceKey = formatKey(
		priceVariants,
		(v) => `${v.groupName}:${v.variantName}`,
	);
	const nonPriceKey = formatKey(
		nonPriceVariants,
		(v) => `${v.groupName}:${v.choiceName}`,
	);
	return `${masterSku}||${priceKey}||${nonPriceKey}`;
}

// Builds variant display array strings for separate p tag rendering.
function buildVariantDisplay(
	priceVariants: PriceVariantSelection[],
	nonPriceVariants: NonPriceVariantSelection[],
): string[] {
	return [
		...priceVariants.map((v) => v.variantName),
		...nonPriceVariants.map((v) => v.choiceName),
	];
}

// CORE STORES
const CART_STORAGE_VERSION = "v1";

// Primary cart store using persistentMap for localStorage persistence.
export const $cart = persistentMap<Record<string, CartItem>>(
	`cart:${CART_STORAGE_VERSION}:`,
	{},
	{
		encode: JSON.stringify,
		decode: (value) => {
			try {
				return JSON.parse(value);
			} catch (e) {
				// Catches parsing errors if old corrupted data is still floating around
				logger.error({ component: "Cart" }, "Failed to parse cart item:", value);
				return undefined;
			}
		},
	},
);

// Cart Computes
export const $cartItems = computed($cart, (cart) => Object.values(cart));
export const $cartCount = computed($cart, (cart) =>
	Object.values(cart).reduce((count, item) => count + item.quantity, 0),
);
export const $cartSubtotal = computed($cart, (cart) =>
	Object.values(cart).reduce(
		(total, item) => total + item.displayPrice * item.quantity,
		0,
	),
);

// CART ACTIONS
// Adds an item to the cart or increments quantity if it already exists (respecting max limit).
export function addToCart(input: CartItemInput): void {
	const key = generateItemKey(
		input.masterSku,
		input.priceVariants,
		input.nonPriceVariants,
	);
	const cart = $cart.get();
	if (cart[key]) {
		const newQuantity = Math.min(
			cart[key].quantity + (input.quantity || 1),
			cart[key].maxQuantity,
		);
		$cart.setKey(key, {
			...cart[key],
			quantity: newQuantity,
		});
		return;
	}
	$cart.setKey(key, {
		...input,
		key,
		slug: input.slug,
		variantDisplay: buildVariantDisplay(
			input.priceVariants,
			input.nonPriceVariants,
		),
	});
}

// Removes an item from the cart by its unique key.
export function removeFromCart(itemKey: string): void {
	const currentCart = $cart.get();
	if (currentCart[itemKey]) {
		const { [itemKey]: removed, ...remainingCart } = currentCart;
		$cart.set(remainingCart);
	}
}

// Updates the quantity of a cart item (clamped between 1 and maxQuantity).
export function updateQuantity(itemKey: string, quantity: number): void {
	const cart = $cart.get();
	if (!cart[itemKey]) return;
	const item = cart[itemKey];
	const clampedQuantity = Math.min(Math.max(1, quantity), item.maxQuantity);

	$cart.setKey(itemKey, {
		...item,
		quantity: clampedQuantity,
	});
}

export function clearCart(): void {
	const keepAwake = $cart.listen(() => {});
	$cart.set({});
	keepAwake();
}
export function getCartItem(itemKey: string): CartItem | undefined {
	return $cart.get()[itemKey];
}

// MIGRATION & CLEANUP
// Cleans up old cart data from localStorage to prevent conflicts.
function cleanupOldCartData(): void {
	if (typeof window === "undefined") return;

	Object.keys(localStorage)
		.filter(
			(key) =>
				key.startsWith("cart:") && !key.includes(`:${CART_STORAGE_VERSION}:`),
		)
		.forEach((key) => localStorage.removeItem(key));
}

cleanupOldCartData();
