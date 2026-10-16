export const prerender = false;

import { env } from "cloudflare:workers";
import { updateOrder } from "@db/db.utils.ts";
import {
	buildPostPurchasePayload,
	triggerPostPurchaseWorkflows,
} from "@pp/pp.orchestrator.ts";
import { StripeSubscriptionAdapter } from "@payment-gateways/subscriptions/subs-stripe.adapter.ts";
import { alert, alertWithRateLimit } from "@log-alert/alert";
import { logger } from "@log-alert/logger";
import type { APIRoute } from "astro";

const HANDLED_EVENTS = [
	"checkout.session.completed",
	"invoice.paid",
	"customer.subscription.deleted",
];

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		let gateway: StripeSubscriptionAdapter;
		try {
			gateway = new StripeSubscriptionAdapter();
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			await alertWithRateLimit(
				{
					component: "WEBHOOK-STRIPE",
					operation: "gatewayInit",
					threshold: 3,
					windowMs: 60 * 60 * 1000,
				},
				"Gateway initialization failed - Stripe webhook handler misconfigured",
				err,
			);
			return new Response("Server configuration error", { status: 500 });
		}

		const rawBodyText = await request.text();
		let rawPayload: unknown;
		try {
			rawPayload = JSON.parse(rawBodyText);
		} catch {
			logger.error({ component: "WEBHOOK-STRIPE" }, "Malformed JSON payload");
			return new Response("Bad Request", { status: 400 });
		}

		const signature = request.headers.get("Stripe-Signature");
		const isValid = await gateway.verifyWebhookSignature(
			rawBodyText,
			signature,
		);
		if (!isValid) {
			await alertWithRateLimit(
				{
					component: "WEBHOOK-STRIPE",
					operation: "verifySignature",
					threshold: 5,
					windowMs: 60 * 60 * 1000,
				},
				"Invalid Stripe signature - possible webhook attack or misconfiguration",
				new Error(`Signature validation failed: ${signature?.slice(0, 20)}...`),
			);
			return new Response("Invalid signature", { status: 401 });
		}

		const eventType = (rawPayload as { type?: string }).type;
		if (!eventType || !HANDLED_EVENTS.includes(eventType)) {
			logger.info(
				{ component: "WEBHOOK-STRIPE" },
				`Received unhandled event type: ${eventType}`,
			);
			return new Response("OK", { status: 200 });
		}

		// Asynchronous Processing ("Respond Quickly" best practice)
		const cfContext = (locals as any).cfContext;
		if (cfContext?.waitUntil) {
			cfContext.waitUntil(
				(async () => {
					let event:
						| ReturnType<typeof gateway.normalizeWebhookEvent>
						| undefined;
					try {
						event = gateway.normalizeWebhookEvent(rawPayload);
						const d1Database = env.DB;
						const rawData = rawPayload as { livemode?: boolean };
						event.mode = rawData.livemode ? "live" : "test";

						const eventId = (rawPayload as { id?: string }).id;
						if (eventId) {
							const dedupKey = `wh_${eventId}`;
							const alreadyProcessed = await env.IDEMP_CHKOUT_KV.get(dedupKey);
							if (alreadyProcessed) {
								logger.info(
									{ component: "WEBHOOK-STRIPE" },
									`Duplicate event ${eventId}, skipped`,
								);
								return;
							}
							await env.IDEMP_CHKOUT_KV.put(dedupKey, "1", { expirationTtl: 86400 });
						}

						switch (eventType) {
							case "checkout.session.completed": {
								if (d1Database && event.transactionId) {
									const updatedOrder = await updateOrder({
										db: d1Database,
										id: event.transactionId,
										status: "success",
										subscriptionId: event.providerSubscriptionId,
										subscriptionStatus: "active",
										requirePendingStatus: true,
									});
									if (updatedOrder) {
										logger.info(
											{ component: "WEBHOOK-STRIPE" },
											`Subscription ${updatedOrder.id} activated. Triggering workflows.`,
										);
										const dbPayload = buildPostPurchasePayload(eventType, event, updatedOrder);
										await triggerPostPurchaseWorkflows(dbPayload);
									} else {
										logger.info(
											{ component: "WEBHOOK-STRIPE" },
											`Subscription ${event.transactionId} already processed. Skipping workflow.`,
										);
									}
								}
								break;
							}

              // Recurring payment — only handle subscription_cycle billing
							case "invoice.paid": {
								if (
									event.billingReason === "subscription_cycle" &&
									d1Database &&
									event.providerSubscriptionId
								) {
									const updatedOrder = await updateOrder({
                    db: d1Database,
                    subscriptionId: event.providerSubscriptionId,
                  });
									if (updatedOrder) {
										const dbPayload = buildPostPurchasePayload(eventType, event, updatedOrder);
										await triggerPostPurchaseWorkflows(dbPayload);
									}
								} else {
									logger.warn(
										{ component: "WEBHOOK-STRIPE" },
										`invoice.paid skipped: billingReason=${event.billingReason}, hasDb=${!!d1Database}, hasSubId=${!!event.providerSubscriptionId}`,
									);
								}
								break;
							}

							// Subscription cancelled via Stripe Customer Portal
							case "customer.subscription.deleted": {
								if (d1Database && event.providerSubscriptionId) {
									const updatedOrder = await updateOrder({
										db: d1Database,
										subscriptionId: event.providerSubscriptionId,
										subscriptionStatus: "cancelled",
										requireNonCancelledSubscription: true,
									});
									if (updatedOrder) {
										const dbPayload = buildPostPurchasePayload(eventType, event, updatedOrder);
										await triggerPostPurchaseWorkflows(dbPayload);
									}
								}
								break;
							}

              // Payment Failed on subscriptions, currently uses Stripe Dashboard logic
              // Don't handle yet unless necessary
							// case "invoice.payment_failed": {
							// 	if (
							// 	) {
							// 	}
							// 	break;
							// }
						}

						// IMPORTANT: Stripe may deliver the same webhook multiple times.
						// Use event.providerSubscriptionId as your idempotency key to prevent duplicate processing.
					} catch (asyncError) {
						const err =
							asyncError instanceof Error
								? asyncError
								: new Error(String(asyncError));
						await alert(
							{
								component: "WEBHOOK-STRIPE",
								operation: "processWebhookAsync",
								context: {
									eventType,
									transactionId: event?.transactionId,
								},
							},
							"Async webhook processing failed - payment received but fulfillment workflow not triggered",
							err,
						);
					}
				})(),
			);
		} else {
			logger.warn(
				{ component: "WEBHOOK-STRIPE" },
				"Cloudflare waitUntil context missing. Ensure you are not running this in a standard Node environment.",
			);
		}

		return new Response("OK", { status: 200 });
	} catch (error) {
		logger.error({ component: "WEBHOOK-STRIPE" }, "Webhook error:", error);
		return new Response(
			error instanceof Error ? error.message : "Internal server error",
			{ status: 500 },
		);
	}
};
