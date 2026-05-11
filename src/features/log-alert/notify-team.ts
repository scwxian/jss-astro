import { env } from "cloudflare:workers";
import { logger } from "@log-alert/logger";
import { GasNotifyAdapter } from "./channels/notify-gas.adapter.ts";
import { SlackNotifyAdapter } from "./channels/notify-slack.adapter.ts";
import { GenericNotifyAdapter } from "./channels/notify-generic.adapter.ts";
import type { NotifyChannel } from "./notify-channel.model.ts";

// Team recipients — update in production
// (Used by email-based adapters — kept here as template reference)
export const teamEmails = ["admin@example.com"];

// Dedup: same error within this window skips notification per channel
const dedupTtlMs = 5 * 60 * 1000; // 5 minutes
const maxRetries = 1;

// Severity levels for team notifications
export type Severity = "critical" | "warning" | "info";

// Payload for notification
export interface NotifyPayload {
	severity: Severity;
	component: string;
	operation: string;
	error: Error | string;
	context?: {
		eventType?: string;
		requestId?: string;
		userId?: string;
		orderId?: string;
		transactionId?: string;
		cartState?: unknown;
		metadata?: Record<string, unknown>;
	};
}

// ---- Channel registry ----
// Add new adapters here to enable additional notification channels.
// Each adapter self-checks isConfigured() via its own env var.
const channels: NotifyChannel[] = [
	new GasNotifyAdapter(),
	new SlackNotifyAdapter(),
	new GenericNotifyAdapter(),
];

function getActiveChannels(): NotifyChannel[] {
	return channels.filter((c) => c.isConfigured());
}

// Check if running in production
function isProduction(): boolean {
	return Boolean(env.SITE_URL);
}

// Generate hash for error deduplication
async function hashError(
	component: string,
	operation: string,
	error: Error | string,
): Promise<string> {
	const errorMessage = error instanceof Error ? error.message : error;
	const data = `${component}:${operation}:${errorMessage}`;
	const encoder = new TextEncoder();
	const buffer = encoder.encode(data);
	const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Per-channel dedup: check if this channel already sent this error
async function shouldSkipChannel(
	channelName: string,
	dedupKey: string,
): Promise<boolean> {
	const kv = env.NOTIFY_DEDUP_KV;
	if (!kv) {
		logger.warn(
			{ component: "notify-team" },
			"NOTIFY_DEDUP_KV not configured",
		);
		return false;
	}

	const existing = await kv.get(dedupKey);
	return existing !== null;
}

// Store dedup marker after successful delivery
async function markChannelSent(
	channelName: string,
	dedupKey: string,
): Promise<void> {
	const kv = env.NOTIFY_DEDUP_KV;
	if (!kv) return;

	await kv.put(dedupKey, Date.now().toString(), {
		expirationTtl: Math.floor(dedupTtlMs / 1000),
	});
}

// Send to a single channel with per-channel dedup + retries
async function sendWithRetry(
	channel: NotifyChannel,
	payload: NotifyPayload,
): Promise<void> {
	const errorHash = await hashError(
		payload.component,
		payload.operation,
		payload.error,
	);
	const dedupKey = `notify:${channel.name}:${payload.component}:${payload.operation}:${errorHash}`;

	// Skip if this channel already successfully delivered this error
	if (await shouldSkipChannel(channel.name, dedupKey)) {
		logger.info(
			{ component: "notify-team" },
			`[${channel.name}] skipping — already notified within dedup window`,
		);
		return;
	}

	let lastError: Error | null = null;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			await channel.send(payload);
			// Store dedup only after successful delivery
			await markChannelSent(channel.name, dedupKey);
			logger.info(
				{ component: "notify-team" },
				`[${channel.name}] sent: ${payload.component}.${payload.operation}`,
			);
			return;
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			logger.error(
				{ component: "notify-team" },
				`[${channel.name}] attempt ${attempt + 1} failed: ${lastError.message}`,
			);

			if (attempt < maxRetries) {
				await new Promise((resolve) =>
					setTimeout(resolve, 1000 * (attempt + 1)),
				);
			}
		}
	}

	// All retries exhausted, no dedup stored → next call will retry this channel
	throw lastError ?? new Error("Unknown error");
}

// Main function — fans out to all configured channels (parallel, independent dedup)
export async function notifyTeam(payload: NotifyPayload): Promise<void> {
	// Only run in production
	if (!isProduction()) {
		logger.info(
			{ component: "notify-team" },
			"Skipping - not in production",
		);
		return;
	}

	const active = getActiveChannels();
	if (active.length === 0) {
		logger.warn(
			{ component: "notify-team" },
			"No notification channels configured",
		);
		return;
	}

	// Fan-out to all channels in parallel — each handles its own dedup + retry
	const results = await Promise.allSettled(
		active.map((channel) => sendWithRetry(channel, payload)),
	);

	// Log any channel failures
	for (let i = 0; i < results.length; i++) {
		const result = results[i];
		if (result.status === "rejected") {
			logger.critical(
				{ component: "notify-team" },
				`[${active[i].name}] exhausted retries: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
			);
		}
	}
}
