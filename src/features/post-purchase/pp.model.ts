import type { OrderRow } from "@db/db.utils.ts";
import type {
	NormalizedOneTimeOrder,
	NormalizedSubscriptionEvent,
} from "@payment-gateways/gateway.model.ts";

export interface PostPurchasePayload {
	eventType: string;
	gateway: NormalizedOneTimeOrder | NormalizedSubscriptionEvent;
	database: OrderRow & {
		checkout_payload: unknown;
		cart_state: unknown;
	};
}

export interface PostPurchaseChannel {
	readonly name: string;
	send(payload: PostPurchasePayload): Promise<void>;
	isConfigured(): boolean;
}
