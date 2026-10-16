#!/usr/bin/env node
/**
 * Step-1 data harness (one post per run). Data only — no scraping.
 *
 *   node run-post.mjs --post PB-01 --cluster blogpost-pipeline-1.md
 *
 * Options:
 *   --post <ID>         Post id (e.g. PB-01)                     [required]
 *   --cluster <file>    Cluster file in .docs/blog-research/      [required]
 *   --offline           Use cache only (no network calls)
 *   --dry-run           Print the plan; write nothing
 *   --force             Ignore caches; refetch/rewrite everything
 *   --no-volumes        Skip the keyword-volume lookup
 *   --poll <sec>        DataForSEO queue poll interval (default 6)
 *   --max-wait <min>    DataForSEO queue max wait (default 45)
 *
 * DataForSEO (configured market) = SERP/PAA/related/autocomplete/volumes  [rank truth]
 * Brave (global)                 = content-discovery leads                 [content truth]
 * Artifacts                      = .docs/blogpost-generation-engine/output/.cache/<POST_ID>/
 */
import { join } from 'node:path';
import { parseBrief, splitList, slugFromField, refModelHints } from './brief-parser.mjs';
import { dedupe, norm, isBlockedHost, isBlockedUrl } from './dedupe.mjs';
import * as dfs from './dataforseo.mjs';
import * as brave from './brave.mjs';
import { readText, readJson, writeJson, writeText, exists, ensureDir, slugify } from './lib/cache.mjs';
import { clusterFile, postCacheDir, postOutputFile } from './lib/paths.mjs';
import { log } from './lib/log.mjs';

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--help' || k === '-h') a.help = true;
    else if (k === '--offline') a.offline = true;
    else if (k === '--dry-run') a.dryRun = true;
    else if (k === '--force') a.force = true;
    else if (k === '--no-volumes') a.noVolumes = true;
    else if (k === '--post') a.post = argv[++i];
    else if (k === '--cluster') a.cluster = argv[++i];
    else if (k === '--poll') process.env.DF_POLL_MS = String(Number(argv[++i]) * 1000);
    else if (k === '--max-wait') process.env.DF_MAX_WAIT_MS = String(Number(argv[++i]) * 60 * 1000);
    else log.warn(`unknown arg ${k}`);
  }
  return a;
}

const HELP = `Step-1 data harness (one post per run).
  node run-post.mjs --post PB-01 --cluster blogpost-pipeline-1.md [--offline] [--dry-run] [--force]
  --poll <sec>       DataForSEO poll interval (default 6)
  --max-wait <min>   DataForSEO max wait (default 45; safe to re-run — resumes)
  --no-volumes       skip the keyword-volume lookup
  DataForSEO = real SERP + PAA + related + autocomplete + volumes (configured market).
  Brave      = global content-discovery leads.`;

const uniq = (list) => [...new Set(list.filter(Boolean))];

function toQueryPlan(fields) {
  const must = splitList(fields['Must-have keywords']);
  const high = splitList(fields['High-volume']);
  const long = splitList(fields['Long-tail / PAA']);
  const primary = must[0] || high[0] || 'products';
  return { primary, must, high, long, all: uniq([primary, ...must, ...high, ...long]) };
}

