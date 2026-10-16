import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { env } from "cloudflare:workers";
import { getOrderById } from "@db/db.utils.ts";

// Lightweight polling action — returns order status only.
// Used by the success page to detect webhook completion.
export const getOrderStatus = defineAction({
	accept: "json",
	input: z.object({
		transactionId: z.uuid(),
	}),
	handler: async ({ transactionId }) => {
		const db = env.DB;
		if (!db) {
			throw new Error("Database binding missing");
		}

		const order = await getOrderById(db, transactionId);
		if (!order) {
			return { status: "not_found" as const };
		}

		return { status: order.status };
	},
});