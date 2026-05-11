import { alert } from "@log-alert/alert";
import { logger } from "@log-alert/logger";

export interface OrderRow {
	id: string;
	order_id: string;
	customer_email: string;
	status: string;
	fulfillment_status: string | null;
	type: string;
	total_amount: number;
	checkout_payload: string;
	cart_state: string;
	subscription_id: string | null;
	subscription_status: string | null;
	provider_order_id: string | null;
	expires_at: number;
	order_tracking_id: string | null;
	user_tracking_id: string | null;
	created_at: number;
	updated_at: number;
}

export interface InsertPendingOrderParams {
	db: D1Database;
	id: string; // transactionId
	orderId: string;
	email: string;
	type: "one_time" | "subscription";
	totalAmount: number; // Integer cents
	payloadJson: string; // Pre-stringified CheckoutPayload
	stateJson: string; // Pre-stringified CartState or Subscription Metadata
	providerOrderId?: string | null;
	expiresInHours?: number;
}

// INSERT a pending order into D1.
// ⚠️ This is a blocking call. Throws an error if insertion fails to prevent ghost orders.
export async function insertPendingOrder(
	params: InsertPendingOrderParams,
): Promise<void> {
	const {
		db,
		id,
		orderId,
		email,
		type,
		totalAmount,
		payloadJson,
		stateJson,
		providerOrderId,
		expiresInHours = 24,
	} = params;

	const expiresAt = Math.floor(Date.now() / 1000) + expiresInHours * 60 * 60;

	const stmt = db.prepare(`
		INSERT INTO orders (
			id, order_id, customer_email, status, type, total_amount,
			checkout_payload, cart_state, provider_order_id, expires_at,
			order_tracking_id, user_tracking_id
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`);

	await stmt
		.bind(
			id,
			orderId,
			email,
			"pending",
			type,
			totalAmount,
			payloadJson,
			stateJson,
			providerOrderId ?? null,
			expiresAt,
			null,
			null,
		)
		.run();

	logger.info(
		{ component: "DB" },
		`Successfully saved pending ${type} order: ${id}`,
	);
}

// --- Order Update & Lookup ---
export interface UpdateOrderParams {
	db: D1Database;
	id?: string; // transactionId (UUIDv4) — use for client-side lookups
	orderId?: string; // Human-readable order ID — use for webhook/provider lookups
	status?: string;
	fulfillmentStatus?: string;
	subscriptionId?: string;
	subscriptionStatus?: string;
	providerOrderId?: string;
	requirePendingStatus?: boolean; // Atomic lock for pending orders
	requireNonCancelledSubscription?: boolean; // atomic lock for subscription cancellations
}

// UPDATE an order in D1 and return the full row if successful.
// Provide exactly one of `id` (transactionId) or `orderId` for lookup.
// Returns the updated OrderRow, or null if no row was updated/found.
export async function updateOrder(
	params: UpdateOrderParams,
): Promise<OrderRow | null> {
	const {
		db,
		id,
		orderId,
		status,
		fulfillmentStatus,
		subscriptionId,
		subscriptionStatus,
		providerOrderId,
		requirePendingStatus,
		requireNonCancelledSubscription,
	} = params;

	const whereColumn = id
		? "id"
		: orderId
			? "order_id"
			: subscriptionId
				? "subscription_id"
				: null;
	const lookupValue = id || orderId || subscriptionId;
	if (!whereColumn || !lookupValue) {
		throw new Error(
			"updateOrder: provide id, orderId, or subscriptionId for lookup",
		);
	}

	const setClauses: string[] = [
		"updated_at = CAST(strftime('%s', 'now') AS INTEGER)",
	];
	const bindValues: unknown[] = [];

	if (status !== undefined) {
		setClauses.push("status = ?");
		bindValues.push(status);
	}
	if (fulfillmentStatus !== undefined) {
		setClauses.push("fulfillment_status = ?");
		bindValues.push(fulfillmentStatus);
	}
	if (subscriptionId !== undefined && whereColumn !== "subscription_id") {
		setClauses.push("subscription_id = ?");
		bindValues.push(subscriptionId);
	}
	if (subscriptionStatus !== undefined) {
		setClauses.push("subscription_status = ?");
		bindValues.push(subscriptionStatus);
	}
	if (providerOrderId !== undefined) {
		setClauses.push("provider_order_id = ?");
		bindValues.push(providerOrderId);
	}

	// Use orderId for provider/webhook lookups, id for client-side lookups
	bindValues.push(lookupValue);
	let sql = `UPDATE orders SET ${setClauses.join(", ")} WHERE ${whereColumn} = ?`;

	// Atomic locks
	if (requirePendingStatus) {
		sql += ` AND status = 'pending'`;
	}
	if (requireNonCancelledSubscription) {
		sql += ` AND (subscription_status IS NULL OR subscription_status != 'cancelled')`;
	}

	// return full row data
	sql += ` RETURNING *`;

	try {
		const result = await db
			.prepare(sql)
			.bind(...bindValues)
			.first<OrderRow>();

		if (result) {
			logger.info(
				{ component: "DB" },
				`Successfully updated order ${lookupValue}`,
			);
			return result;
		} else {
			logger.info(
				{ component: "DB" },
				`Update skipped for ${lookupValue} (Condition not met or ID not found)`,
			);
			return null;
		}
	} catch (error) {
		await alert(
			{
				component: "DB",
				operation: "updateOrder",
				context: { orderId: lookupValue },
			},
			`Failed to update order ${lookupValue}`,
			error instanceof Error ? error : String(error),
		);
		throw error; // Let the caller handle the failure
	}
}

// UUIDv4 format validation regex
export const isValidUUIDv4 =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// GET an order by its transactionId (UUIDv4).
// Returns null if not found or if the ID format is invalid.
export async function getOrderById(
	db: D1Database,
	id: string,
): Promise<OrderRow | null> {
	if (!isValidUUIDv4.test(id)) return null;

	try {
		const result = await db
			.prepare("SELECT * FROM orders WHERE id = ?")
			.bind(id)
			.first<OrderRow>();

		return result ?? null;
	} catch (error) {
		await alert(
			{ component: "DB", operation: "getOrderById", context: { orderId: id } },
			`Failed to get order ${id}`,
			error instanceof Error ? error : String(error),
		);
		return null;
	}
}
