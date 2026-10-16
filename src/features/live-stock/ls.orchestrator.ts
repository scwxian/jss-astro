import { ACTIVE_STOCK_PROVIDER } from "astro:env/server";
import type { LiveStockProvider } from "./ls.model.ts";
import { BaserowStockAdapter } from "./providers/baserow.adapter.ts";

// Provider registry — add new platform adapters here (one per platform).
// NOTE (future): a per-variant provider can be registered/selected here too.
export function getLiveStockProvider(): LiveStockProvider {
	const provider = ACTIVE_STOCK_PROVIDER || "baserow";
	switch (provider) {
		case "baserow":
			return new BaserowStockAdapter();
		default:
			throw new Error(`Unsupported stock provider: ${provider}`);
	}
}