/** Group discovery results into a de-duplicated, non-blocked domain set. */
function discoveryDomains(records) {
  const m = new Map();
  for (const rec of records) {
    for (const r of rec.results || []) {
      const d = r.domain || norm(r.url);
      if (!d || isBlockedHost(d) || isBlockedUrl(r.url)) continue;
      const e = m.get(d) || { domain: d, hits: 0, bestRank: Infinity, url: r.url };
      e.hits += 1;
      if (r.rank < e.bestRank) {
        e.bestRank = r.rank;
        e.url = r.url;
      }
      m.set(d, e);
    }
  }
  return [...m.values()].sort((a, b) => b.hits - a.hits || a.bestRank - b.bestRank);
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.post || !args.cluster) {
    process.stdout.write(HELP + '\n');
    process.exit(args.help ? 0 : 1);
  }

  const cacheDir = postCacheDir(args.post);
  const clusterPath = clusterFile(args.cluster);
  if (!exists(clusterPath)) throw new Error(`Cluster file not found: ${clusterPath}`);

  const brief = parseBrief(readText(clusterPath), args.post);
  const slug = slugFromField(brief.fields['Slug']) || slugify(args.post);
  const plan = toQueryPlan(brief.fields);
  const preferred = refModelHints(brief.fields['Ref model']);

  log.step(`POST ${args.post} · slug ${slug}`);
  log.info(`primary "${plan.primary}" · ${plan.all.length} queries · ref-models: ${preferred.join(', ') || 'n/a'}`);
  log.info(`cache: ${cacheDir}`);

  if (args.dryRun) {
    log.step('dry-run query plan:');
    plan.all.forEach((q, i) => log.info(`  ${i + 1}. ${q}`));
    return;
  }

  ensureDir(cacheDir);

  /* ---- 1. SERP (DataForSEO configured market, standard queue: ONE POST then poll) ---- */
  const serpFile = (q) => join(cacheDir, 'serp', `${slugify(q)}.json`);
  const needSerp = plan.all.filter((q) => args.force || !exists(serpFile(q)));
  if (needSerp.length) {
    if (args.offline || !dfs.hasCreds()) {
      log.warn(`serp skipped (${args.offline ? 'offline' : 'no creds'}): ${needSerp.length} query(ies)`);
    } else {
      log.step(`serp batch: ${needSerp.length} queries in 1 call — standard queue may take minutes`);
      const results = await dfs.serpBatch(needSerp, { cacheFile: join(cacheDir, 'serp', '_batch.tasks.json'), force: args.force });
      for (const r of results) writeJson(serpFile(r.keyword), r);
    }
  }
  const sers = [];
  for (const q of plan.all) if (exists(serpFile(q))) sers.push(readJson(serpFile(q)));

  /* ---- 2. Autocomplete ---- */
  const seeds = uniq([plan.primary, ...plan.must, ...plan.high]).slice(0, 5);
  const acFile = (s) => join(cacheDir, 'autocomplete', `${slugify(s)}.json`);
  const needAc = seeds.filter((s) => args.force || !exists(acFile(s)));
  if (needAc.length && !args.offline && dfs.hasCreds()) {
    log.step(`autocomplete batch: ${needAc.length} seed(s)`);
    const results = await dfs.autocompleteBatch(needAc, { cacheFile: join(cacheDir, 'autocomplete', '_batch.tasks.json'), force: args.force });
    for (const r of results) writeJson(acFile(r.keyword), r);
  }
  const autoc = [];
  for (const s of seeds) if (exists(acFile(s))) autoc.push(readJson(acFile(s)));

  /* ---- 3. Keyword volumes (best-effort; never fatal) ---- */
  const volFile = join(cacheDir, 'volumes.json');
  let volumes = exists(volFile) && !args.force ? readJson(volFile) : [];
  if (!volumes.length && !args.noVolumes && !args.offline && dfs.hasCreds()) {
    try {
      log.step(`keyword volumes: ${plan.all.length} keyword(s)`);
      volumes = await dfs.searchVolume(plan.all, { cacheFile: join(cacheDir, 'volumes', '_batch.tasks.json'), force: args.force });
      writeJson(volFile, volumes);
    } catch (e) {
      log.warn(`volumes skipped: ${e.message}`);
    }
  }

  /* ---- 4. Content discovery (Brave global) ---- */
  const discFile = (q) => join(cacheDir, 'discovery', `${slugify(q)}.json`);
  const needDisc = plan.all.filter((q) => args.force || !exists(discFile(q)));
  if (needDisc.length) {
    if (args.offline || !brave.hasBraveKey()) {
      log.warn(`discovery skipped (${args.offline ? 'offline' : 'no BRAVE_API_KEY'}): ${needDisc.length} query(ies)`);
    } else {
      log.step(`content discovery: ${needDisc.length} query(ies) via Brave (global)`);
      await brave.discoveryBatch(needDisc, { cacheDir, force: args.force });
    }
  }
  const discovery = [];
  for (const q of plan.all) if (exists(discFile(q))) discovery.push(readJson(discFile(q)));

  /* ---- 5. Dedupe SERP -> beat-set ---- */
  const dedup = dedupe(sers);
  writeJson(join(cacheDir, 'dedupe.json'), dedup);
  log.ok(`serp: ${dedup.domains.length} domains (${dedup.domains.filter((d) => d.blocked).length} blocked) · discovery: ${discoveryDomains(discovery).length} domains`);

  /* ---- 6. Scaffold reference file ---- */
  const outPath = postOutputFile(args.post, slug);
  if (exists(outPath) && !args.force) {
    log.warn(`output exists, not overwriting (use --force): ${outPath}`);
  } else {
    writeText(outPath, buildScaffold({ postId: args.post, cluster: args.cluster, brief, plan, sers, autoc, dedup, discovery, preferred, volumes }));
    log.ok(`wrote scaffold: ${outPath}`);
  }

  /* ---- 7. Manifest ---- */
  writeJson(join(cacheDir, 'manifest.json'), {
    postId: args.post,
    slug,
    generatedAt: new Date().toISOString(),
    queries: plan.all,
    seeds,
    refModelDomains: preferred,
    serpCount: sers.length,
    volumeCount: volumes.length,
    discoveryCount: discovery.length,
    discoverySource: brave.hasBraveKey() ? 'brave' : 'none',
    outputFile: outPath,
  });
  log.ok('done');
}

