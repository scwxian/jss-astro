import { BASEROW_API_TOKEN } from "astro:env/server";
import { alertWithRateLimit } from "@log-alert/alert";
import { z } from "astro/zod";
import type { LiveStockProvider } from "../ls.model.ts";

// Baserow config — point these at your own table/fields.
const BASEROW_TABLE_ID = ""; // set to your Baserow table id
const BASEROW_API_URL = "https://api.baserow.io/api/database/rows/table";
const SLUG_FIELD = "slug"; // field holding the product slug
const QUANTITY_FIELD = "availableQuantity"; // field holding stock on hand

const REQUEST_TIMEOUT_MS = 4000;
const MAX_ATTEMPTS = 2; // 1 initial + 1 retry

const baserowRowsSchema = z.object({
	results: z.array(
		z.looseObject({
			// coerce: field may be number or numeric text; nullish preserved.
			[QUANTITY_FIELD]: z.coerce.number().nullish(),
		}),
	),
});

export class BaserowStockAdapter implements LiveStockProvider {
	readonly name = "baserow";

	async getQuantityBySlug(slug: string): Promise<number | null> {
		const token = BASEROW_API_TOKEN;
		if (!token) throw new Error("BASEROW_API_TOKEN not configured");
		if (!BASEROW_TABLE_ID) throw new Error("BASEROW_TABLE_ID not configured");

		// Baserow list-rows is GET-only; no filters-in-JSON-body endpoint exists.
		// `filters` requires the advanced shape (filter_type + filters[]); the
		// simple {"field":"value"} form is rejected with a 400.
		const params = new URLSearchParams({
			user_field_names: "true",
			size: "1",
			filters: JSON.stringify({
				filter_type: "AND",
				filters: [{ type: "equal", field: SLUG_FIELD, value: slug }],
			}),
		});
		const url = `${BASEROW_API_URL}/${BASEROW_TABLE_ID}/?${params.toString()}`;

		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
			try {
				const res = await fetch(url, {
					headers: {
						Authorization: `Token ${token}`,
						"Content-Type": "application/json",
					},
					signal: controller.signal,
				});
				clearTimeout(timeout);

				if (!res.ok) throw new Error(`Baserow API error: ${res.status}`);

				const parsed = baserowRowsSchema.parse(await res.json());
				const row = parsed.results[0];
				if (!row) return null;

				const raw = row[QUANTITY_FIELD];
				if (raw == null) return 0;
				return Number.isFinite(raw) && raw > 0 ? raw : 0;
			} catch (error) {
				clearTimeout(timeout);
				lastError = error instanceof Error ? error : new Error(String(error));
				if (attempt < MAX_ATTEMPTS) {
					await new Promise((r) => setTimeout(r, 500 * attempt));
				}
			}
		}

		await alertWithRateLimit(
			{
				component: "LiveStock",
				operation: "baserow-fetch",
				threshold: 3,
				windowMs: 10 * 60 * 1000,
				context: { metadata: { slug } },
			},
			"Baserow inventory fetch failed — availability unresolved (fail-closed)",
			lastError ?? new Error("Unknown error"),
		);

		throw lastError ?? new Error("Unknown error");
	}
}
