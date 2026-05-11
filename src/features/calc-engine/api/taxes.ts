/**
 * Tax API Resolver
 *
 * Determines tax jurisdictions and rates based on the customer's address.
 * STRICT RULE: No math is performed here. It only returns the rules.
 */

import type { TaxAddress, TaxResult } from "@calc-engine/calc-engine.model.ts";

export async function resolveTax(address?: TaxAddress): Promise<TaxResult> {
	// CURRENT STUB: Tax calculation is completely disabled.
	return {};

	/* =========================================
	FUTURE TAX IMPLEMENTATION — config-driven example
	=========================================
	
	if (!address) {
		return { taxError: "Address is required to calculate taxes." };
	}

	// Example: charge tax for domestic orders
	if (address.country.toUpperCase() === "US" || address.country.toUpperCase() === "UNITED STATES") {
		return {
			taxDefinition: {
				name: "Default Tax",
				rate: 8, // e.g., 8% (adjust based on your region's tax rules)
				isShippingTaxable: false
			}
		};
	}

	// International orders — exempt
	return {
		taxDefinition: {
			name: "Zero-Rated (Export)",
			rate: 0,
			isShippingTaxable: false
		}
	};
	*/
}

