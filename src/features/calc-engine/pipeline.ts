import type {
	CartEngineConfig,
	CartState,
	Modifier,
} from "@calc-engine/calc-engine.model.ts";
import { DEFAULT_ENGINE_CONFIG } from "@calc-engine/calc-engine.model.ts";
import { applyBasePrices } from "./modifiers/base-price.ts";
import { applyPromos } from "./modifiers/promos.ts";
import { applyShipping } from "./modifiers/shipping.ts";
import { applyTaxes } from "./modifiers/taxes.ts";
import { applySubscriptionMultiplier } from "./modifiers/subscription-multiplier.ts";

export function runCartPipeline(
	state: CartState,
	modifiers: Modifier[],
): CartState {
	return modifiers.reduce((currentState, modifier) => {
		return modifier(currentState);
	}, state);
}

export function buildConfiguredPipeline(
	config: CartEngineConfig = DEFAULT_ENGINE_CONFIG,
): Modifier[] {
	const pipeline: Modifier[] = [applyBasePrices];

	if (config.enablePromos) pipeline.push(applyPromos);
	if (config.enableShipping) pipeline.push(applyShipping);
	if (config.enableTaxes) pipeline.push(applyTaxes);
	pipeline.push(applySubscriptionMultiplier);
	return pipeline;
}

// Example of a highly specific custom pipeline.
// export function buildQuotePipeline(): Modifier[] {
//     return [applyBasePrices, applyPromos];
// }
