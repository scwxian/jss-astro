import { ActionError, defineAction } from "astro:actions";
import { ACTIVE_SUBSCRIPTION_GATEWAY, ACTIVE_ONETIME_GATEWAY, SITE_URL } from "astro:env/server";
import { env } from "cloudflare:workers";
import type { CartState } from "@calc-engine/calc-engine.model.ts";
import { DEFAULT_ENGINE_CONFIG, quotePayloadSchema } from "@calc-engine/calc-engine.model.ts";
import { resolveCartData } from "@calc-engine/resolvers.ts";
import { buildConfiguredPipeline, runCartPipeline } from "@calc-engine/pipeline.ts";
import { checkoutPayloadSchema } from "@checkout/checkout.model.ts";
import {
	acquireCheckoutLock,
	completeCheckoutLock,
	releaseCheckoutLock,
} from "@checkout/checkout.lock.ts";
import {
	buildGatewayUrls,
	generateOrderId,
	generateTransactionId,
} from "@checkout/checkout.utils.ts";
import { insertPendingOrder } from "@db/db.utils.ts";
import { getOneTimeGateway } from "@payment-gateways/one-time/onetime.factory.ts";
import { getSubscriptionGateway } from "@payment-gateways/subscriptions/subs.factory.ts";
import { saveUserSession } from "@users/save-user.ts";
import type { UserSessionData } from "@users/user.model.ts";

// PRE-HOOKS CONFIGURATION
// In the future, import hooks here (e.g., verifyInventory, fraudCheck)
// type PreHook = (cartState: any) => Promise<void>;
const CHECKOUT_PRE_HOOKS: any[] = [];

const executePreHooks = async (cartState: CartState) => {
	if (CHECKOUT_PRE_HOOKS.length === 0) return;
	await Promise.all(CHECKOUT_PRE_HOOKS.map((hook) => hook(cartState)));
};

export const createCheckoutSession = defineAction({
	accept: "json",
	input: checkoutPayloadSchema,
	handler: async (input, context) => {
		const kvNamespace = env.IDEMP_CHKOUT_KV;
		const clientIp = context.clientAddress;
		if (!clientIp) throw new ActionError({ code: "BAD_REQUEST", message: "Unable to determine client IP" });
		if (!kvNamespace) throw new ActionError({ code: "INTERNAL_SERVER_ERROR", message: "KV namespace not configured" });

		// Step 1: Acquire idempotency lock
		const lockResult = await acquireCheckoutLock({ payload: input, clientIp, kvNamespace });
		if (lockResult.status === "completed") {
			return { success: true, checkoutUrl: lockResult.checkoutUrl, transactionId: lockResult.transactionId ?? null, status: "existing" as const };
		}
		if (lockResult.status === "processing") {
			throw new ActionError({ code: "TOO_MANY_REQUESTS", message: "Checkout is already being processed. Please wait." });
		}
		const lockKey = lockResult.lockKey;

		try {
			const transactionId = generateTransactionId();
			const orderId = generateOrderId();

      // Step 2: CONCURRENT ORCHESTRATION TRACKS
			// Track A - Calculate Cart
			const runCartTrack = async () => {
				const quotePayload = quotePayloadSchema.parse({
					items: input.cartItems,
					deliveryMethod: input.deliveryMethod,
					location: input.deliveryMethod === "ship" ? input.shipping : undefined,
				});

				const cartState = await resolveCartData(quotePayload, DEFAULT_ENGINE_CONFIG);
				const pipeline = buildConfiguredPipeline(DEFAULT_ENGINE_CONFIG);
				const finalState = runCartPipeline(cartState, pipeline);

				if (!finalState.isValid) {
					throw new ActionError({ code: "BAD_REQUEST", message: `Invalid cart: ${finalState.errors.join(", ")}` });
				}
				await executePreHooks(finalState);
				return finalState;
			};

			// Track B - Save User Data
			const runUserTrack = async () => {
				const userData: UserSessionData = {
					email: input.email,
					deliveryMethod: input.deliveryMethod,
					sameAsShipping: input.sameAsShipping,
					shipping: input.shipping,
					billing: input.billing,
				};
				await saveUserSession(input.saveInfo ?? false, userData, context.session);
			};

			// Step 3: Execute Tracks Concurrently
			const [finalState] = await Promise.all([runCartTrack(), runUserTrack()]);

			// Step 4: Route to the correct Payment Gateway
			const origin = SITE_URL || "";
			let sessionResult;
			let gatewaySlug;

			if (input.checkoutType === "subscription") {
				const gateway = getSubscriptionGateway();
				gatewaySlug = ACTIVE_SUBSCRIPTION_GATEWAY || "stripe";
				const urls = buildGatewayUrls(origin, gatewaySlug, transactionId);

			// Step 5:  Create Subscription Payment Session
				sessionResult = await gateway.createSubscriptionSession({
					payload: input,
					cartState: finalState,
					transactionId,
          orderId,
					successUrl: urls.successUrl,
					cancelUrl: urls.cancelUrl,
					webhookUrl: urls.webhookUrl,
				});
			} else {
				const gateway = getOneTimeGateway();
				gatewaySlug = ACTIVE_ONETIME_GATEWAY || "chip-in";
				const urls = buildGatewayUrls(origin, gatewaySlug, transactionId);

			// Step 5:  Create One Time Payment Session
				sessionResult = await gateway.createPaymentSession({
					payload: input,
					cartState: finalState,
					transactionId,
					orderId,
					successUrl: urls.successUrl,
					failureUrl: urls.failureUrl,
					cancelUrl: urls.cancelUrl,
					webhookUrl: urls.webhookUrl,
				});
			}

			// Step 6: Serialize data and save pending order to D1
			const d1Database = env.DB;
			if (!d1Database) throw new Error("Database binding is missing in environment.");
			const payloadJson = JSON.stringify(input);
			const stateJson = JSON.stringify(finalState);

      // ⚠️ Blocking DB Insert. If this fails, it drops to the catch block,
			// releases the lock, and the user never gets sent to the checkout URL.
			await insertPendingOrder({
				db: d1Database,
				id: transactionId,
				orderId,
				email: input.email,
				type: input.checkoutType,
				totalAmount: finalState.grandTotal,
				payloadJson,
				stateJson,
				providerOrderId: sessionResult.providerOrderId,
			});

			// Step 7: Complete the lock after DB success
			await completeCheckoutLock(lockKey, sessionResult.checkoutUrl, kvNamespace, {
				transactionId,
				providerOrderId: sessionResult.providerOrderId,
			});

			return {
				success: true,
				checkoutUrl: sessionResult.checkoutUrl,
				transactionId,
				status: "created" as const,
			};
		} catch (error) {
			await releaseCheckoutLock(lockKey, kvNamespace);
			if (error instanceof ActionError) throw error;
			throw new ActionError({
				code: "INTERNAL_SERVER_ERROR",
				message: error instanceof Error ? error.message : "Checkout failed",
			});
		}
	},
});
