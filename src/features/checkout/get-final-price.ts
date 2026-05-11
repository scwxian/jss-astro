// Final Price Action
// Orchestrates the calculation pipeline to return final price to checkout page.

import { defineAction } from "astro:actions";
import { DEFAULT_ENGINE_CONFIG, quotePayloadSchema } from "@calc-engine/calc-engine.model.ts";
import { resolveCartData } from "@calc-engine/resolvers.ts";
import { buildConfiguredPipeline, runCartPipeline } from "@calc-engine/pipeline.ts";

export const calculateFinalPrice = defineAction({
	accept: "json",
	input: quotePayloadSchema,
	handler: async (input) => {
		const state = await resolveCartData(input, DEFAULT_ENGINE_CONFIG);
		const pipeline = buildConfiguredPipeline(DEFAULT_ENGINE_CONFIG);
		const finalState = runCartPipeline(state, pipeline);
		return finalState;
	},
});
