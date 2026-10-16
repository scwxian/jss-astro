import { env, loadEnv, ENV_PATH } from './lib/env.mjs';
import { requestJson, sleep, cleanUrl } from './lib/http.mjs';
import { readJson, writeJson, exists } from './lib/cache.mjs';
import { log } from './lib/log.mjs';

const BASE = 'https://api.dataforseo.com/v3';
const MAX_BATCH = 100;

/* ------------------------- market config ------------------------- */
/* Set the market you target in tools/.env:
     DF_LOCATION_CODE  numeric DataForSEO location code (required for any call)
     DF_LOCATION_NAME  human label used in logs/scaffold (optional)
     DF_LANGUAGE       language code (default "en")
   Look codes up: https://docs.dataforseo.com/v3/appendix/locations_and_languages/ */

export function language() {
  loadEnv();
  return process.env.DF_LANGUAGE || 'en';
}

export function locationCode() {
  loadEnv();
  const raw = process.env.DF_LOCATION_CODE;
  const n = Number(raw);
  if (!raw || !Number.isInteger(n) || n <= 0) {
    throw new Error(
      `Missing market config: set DF_LOCATION_CODE (numeric DataForSEO location code) in ${ENV_PATH} — see tools/.env.example.`,
    );
  }
  return n;
}

export function locationName() {
  loadEnv();
  return process.env.DF_LOCATION_NAME || null;
}

/** Human-readable market label for logs/scaffold (never throws). */
export function marketLabel() {
  loadEnv();
  const name = process.env.DF_LOCATION_NAME || (process.env.DF_LOCATION_CODE ? `code ${process.env.DF_LOCATION_CODE}` : 'market');
  return `${name}/${language()}`;
}

/**
 * Standard/Priority queue endpoints (async task_post + task_get) — NOT Live mode.
 * Priority defaults to normal, so this is the Standard Queue.
 */
const ENDPOINTS = {
  serp: {
    post: '/serp/google/organic/task_post',
    get: (id) => `/serp/google/organic/task_get/advanced/${id}`,
  },
  autocomplete: {
    post: '/serp/google/autocomplete/task_post',
    get: (id) => `/serp/google/autocomplete/task_get/advanced/${id}`,
  },
  searchVolume: {
    post: '/keywords_data/google_ads/search_volume/task_post',
    get: (id) => `/keywords_data/google_ads/search_volume/task_get/${id}`,
  },
};

export function hasCreds() {
  loadEnv();
  return Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}

