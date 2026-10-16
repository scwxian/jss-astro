import { actions } from "astro:actions";
import { logger } from "@log-alert/logger";

// Layer 1: dedupe concurrent triggers within a single page load (per JS realm).
const inFlight = new Set();

// Layer 2: per-tab cache across navigations/reloads (survives until tab closes).
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cacheKey = (slug) => `ls:${slug}`;

function readCache(slug) {
	try {
		const raw = sessionStorage.getItem(cacheKey(slug));
		if (!raw) return null;
		const { result, ts } = JSON.parse(raw);
		if (Date.now() - ts > CACHE_TTL_MS) {
			sessionStorage.removeItem(cacheKey(slug));
			return null;
		}
		return result;
	} catch {
		return null;
	}
}

function writeCache(slug, result) {
	try {
		sessionStorage.setItem(cacheKey(slug), JSON.stringify({ result, ts: Date.now() }));
	} catch {
		/* storage full/disabled — ignore */
	}
}

// Invalidate after a successful add-to-cart so a re-check is fresh.
export function invalidateStockCache(slug) {
	try {
		sessionStorage.removeItem(cacheKey(slug));
	} catch {
		/* ignore */
	}
}

export async function initLiveStock(el) {
	const slug = el.dataset.slug;
	if (!slug || inFlight.has(slug)) return;
	inFlight.add(slug);

	try {
		const cached = readCache(slug);
		if (cached) {
			el.applyStockState(cached);
			return;
		}

		const { data, error } = await actions.checkLiveStock({ slug });
		if (error || !data) throw error ?? new Error("No data");

		writeCache(slug, data);
		el.applyStockState(data);
	} catch (error) {
		logger.error({ component: "LiveStock" }, "check failed:", error);
		el.applyStockState({ status: "unavailable" });
	} finally {
		inFlight.delete(slug);
	}
}
