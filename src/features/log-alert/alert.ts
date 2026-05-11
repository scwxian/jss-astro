import { env } from "cloudflare:workers";
import { logger } from "@log-alert/logger";
import { type NotifyPayload, notifyTeam } from "@log-alert/notify-team";

interface AlertConfig {
	component: string;
	operation: string;
	context?: NotifyPayload["context"];
}
interface RateLimitConfig extends AlertConfig {
	threshold: number; // Alert after N occurrences
	windowMs: number; // Within this time window
}

// Log critical error + notify team. For production alerts only.
export async function alert(
	config: AlertConfig,
	message: string,
	error: Error | string,
): Promise<void> {
	logger.critical({ component: config.component }, message, error);

	await notifyTeam({
		severity: "critical",
		component: config.component,
		operation: config.operation,
		error,
		context: config.context,
	});
}

// Alert with rate limiting. Only notifies team after threshold reached.
export async function alertWithRateLimit(
	config: RateLimitConfig,
	message: string,
	error: Error | string,
): Promise<void> {
	logger.error({ component: config.component }, message, error);

	const shouldNotify = await checkRateLimit(config);
	if (shouldNotify) {
		await notifyTeam({
			severity: "critical",
			component: config.component,
			operation: config.operation,
			error,
			context: config.context,
		});
	}
}

async function checkRateLimit(config: RateLimitConfig): Promise<boolean> {
	const kv = env.NOTIFY_DEDUP_KV;
	if (!kv) {
		// No KV configured - always alert
		return true;
	}

	const bucket = getTimeBucket(config.windowMs);
	const key = `ratelimit:${config.component}:${config.operation}:${bucket}`;

	const current = await kv.get(key);
	const count = current ? Number.parseInt(current, 10) + 1 : 1;

	await kv.put(key, count.toString(), {
		expirationTtl: Math.floor(config.windowMs / 1000),
	});

	return count === config.threshold;
}

// Get time bucket string based on window size.
function getTimeBucket(windowMs: number): string {
	const now = Date.now();
	const bucketSizeMs = windowMs;
	const bucket = Math.floor(now / bucketSizeMs);
	return bucket.toString();
}
