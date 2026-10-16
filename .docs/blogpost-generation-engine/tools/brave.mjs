import { join } from 'node:path';
import { requestJson, sleep, cleanUrl } from './lib/http.mjs';
import { env, loadEnv } from './lib/env.mjs';
import { readJson, writeJson, exists, slugify } from './lib/cache.mjs';
import { log } from './lib/log.mjs';

const BASE = 'https://api.search.brave.com/res/v1/web/search';
const RESULTS = 20;

export function hasBraveKey() {
  loadEnv();
  return Boolean(process.env.BRAVE_API_KEY);
}

const host = (u) => {
  try {
    return new URL(u).host.replace(/^www\./, '');
  } catch {
    return null;
  }
};

/** Normalise Brave web results -> the same shape used elsewhere. */
export function normalizeBrave(items = []) {
  return items.map((r, i) => ({
    rank: i + 1,
    url: cleanUrl(r.url),
    title: r.title || '',
    description: r.description || null,
    domain: r.meta_url?.hostname || host(r.url),
  }));
}

/** Brave web search (global index — the content-discovery source, not local rankings). */
export async function braveSearch(query, { count = RESULTS } = {}) {
  const key = env('BRAVE_API_KEY', { required: true });
  const country = env('BRAVE_COUNTRY') || 'all';
  const url = `${BASE}?q=${encodeURIComponent(query)}&count=${count}&country=${encodeURIComponent(country)}&search_lang=en`;
  const json = await requestJson(url, { headers: { Accept: 'application/json', 'X-Subscription-Token': key } });
  return normalizeBrave(json.web?.results || []);
}

/** Fetch all queries sequentially (Brave free tier ~1 req/s), cache one JSON per query. */
export async function discoveryBatch(queries, { cacheDir, force } = {}) {
  const out = [];
  for (const q of queries) {
    const file = join(cacheDir, 'discovery', `${slugify(q)}.json`);
    if (!force && exists(file)) {
      out.push(readJson(file));
      continue;
    }
    let results = [];
    try {
      results = await braveSearch(q);
      log.info(`discovery "${q}" -> ${results.length} result(s)`);
    } catch (e) {
      log.warn(`discovery failed "${q}": ${e.message}`);
    }
    const rec = { keyword: q, results };
    writeJson(file, rec);
    out.push(rec);
    await sleep(1100); // respect free-tier rate limit
  }
  return out;
}
