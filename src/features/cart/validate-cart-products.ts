/**
 * Cart Product Validation Action
 *
 * Validates cart items against the product content collection.
 * Returns a list of invalid items that should be removed from the cart.
 *
 * This action is called from the client-side cart-init.js when the cart
 * popover is first opened to ensure users don't see broken/missing products.
 */

import { defineAction } from "astro:actions";
import { getEntry } from "astro:content";
import { logger } from "@log-alert/logger";
import { z } from "astro/zod";

const CartItemSchema = z.object({
	slug: z.string(),
	name: z.string(),
	key: z.string(),
});

/**
 * Validates cart products by checking if each product slug exists in the content collection.
 * @param items - Array of cart items to validate
 * @returns Object containing array of invalid items
 */
export const validateCartProducts = defineAction({
	accept: "json",
	input: z.object({
		items: z.array(CartItemSchema),
	}),

	handler: async ({ items }) => {
		const validationPromises = items.map(async (item) => {
			try {
				const product = await getEntry("products", item.slug);
				if (
					!product ||
					["draft", "out-of-stock"].includes(product.data.status)
				) {
					return item;
				}
				return null;
			} catch (error) {
				logger.error({ component: "CartValidation" }, `Error validating product ${item.slug}:`, error);
				return item;
			}
		});

		const results = await Promise.all(validationPromises);

		const invalidItems = results.filter(
			(item): item is NonNullable<typeof item> => item !== null,
		);

		return { invalidItems };
	},
});
