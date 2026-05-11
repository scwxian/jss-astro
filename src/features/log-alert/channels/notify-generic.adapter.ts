// Generic webhook notification adapter — configure NOTIFY_GENERIC_WEBHOOK_URL to enable
import { NOTIFY_GENERIC_WEBHOOK_URL } from "astro:env/server";
import type { NotifyChannel } from "../notify-channel.model.ts";
import type { NotifyPayload } from "../notify-team.ts";

export class GenericNotifyAdapter implements NotifyChannel {
	readonly name = "generic";

	isConfigured(): boolean {
		return Boolean(NOTIFY_GENERIC_WEBHOOK_URL);
	}

	async send(payload: NotifyPayload): Promise<void> {
		const url = NOTIFY_GENERIC_WEBHOOK_URL;
		if (!url) throw new Error("NOTIFY_GENERIC_WEBHOOK_URL not configured");

		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				severity: payload.severity,
				component: payload.component,
				operation: payload.operation,
				error:
					payload.error instanceof Error
						? payload.error.message
						: payload.error,
				timestamp: new Date().toISOString(),
				context: payload.context || {},
			}),
		});

		if (!response.ok) {
			throw new Error(
				`Generic webhook failed: ${response.status} ${response.statusText}`,
			);
		}
	}
}
