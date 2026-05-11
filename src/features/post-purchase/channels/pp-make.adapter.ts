// Make.com post-purchase adapter
import { MAKE_WEBHOOK_URL, MAKE_WEBHOOK_API_KEY } from "astro:env/server";
import { alert } from "@log-alert/alert";
import { logger } from "@log-alert/logger";
import type { PostPurchaseChannel, PostPurchasePayload } from "../pp.model.ts";

const maxRetries = 3;

export class MakePostPurchaseAdapter implements PostPurchaseChannel {
	readonly name = "make";

	isConfigured(): boolean {
		return Boolean(MAKE_WEBHOOK_URL) && Boolean(MAKE_WEBHOOK_API_KEY);
	}

	async send(payload: PostPurchasePayload): Promise<void> {
		const url = MAKE_WEBHOOK_URL;
		const apiKey = MAKE_WEBHOOK_API_KEY;
		if (!url || !apiKey)
			throw new Error("MAKE_WEBHOOK_URL or MAKE_WEBHOOK_API_KEY not configured");

		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const response = await fetch(url, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-make-apikey": apiKey,
					},
					body: JSON.stringify(payload),
				});

				if (response.ok) {
					logger.info(
						{ component: "PostPurchase" },
						`[make] success on attempt ${attempt}`,
					);
					return;
				}

				if (attempt === maxRetries) {
					throw new Error(
						`Failed after ${maxRetries} attempts: ${response.status}`,
					);
				}
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				if (attempt < maxRetries) {
					await new Promise((resolve) =>
						setTimeout(resolve, 1000 * attempt),
					);
				}
			}
		}

		// All retries exhausted
		await alert(
			{
				component: "PostPurchase",
				operation: "send-make",
				context: {
					eventType: payload.eventType,
					orderId: payload.database.order_id as string | undefined,
				},
			},
			`[make] failed after ${maxRetries} attempts`,
			lastError ?? new Error("Unknown error"),
		);

		throw lastError ?? new Error("Unknown error");
	}
}
