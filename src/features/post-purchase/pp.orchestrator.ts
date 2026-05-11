import { logger } from "@log-alert/logger";
import { MakePostPurchaseAdapter } from "./channels/pp-make.adapter.ts";
import { GenericPostPurchaseAdapter } from "./channels/pp-generic.adapter.ts";
import { BackendPostPurchaseAdapter } from "./channels/pp-backend.adapter.ts";
import type {
	PostPurchaseChannel,
	PostPurchasePayload,
} from "./pp.model.ts";
import type {
	NormalizedOneTimeOrder,
	NormalizedSubscriptionEvent,
} from "@payment-gateways/gateway.model.ts";
import type { OrderRow } from "@db/db.utils.ts";

// Re-export payload type for consumers
export type { PostPurchasePayload } from "./pp.model.ts";

// ---- Channel registry ----
// Add new adapters here. Each self-activates via its own env var.
const channels: PostPurchaseChannel[] = [
	new MakePostPurchaseAdapter(),
	new GenericPostPurchaseAdapter(),
	new BackendPostPurchaseAdapter(),
];

function getActiveChannels(): PostPurchaseChannel[] {
	return channels.filter((c) => c.isConfigured());
}

// Build payload from normalized order + DB row.
// Abstracts duplicated JSON.parse + spread pattern from webhook handlers.
export function buildPostPurchasePayload(
	eventType: string,
	gateway: NormalizedOneTimeOrder | NormalizedSubscriptionEvent,
	dbOrder: OrderRow,
): PostPurchasePayload {
	const checkoutPayload = JSON.parse(dbOrder.checkout_payload);
	const cartState = JSON.parse(dbOrder.cart_state);

	return {
		eventType,
		gateway,
		database: {
			...dbOrder,
			checkout_payload: checkoutPayload,
			cart_state: cartState,
		},
	};
}

// Fan-out to all configured post-purchase channels (parallel, independent)
export async function triggerPostPurchaseWorkflows(
	payload: PostPurchasePayload,
): Promise<void> {
	const active = getActiveChannels();
	if (active.length === 0) {
		logger.warn(
			{ component: "PostPurchase" },
			"No post-purchase channels configured",
		);
		return;
	}

	const results = await Promise.allSettled(
		active.map((channel) => channel.send(payload)),
	);

	// Log any channel failures (each channel already fired its own alert)
	for (let i = 0; i < results.length; i++) {
		const result = results[i];
		if (result.status === "rejected") {
			logger.critical(
				{ component: "PostPurchase" },
				`[${active[i].name}] failed: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
			);
		}
	}
}
