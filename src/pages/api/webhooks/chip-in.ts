export const prerender = false;

import { env } from "cloudflare:workers";
import { updateOrder } from "@db/db.utils.ts";
import {
	buildPostPurchasePayload,
	triggerPostPurchaseWorkflows,
} from "@pp/pp.orchestrator.ts";
import { ChipInAdapter } from "@payment-gateways/one-time/onetime-chipin.adapter.ts";
import { alert, alertWithRateLimit } from "@log-alert/alert";
import { logger } from "@log-alert/logger";
import type { APIRoute } from "astro";

const HANDLED_EVENTS = [
	"purchase.paid",
	"purchase.payment_failure",
	"purchase.cancelled",
];

// Map normalized payment status to DB order status
const ORDER_STATUS_MAP: Record<string, string> = {
	success: "success",
	failed: "failed",
	cancelled: "cancelled",
};

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		let gateway: ChipInAdapter;
		try {
			gateway = new ChipInAdapter();
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			await alertWithRateLimit(
				{
					component: "WEBHOOK-CHIPIN",
					operation: "gatewayInit",
					threshold: 3,
					windowMs: 60 * 60 * 1000,
				},
				"Gateway initialization failed - Chipin webhook handler misconfigured",
				err,
			);
			return new Response("Server configuration error", { status: 500 });
		}

		// Verify Signature
		const rawBodyText = await request.text();
		let rawPayload: Record<string, unknown>;
		try {
			rawPayload = JSON.parse(rawBodyText);
		} catch {
			logger.error({ component: "WEBHOOK-CHIPIN" }, "Malformed JSON payload");
			return new Response("Bad Request", { status: 400 });
		}

		const signature = request.headers.get("X-Signature");
		const isValid = await gateway.verifyWebhookSignature(
			rawBodyText,
			signature,
		);
		if (!isValid) {
			let failedEventType = "unknown";
			try {
				failedEventType =
					(JSON.parse(rawBodyText) as { event_type?: string }).event_type ??
					"missing";
			} catch {}
			await alertWithRateLimit(
				{
					component: "WEBHOOK-CHIPIN",
					operation: "verifySignature",
					threshold: 5,
					windowMs: 60 * 60 * 1000,
					context: { eventType: failedEventType },
				},
				"Invalid Chipin signature - possible webhook attack or misconfiguration",
				new Error(`Signature validation failed: ${signature?.slice(0, 20)}...`),
			);
			return new Response("Invalid signature", { status: 401 });
		}

		const eventType = (rawPayload as { event_type?: string }).event_type;
		if (!eventType || !HANDLED_EVENTS.includes(eventType)) {
			logger.info(
				{ component: "WEBHOOK-CHIPIN" },
				`Received unhandled event type: ${eventType}`,
			);
			return new Response("OK", { status: 200 });
		}

		// Asynchronous Processing ("Respond Quickly" best practice by Chip-In Docs)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const cfContext = (locals as any).cfContext;
		if (cfContext?.waitUntil) {
			cfContext.waitUntil(
				(async () => {
					let order:
						| ReturnType<typeof gateway.normalizeWebhookPayload>
						| undefined;
					try {
						order = gateway.normalizeWebhookPayload(rawPayload);
						const d1Database = env.DB;
						const newStatus =
							order.paymentStatus
								? ORDER_STATUS_MAP[order.paymentStatus]
								: undefined;

						if (d1Database && newStatus && order.orderId) {
							const isSuccessTransition = newStatus === "success";
							const updatedOrder = await updateOrder({
								db: d1Database,
								orderId: order.orderId,
								status: newStatus,
								fulfillmentStatus: isSuccessTransition ? "unfulfilled" : undefined,
								requirePendingStatus: isSuccessTransition,
							});

							if (updatedOrder && isSuccessTransition) {
								logger.info(
									{ component: "WEBHOOK-CHIPIN" },
									`Order ${updatedOrder.order_id} successfully transitioned to paid. Triggering workflows.`,
								);

								const dbPayload = buildPostPurchasePayload(eventType, order, updatedOrder);
								await triggerPostPurchaseWorkflows(dbPayload);
							} else if (!updatedOrder) {
								logger.info(
									{ component: "WEBHOOK-CHIPIN" },
									`Order ${order.orderId} already processed or not found. Skipping workflow.`,
								);
							}
						}
					} catch (asyncError) {
						const err =
							asyncError instanceof Error
								? asyncError
								: new Error(String(asyncError));
						await alert(
							{
								component: "WEBHOOK-CHIPIN",
								operation: "processWebhookAsync",
								context: { eventType, orderId: order?.orderId },
							},
							"Async webhook processing failed - payment received but fulfillment workflow not triggered",
							err,
						);
					}
				})(),
			);
		} else {
			logger.warn(
				{ component: "WEBHOOK-CHIPIN" },
				"Cloudflare waitUntil context missing. Ensure you are not running this in a standard Node environment.",
			);
		}

		return new Response("OK", { status: 200 });
	} catch (error) {
		logger.error({ component: "WEBHOOK-CHIPIN" }, "Webhook error:", error);
		return new Response(
			error instanceof Error ? error.message : "Internal server error",
			{ status: 500 },
		);
	}
};
