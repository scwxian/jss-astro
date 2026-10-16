/**
 * Minimal DataForSEO client for product-page SEO research.
 * Standalone — own deps (none).
 *
 * Endpoints use the Standard Queue (async task_post + task_get); task ids are
 * cached so an aborted run resumes without re-spending credits.
 *
 * Market/language are env-driven — set DF_LOCATION_CODE / DF_LOCATION_NAME /
 * DF_LANGUAGE in `.env` (see `.env.example`).
 */
import { env, loadEnv } from './env.mjs';
import { requestJson, sleep, cleanUrl } from './http.mjs';
import { readJson, writeJson, exists } from './cache.mjs';
import { log } from './log.mjs';

const BASE = 'https://api.dataforseo.com/v3';
const DEFAULT_LANGUAGE = 'en';
const MAX_BATCH = 100;

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

/** Target market from env. `locationCode` is null when unset. */
export function locationConfig() {
	loadEnv();
	const code = Number(process.env.DF_LOCATION_CODE);
	return {
		locationCode: Number.isFinite(code) && code > 0 ? code : null,
		locationName: process.env.DF_LOCATION_NAME || null,
		language: process.env.DF_LANGUAGE || DEFAULT_LANGUAGE,
	};
}

function resolveLocation(override) {
	const code = override ?? locationConfig().locationCode;
	if (!Number.isFinite(code) || code <= 0) {
		throw new Error('Missing location code. Set DF_LOCATION_CODE in .env (see .env.example).');
	}
	return code;
}

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
 * Resumable via `cacheFile`; poll cadence via DF_POLL_MS / DF_MAX_WAIT_MS.
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
		const posted = await postTasks(kind, specs);
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
		log.info(`${kind}: ${ids.length - pending.size}/${ids.length} done · ${Math.round((Date.now() - started) / 1000)}s`);
	}
	return results;
}

const firstResult = (task) => task?.result?.[0] || {};

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
		featuredSnippet: items.some((i) => i.type === 'featured_snippet'),
		aiOverview: items.some((i) => i.type === 'ai_overview'),
		localPack: items.some((i) => i.type === 'local_pack'),
		shoppingAds: items.some((i) => i.type === 'shopping'),
		popularProducts: items.some((i) => i.type === 'popular_products'),
	};
}

export async function serpBatch(keywords, opts = {}) {
	const location = resolveLocation(opts.location);
	const language = opts.language ?? locationConfig().language;
	const specs = keywords.map((kw) => ({
		keyword: kw,
		location_code: location,
		language_code: language,
		device: opts.device ?? 'desktop',
		depth: opts.depth ?? 20,
	}));
	const tasks = await runBatch('serp', specs, opts);
	return tasks.map((task, i) => normalizeSerp(keywords[i], task));
}

export async function autocompleteBatch(keywords, opts = {}) {
	const location = resolveLocation(opts.location);
	const language = opts.language ?? locationConfig().language;
	const specs = keywords.map((kw) => ({
		keyword: kw,
		location_code: location,
		language_code: language,
		client: 'chrome',
	}));
	const tasks = await runBatch('autocomplete', specs, opts);
	return tasks.map((task, i) => ({
		keyword: keywords[i],
		suggestions: (firstResult(task).items || []).map((x) => x.suggestion).filter(Boolean),
	}));
}

export async function searchVolume(keywords, opts = {}) {
	const list = Array.isArray(keywords) ? keywords : [keywords];
	const location = resolveLocation(opts.location);
	const language = opts.language ?? locationConfig().language;
	const [task] = await runBatch('searchVolume', [
		{ keywords: list, location_code: location, language_code: language },
	], opts);
	return (task.result || [])
		.map((i) => ({
			keyword: i.keyword,
			volume: i.search_volume ?? null,
			cpc: i.cpc ?? null,
			competition: i.competition ?? null,
		}))
		.sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1));
}
