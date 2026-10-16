import { defineAction } from "astro:actions";
import { getEntry } from "astro:content";
import { logger } from "@log-alert/logger";
import { z } from "astro/zod";
import type { LiveStockResult } from "./ls.model.ts";
import { getLiveStockProvider } from "./ls.orchestrator.ts";

export const checkLiveStock = defineAction({
	accept: "json",
	input: z.object({ slug: z.string() }),

	handler: async ({ slug }): Promise<LiveStockResult> => {
		const product = await getEntry("products", slug);
		if (
			!product ||
			product.data.type !== "physical" ||
			product.data.stockCheckRequired !== true ||
			product.data.status !== "active"
		) {
			return { status: "skipped" };
		}

		try {
			const quantity = await getLiveStockProvider().getQuantityBySlug(slug);

			if (quantity === null) return { status: "unavailable" };
			if (quantity <= 0) {
				return product.data.stockFallbackStatus === "pre-order"
					? { status: "pre_order" }
					: { status: "out_of_stock" };
			}

			const max = product.data.maxQuantity ?? 10;
			return { status: "in_stock", quantity: Math.min(quantity, max) };
		} catch (error) {
			logger.error({ component: "LiveStock" }, "Check failed:", error);
			return { status: "unavailable" };
		}
	},
});
