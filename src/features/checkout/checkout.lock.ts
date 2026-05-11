import type { AcquireLockResult, IdempotencyLock } from "./checkout.model.ts";

const LOCK_TTL_SECONDS = 300;

export function stableStringify(obj: unknown): string {
	if (obj === null || typeof obj !== "object") {
		return JSON.stringify(obj);
	}
	if (obj instanceof Date) {
		return JSON.stringify(obj.toISOString());
	}
	if (Array.isArray(obj)) {
		return (
			"[" +
			obj
				.map((item) => (item === undefined ? "null" : stableStringify(item)))
				.join(",") +
			"]"
		);
	}

	const sortedKeys = Object.keys(obj).sort();
	const pairs = sortedKeys
		.filter((key) => (obj as Record<string, unknown>)[key] !== undefined)
		.map((key) => {
			const value = (obj as Record<string, unknown>)[key];
			return JSON.stringify(key) + ":" + stableStringify(value);
		});
	return "{" + pairs.join(",") + "}";
}

export async function generateHash(
	payload: unknown,
	clientIp: string,
): Promise<string> {
	const dataToHash = stableStringify({ payload, clientIp });
	const encoder = new TextEncoder();
	const data = encoder.encode(dataToHash);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function acquireCheckoutLock(params: {
	payload: unknown;
	clientIp: string;
	kvNamespace: KVNamespace;
}): Promise<AcquireLockResult> {
	const { payload, clientIp, kvNamespace } = params;
	const lockKey = await generateHash(payload, clientIp);
	const existing = await kvNamespace.get<IdempotencyLock>(lockKey, "json");

	if (existing) {
		if (existing.status === "completed" && existing.checkoutUrl) {
			return {
				status: "completed",
				checkoutUrl: existing.checkoutUrl,
				transactionId: existing.transactionId,
			};
		}
		if (existing.status === "processing") {
			return { status: "processing" };
		}
	}

	const lockData: IdempotencyLock = {
		status: "processing",
		createdAt: Date.now(),
	};
	await kvNamespace.put(lockKey, JSON.stringify(lockData), {
		expirationTtl: LOCK_TTL_SECONDS,
	});

	return { status: "acquired", lockKey };
}

export async function completeCheckoutLock(
	lockKey: string,
	checkoutUrl: string,
	kvNamespace: KVNamespace,
	metadata?: {
		transactionId: string;
		providerOrderId: string;
	},
): Promise<void> {
	const lockData: IdempotencyLock = {
		status: "completed",
		checkoutUrl,
		transactionId: metadata?.transactionId,
		providerOrderId: metadata?.providerOrderId,
		createdAt: Date.now(),
	};

	await kvNamespace.put(lockKey, JSON.stringify(lockData), {
		expirationTtl: LOCK_TTL_SECONDS,
	});
}

export async function releaseCheckoutLock(
	lockKey: string,
	kvNamespace: KVNamespace,
): Promise<void> {
	await kvNamespace.delete(lockKey);
}