function authHeader() {
  const login = env('DATAFORSEO_LOGIN', { required: true });
  const password = env('DATAFORSEO_PASSWORD', { required: true });
  return `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;
}

function envMs(name, def) {
  loadEnv();
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : def;
}

async function postTasks(kind, tasks) {
  const { post } = ENDPOINTS[kind];
  const json = await requestJson(`${BASE}${post}`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: tasks,
  });
  if (json.status_code && json.status_code >= 40000) {
    throw new Error(`DataForSEO ${kind} post error ${json.status_code}: ${json.status_message}`);
  }
  return (json.tasks || []).map((t) => ({ id: t.id, status_code: t.status_code, status_message: t.status_message }));
}

async function getTask(kind, id) {
  const { get } = ENDPOINTS[kind];
  const json = await requestJson(`${BASE}${get(id)}`, { headers: { Authorization: authHeader() } });
  return (json.tasks || [])[0] || null;
}

const labelOf = (spec) => spec.keyword ?? (spec.keywords || []).join(' | ');

/**
 * Post a batch (≤100 tasks) in ONE call, then poll all task ids together.
 * - Resumable: stores `{ keywords, ids }` in `cacheFile`; re-run resumes polling (task_get is free).
 * - Configurable: DF_POLL_MS (default 6000), DF_MAX_WAIT_MS (default 45 min).
 * - Threads a `task` object through unchanged so the caller can align results by index.
 */
export async function runBatch(kind, specs, { cacheFile, force } = {}) {
  loadEnv();
  if (specs.length > MAX_BATCH) throw new Error(`${kind}: ${specs.length} tasks > MAX_BATCH ${MAX_BATCH}; split the batch`);
  const keywords = specs.map(labelOf);
  let ids;

  if (!force && cacheFile && exists(cacheFile)) {
    const saved = readJson(cacheFile);
    if (Array.isArray(saved.ids) && JSON.stringify(saved.keywords) === JSON.stringify(keywords)) {
      ids = saved.ids;
      log.info(`resume ${kind}: ${ids.length} task id(s) from cache`);
    }
  }
  if (!ids) {
    const posted = await postTasks(kind, specs); // single POST = one batch
    ids = posted.map((t) => t.id);
    if (cacheFile) writeJson(cacheFile, { keywords, ids, postedAt: new Date().toISOString() });
    log.ok(`posted ${ids.length} ${kind} task(s) in 1 call [standard queue]`);
  }

  const maxWaitMs = envMs('DF_MAX_WAIT_MS', 45 * 60 * 1000);
  const pollMs = envMs('DF_POLL_MS', 6000);
  const results = new Array(ids.length).fill(null);
  const pending = new Set(ids.map((_, i) => i));
  const started = Date.now();

  while (pending.size) {
    if (Date.now() - started > maxWaitMs) {
      throw new Error(
        `timeout: ${pending.size}/${ids.length} ${kind} task(s) pending after ${Math.round((Date.now() - started) / 60000)} min. ` +
          `Task ids cached at ${cacheFile || '(none)'} — re-run to resume.`,
      );
    }
    await sleep(pollMs);
    for (const i of [...pending]) {
      const t = await getTask(kind, ids[i]);
      if (t && Array.isArray(t.result) && t.result.length) {
        results[i] = t;
        pending.delete(i);
      }
    }
    const done = ids.length - pending.size;
    log.info(`${kind}: ${done}/${ids.length} done · ${Math.round((Date.now() - started) / 1000)}s`);
  }
  return results;
}

const firstResult = (task) => task?.result?.[0] || {};

/* ------------------------- normalizers ------------------------- */

function normalizeSerp(keyword, task) {
  const r = firstResult(task);
  const items = r.items || [];
  return {
    keyword,
    itemTypes: r.item_types || [],
    organic: items
      .filter((i) => i.type === 'organic')
      .map((i) => ({
        rank: i.rank_absolute ?? i.rank_group ?? null,
        url: cleanUrl(i.url),
        title: i.title,
        description: i.description || null,
        domain: i.domain || null,
      })),
    paa: items
      .filter((i) => i.type === 'people_also_ask')
      .flatMap((i) => (i.items || []).map((q) => ({ question: q.title, url: q.expanded_element?.[0]?.url || q.url || null }))),
    related: items
      .filter((i) => i.type === 'related_searches')
      .flatMap((i) => (i.items || []).map((x) => x.title || x.keyword || String(x))),
    featuredSnippet: items.find((i) => i.type === 'featured_snippet') || null,
    knowledgeGraph: normalizeKnowledgeGraph(items.find((i) => i.type === 'knowledge_graph')),
  };
}

/** Flatten a Google Knowledge Panel item (advanced SERP) into a stable shape. */
export function normalizeKnowledgeGraph(item) {
  if (!item) return null;
  const sub = item.items || [];
  const desc = sub.find((i) => i.type === 'knowledge_graph_description_item');
  const carousel = sub.find((i) => i.type === 'knowledge_graph_carousel_item');
  return {
    title: item.title || null,
    type: item.subtitle || null,
    description: desc?.text || item.description || null,
    url: item.url || null,
    cid: item.cid || null,
    attributes: sub
      .filter((i) => i.type === 'knowledge_graph_row_item')
      .map((i) => ({ name: i.title, value: i.text })),
    profiles: (carousel?.items || []).map((p) => ({ title: p.title, url: p.url })),
  };
}

/* ------------------- Google Knowledge Panel (live) ------------------- */

/** Live advanced SERP -> Google Knowledge Panel for one keyword (immediate). */
export async function knowledgePanel(keyword, { cacheFile, force } = {}) {
  loadEnv();
  if (!force && cacheFile && exists(cacheFile)) return readJson(cacheFile);
  const json = await requestJson(`${BASE}/serp/google/organic/live/advanced`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: [{ keyword, location_code: locationCode(), language_code: language(), device: 'desktop', depth: 20 }],
  });
  if (json.status_code >= 40000) throw new Error(`DataForSEO live ${json.status_code}: ${json.status_message}`);
  const r = json.tasks?.[0]?.result?.[0] || {};
  const rec = {
    keyword,
    panel: normalizeKnowledgeGraph((r.items || []).find((i) => i.type === 'knowledge_graph')),
    itemTypes: r.item_types || [],
  };
  if (cacheFile) writeJson(cacheFile, rec);
  return rec;
}

/* ------------------------- public API ------------------------- */

export async function serpBatch(keywords, opts = {}) {
  const location_code = locationCode();
  const language_code = language();
  const specs = keywords.map((kw) => ({
    keyword: kw,
    location_code,
    language_code,
    device: 'desktop',
    depth: 20,
  }));
  const tasks = await runBatch('serp', specs, opts);
  return tasks.map((task, i) => normalizeSerp(keywords[i], task));
}

export async function serp(keyword, opts = {}) {
  return (await serpBatch([keyword], opts))[0];
}

export async function autocompleteBatch(keywords, opts = {}) {
  const location_code = locationCode();
  const language_code = language();
  const specs = keywords.map((kw) => ({
    keyword: kw,
    location_code,
    language_code,
    client: 'chrome',
  }));
  const tasks = await runBatch('autocomplete', specs, opts);
  return tasks.map((task, i) => ({
    keyword: keywords[i],
    suggestions: (firstResult(task).items || []).map((x) => x.suggestion).filter(Boolean),
  }));
}

export async function autocomplete(keyword, opts = {}) {
  return (await autocompleteBatch([keyword], opts))[0];
}

export async function searchVolume(keywords, opts = {}) {
  const list = Array.isArray(keywords) ? keywords : [keywords];
  const [task] = await runBatch('searchVolume', [
    { keywords: list, location_code: locationCode(), language_code: language() },
  ], opts);
  return (task.result || []).map((i) => ({
    keyword: i.keyword,
    volume: i.search_volume ?? null,
    cpc: i.cpc ?? null,
    competition: i.competition ?? null,
  }));
}