/* ------------------------- scaffold ------------------------- */

/** Merge the keyword plan with volume data into ordered, typed rows. */
function keywordTargets(plan, volumes = []) {
  const vol = new Map(volumes.map((v) => [v.keyword, v]));
  const rows = [];
  const seen = new Set();
  const push = (kw, type) => {
    if (!kw || seen.has(kw)) return;
    seen.add(kw);
    const v = vol.get(kw) || {};
    rows.push({ keyword: kw, type, volume: v.volume ?? 'n/a', cpc: v.cpc ?? 'n/a', competition: v.competition ?? 'n/a' });
  };
  push(plan.primary, 'must-have (primary)');
  plan.must.forEach((k) => push(k, 'must-have'));
  plan.high.forEach((k) => push(k, 'high-volume'));
  plan.long.forEach((k) => push(k, 'long-tail/PAA'));
  return rows;
}

function hostOf(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function buildScaffold({ postId, cluster, brief, plan, sers, autoc, dedup, discovery, preferred, volumes = [] }) {
  const L = [];
  const market = dfs.marketLabel();
  const pref = new Set(preferred.map(norm));
  L.push(`# ${postId} — Reference Sheet: ${brief.heading.replace(/^[A-Z]{2}-\d{2}\s*[—-]\s*/, '')}`);
  L.push(`**Run date**: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · **Market**: ${market} · **Primary query**: \`${plan.primary}\``);
  L.push(`**Brief**: \`.docs/blog-research/${cluster}\` · **Status**: scaffold — agent completes §3–§4`);
  L.push('');
  L.push('> §1–§2 auto-generated (real, from cache). **§2 = rank truth** (what to beat).');
  L.push('> **§3 Discovery = content truth** (depth/angles to model). Agent: curate + fetch → §3, synthesise → §4.');
  L.push('');

  /* ---- §1 Brief & handoff ---- */
  L.push('## 1. Brief & handoff');
  L.push('');
  L.push('| Field | Value |');
  L.push('|---|---|');
  L.push(`| Post ID | ${postId} |`);
  for (const [k, v] of Object.entries(brief.fields)) L.push(`| ${k} | ${v} |`);
  L.push('| One insight | <!-- agent: 1 sentence — provisional thesis; Step 2 (carve) confirms scope --> |');
  L.push('| Role | <!-- agent: hub or spoke + link direction --> |');
  L.push('');
  L.push(`**Keyword targets** (volume = DataForSEO ${market}):`);
  L.push('');
  L.push('| Keyword | Type | Volume | CPC | Competition |');
  L.push('|---|---|---|---|---|');
  for (const r of keywordTargets(plan, volumes)) L.push(`| ${r.keyword} | ${r.type} | ${r.volume} | ${r.cpc} | ${r.competition} |`);
  L.push('');

  /* ---- §2 Rank truth ---- */
  L.push(`## 2. Rank truth (${market} — what to beat)`);
  L.push('');
  for (const s of sers) {
    L.push(`### \`${s.keyword}\`  `);
    L.push(`Item types: ${(s.itemTypes || []).join(', ') || 'n/a'} · PAA: ${s.paa.length}`);
    L.push('');
    L.push('| # | URL | Title |');
    L.push('|---|---|---|');
    for (const o of s.organic.slice(0, 5)) L.push(`| ${o.rank} | ${o.url} | ${o.title || ''} |`);
    L.push('');
    const rest = s.organic.slice(5, 10);
    if (rest.length) L.push(`Also ranked (6–10): ${rest.map((o) => `${o.rank} ${hostOf(o.url)}`).join(' · ')}`);
    if (s.paa.length) {
      L.push('');
      L.push('PAA:');
      for (const q of s.paa) L.push(`- ${q.question}`);
    }
    if (s.related.length) {
      L.push('');
      L.push(`Related: ${uniq(s.related).join(' · ')}`);
    }
    L.push('');
  }

  L.push(`### Autocomplete (${market})`);
  L.push('');
  for (const a of autoc) L.push(`- **${a.keyword}**: ${uniq(a.suggestions).join(' · ')}`);
  L.push('');

  L.push('### Domain frequency (top-10)');
  L.push('');
  L.push('| Domain | Hits | Best rank | Queries | Blocked |');
  L.push('|---|---|---|---|---|');
  for (const d of dedup.domains.slice(0, 25)) L.push(`| ${d.domain} | ${d.hits} | ${d.bestRank} | ${d.queries.length} | ${d.blocked ? 'yes' : ''} |`);
  L.push('');

  /* ---- §3 Source corpus ---- */
  L.push('## 3. Source corpus');
  L.push('');
  L.push('### Discovery leads (Brave global — content truth)');
  L.push('');
  const dd = discoveryDomains(discovery);
  if (dd.length) {
    L.push('| Domain | Hits | Best rank | Ref-model | Example URL |');
    L.push('|---|---|---|---|---|');
    for (const d of dd.slice(0, 35)) L.push(`| ${d.domain} | ${d.hits} | ${d.bestRank} | ${pref.has(norm(d.domain)) ? 'yes' : ''} | ${d.url} |`);
  } else {
    L.push('_n/a — no discovery data (Brave key missing or offline)._');
  }
  L.push('');
  L.push('<!-- TODO agent: curate ~10–14 (ref-model always + MIRROR/BEAT/CITE), fetch each, then ONE entry per source:');
  L.push('     ### [n] Title — domain (tag) · H1/format/words/date+author · Outline · E-E-A-T · Angle/weakness · Facts · Take -->');
  L.push('');

  /* ---- §4 Blueprint ---- */
  L.push('## 4. Blueprint');
  L.push('<!-- TODO agent: H1 + tagged H2/H3 (keyword/PAA + §3 items) · word band · schema · snippet/AI target · media · annotated links');
  L.push('     + must-cover table (item × type × seen-in × consensus × angle; keyword/PAA mapped) · contradictions & fact-checks · first-hand gaps');
  L.push('     + E-E-A-T play (≤5 bullets) · references key · method log -->');
  L.push('');
  L.push('---');
  L.push('');
  L.push(`_Method_: DataForSEO (standard queue, ${market}): SERP + PAA + related + autocomplete${volumes.length ? ' + volumes' : ''}. Brave (global): content discovery. ${new Date().toISOString()}.`);
  return L.join('\n') + '\n';
}

run().catch((e) => {
  log.error(e.stack || String(e));
  process.exit(1);
});
