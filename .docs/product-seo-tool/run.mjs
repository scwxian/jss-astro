#!/usr/bin/env node
/**
 * product-seo-tool — rank-truth research for PRODUCT pages.
 *
 * DataForSEO (standard queue): keyword volumes + Google SERP (organic, PAA,
 * related searches, SERP-feature flags) + autocomplete.
 *
 * Standalone tool. Creds and target market come from
 * `product-seo-tool/.env` (see `.env.example`).
 *
 * Usage:
 *   node run.mjs --keywords "leather wallet, wireless earbuds"
 *   node run.mjs --keywords-file ./kw.txt --name wallets
 *   node run.mjs --keywords "stainless water bottle" --no-serp
 *
 * Flags:
 *   --keywords <a,b,c>     comma-separated query list (required unless --keywords-file)
 *   --keywords-file <path> one query per line (# comments allowed)
 *   --name <label>         output label (default: timestamp)
 *   --location-code <n>    override DF_LOCATION_CODE for this run
 *   --depth <n>            SERP depth (default: 20)
 *   --no-serp              skip SERP
 *   --no-autocomplete      skip autocomplete
 *   --no-volume            skip search volume
 *   --force                ignore cache; re-post tasks
 *   --out <dir>            output dir (default: ./out)
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { TOOL_DIR } from './lib/env.mjs';
import { writeJson, writeText } from './lib/cache.mjs';
import { log } from './lib/log.mjs';
import * as dfs from './lib/dataforseo.mjs';

/* ------------------------------ args ------------------------------ */
function parseArgs(argv) {
	const out = { _: [] };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (!a.startsWith('--')) {
			out._.push(a);
			continue;
		}
		const key = a.slice(2);
		const next = argv[i + 1];
		if (!next || next.startsWith('--')) {
			out[key] = true;
		} else {
			out[key] = next;
			i++;
		}
	}
	return out;
}

function usage(msg) {
	if (msg) log.error(msg);
	process.stderr.write(`
Usage: node run.mjs --keywords "kw1, kw2, ..." [--name label]

  --keywords <a,b,c>      comma-separated query list (required unless --keywords-file)
  --keywords-file <path>  one query per line (# comments allowed)
  --name <label>          output label (default: run-<timestamp>)
  --location-code <n>     override the configured market (DF_LOCATION_CODE)
  --depth <n>             SERP depth (default: 20)
  --no-serp               skip Google SERP
  --no-autocomplete       skip autocomplete
  --no-volume             skip keyword volume
  --force                 ignore cache; re-post tasks
  --out <dir>             output dir (default: ./out)

Market: set DF_LOCATION_CODE / DF_LOCATION_NAME in .env (see .env.example).
`);
	process.exit(msg ? 1 : 0);
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) usage();

function loadKeywords() {
	if (typeof args.keywords === 'string') {
		return args.keywords.split(',').map((s) => s.trim()).filter(Boolean);
	}
	if (typeof args['keywords-file'] === 'string') {
		return readFileSync(resolve(args['keywords-file']), 'utf8')
			.split(/\r?\n/)
			.map((s) => s.trim())
			.filter((s) => s && !s.startsWith('#'));
	}
	return [];
}

const keywords = loadKeywords();
if (keywords.length === 0) usage('No keywords provided.');

const cfg = dfs.locationConfig();
const locationCode = typeof args['location-code'] === 'string' ? Number(args['location-code']) : cfg.locationCode;
if (!Number.isFinite(locationCode) || locationCode <= 0) {
	usage('No target market configured. Set DF_LOCATION_CODE and DF_LOCATION_NAME in .env (see .env.example).');
}
const language = cfg.language;
const geoLabel = cfg.locationName || String(locationCode);
const depth = Number(args.depth) || 20;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const name = typeof args.name === 'string' ? args.name : `run-${stamp}`;
const outDir = resolve(typeof args.out === 'string' ? args.out : join(TOOL_DIR, 'out'));
const force = Boolean(args.force);

const cacheDir = join(TOOL_DIR, '.cache');
const cache = (kind) => join(cacheDir, `${name}-${kind}.json`);
const runOpts = { force, location: locationCode, language };

/* ------------------------------ run ------------------------------ */
const report = {
	meta: { name, geo: geoLabel, depth, generatedAt: new Date().toISOString(), keywords },
	volumes: [],
	serp: [],
	autocomplete: [],
};

const lines = [];
lines.push(`# Product SEO research — ${name}`);
lines.push('');
lines.push(`**Market:** ${geoLabel} / ${language} · **Queries:** ${keywords.length} · **SERP depth:** ${depth} · **Generated:** ${report.meta.generatedAt}`);
lines.push('');

if (!args['no-volume'] && dfs.hasCreds()) {
	log.step('search_volume');
	report.volumes = await dfs.searchVolume(keywords, { ...runOpts, cacheFile: cache('volumes') });
	lines.push('## 1. Search volume');
	lines.push('');
	lines.push('| Keyword | Volume | CPC | Competition |');
	lines.push('| --- | --- | --- | --- |');
	for (const v of report.volumes) {
		lines.push(`| ${v.keyword} | ${v.volume ?? '—'} | ${v.cpc ?? '—'} | ${v.competition ?? '—'} |`);
	}
	lines.push('');
}

if (!args['no-serp']) {
	log.step('serp');
	report.serp = await dfs.serpBatch(keywords, { ...runOpts, cacheFile: cache('serp'), depth });
	lines.push(`## 2. Google SERP (${geoLabel})`);
	lines.push('');
	for (const s of report.serp) {
		const flags = [
			s.aiOverview && 'AIO',
			s.featuredSnippet && 'snippet',
			s.localPack && 'local-pack',
			s.popularProducts && 'popular-products',
			s.shoppingAds && 'shopping',
		].filter(Boolean).join(' · ') || 'none';
		lines.push(`### ${s.keyword}  \n_Features: ${flags}_`);
		lines.push('');
		lines.push('| # | Domain | Title |');
		lines.push('| --- | --- | --- |');
		for (const o of s.organic.slice(0, 10)) {
			lines.push(`| ${o.rank ?? '—'} | ${o.domain ?? '—'} | ${(o.title ?? '').replace(/\|/g, '/')} |`);
		}
		lines.push('');
		if (s.paa.length) lines.push(`**PAA:** ${s.paa.map((p) => p.question).join(' · ')}`, '');
		if (s.related.length) lines.push(`**Related searches:** ${[...new Set(s.related)].join(' · ')}`, '');
	}
}

if (!args['no-autocomplete']) {
	log.step('autocomplete');
	report.autocomplete = await dfs.autocompleteBatch(keywords, { ...runOpts, cacheFile: cache('autocomplete') });
	lines.push('## 3. Autocomplete');
	lines.push('');
	for (const a of report.autocomplete) {
		lines.push(`- **${a.keyword}** → ${a.suggestions.slice(0, 12).join(' · ') || '(none)'}`);
	}
	lines.push('');
}

const mdPath = join(outDir, `${name}.md`);
const jsonPath = join(outDir, `${name}.json`);
writeText(mdPath, lines.join('\n'));
writeJson(jsonPath, report);

process.stdout.write(lines.join('\n') + '\n');
log.ok(`report → ${mdPath}`);
log.ok(`data   → ${jsonPath}`);
