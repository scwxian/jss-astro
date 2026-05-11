// Slack webhook notification adapter — configure NOTIFY_SLACK_WEBHOOK_URL to enable
import { NOTIFY_SLACK_WEBHOOK_URL } from "astro:env/server";
import type { NotifyChannel } from "../notify-channel.model.ts";
import type { NotifyPayload } from "../notify-team.ts";

export class SlackNotifyAdapter implements NotifyChannel {
	readonly name = "slack";

	isConfigured(): boolean {
		return Boolean(NOTIFY_SLACK_WEBHOOK_URL);
	}

	async send(payload: NotifyPayload): Promise<void> {
		const url = NOTIFY_SLACK_WEBHOOK_URL;
		if (!url) throw new Error("NOTIFY_SLACK_WEBHOOK_URL not configured");

		const errorMsg =
			payload.error instanceof Error ? payload.error.message : payload.error;
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				text: `[${payload.severity.toUpperCase()}] ${payload.component}.${payload.operation}: ${errorMsg}`,
			}),
		});

		if (!response.ok) {
			throw new Error(
				`Slack webhook failed: ${response.status} ${response.statusText}`,
			);
		}
	}
}
