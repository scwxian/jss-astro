// Generic webhook post-purchase adapter — configure POST_PURCHASE_GENERIC_URL to enable
import { POST_PURCHASE_GENERIC_URL } from "astro:env/server";
import { alert } from "@log-alert/alert";
import { logger } from "@log-alert/logger";
import type { PostPurchaseChannel, PostPurchasePayload } from "../pp.model.ts";

const maxRetries = 3;

export class GenericPostPurchaseAdapter implements PostPurchaseChannel {
	readonly name = "generic";

	isConfigured(): boolean {
		return Boolean(POST_PURCHASE_GENERIC_URL);
	}

	async send(payload: PostPurchasePayload): Promise<void> {
		const url = POST_PURCHASE_GENERIC_URL;
		if (!url) throw new Error("POST_PURCHASE_GENERIC_URL not configured");

		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const response = await fetch(url, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				});

				if (response.ok) {
					logger.info(
						{ component: "PostPurchase" },
						`[generic] success on attempt ${attempt}`,
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

		await alert(
			{
				component: "PostPurchase",
				operation: "send-generic",
				context: {
					eventType: payload.eventType,
					orderId: payload.database.order_id as string | undefined,
				},
			},
			`[generic] failed after ${maxRetries} attempts`,
			lastError ?? new Error("Unknown error"),
		);

		throw lastError ?? new Error("Unknown error");
	}
}
