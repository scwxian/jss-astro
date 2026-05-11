/**
 * Promo Code API Resolver
 *
 * Fetches promo code rules from the database (Cloudflare KV/D1).
 * STRICT RULE: No math is performed here. It only returns the rules.
 */

import type { PromoDefinition, PromoResult } from "@calc-engine/calc-engine.model.ts";

export async function resolvePromo(code: string): Promise<PromoResult> {
	// CURRENT STUB: Always returns invalid for now since feature is off.
	return {
		promoError: "Promo codes are not currently enabled.",
	};

	/* =========================================
	FUTURE CLOUDFLARE KV IMPLEMENTATION
	=========================================
	
	// 1. Fetch from KV (assuming JSON binding)
	// Example KV value: { type: "percentage", value: 15, expiresAt: 1712496000000, minSubtotal: 5000 }
	const promoData = await env.PROMO_KV.get(code.toUpperCase(), "json");

	// 2. Validate existence
	if (!promoData) {
		return { promoError: `Promo code "${code}" is invalid.` };
	}

	// 3. Validate expiration
	if (promoData.expiresAt && promoData.expiresAt < Date.now()) {
		return { promoError: `Promo code "${code}" has expired.` };
	}

	// 4. Return the valid definition for the pipeline
	return {
		promoDefinition: {
			code: code.toUpperCase(),
			type: promoData.type,
			value: promoData.value,
			minSubtotal: promoData.minSubtotal
		}
	};
	*/
}

