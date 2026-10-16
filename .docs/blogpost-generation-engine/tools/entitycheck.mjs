#!/usr/bin/env node
/**
 * Entity-resolution monitor — does Google know your brand (and its people)?
 *
 *   node entitycheck.mjs --entity "Your Brand"        # panel -> Wikidata -> verdict
 *   node entitycheck.mjs --entity "Your Brand=Q123"   # + Wikidata QID for that entity
 *   node entitycheck.mjs --kgs                        # + Knowledge Graph API v1 resultScore (numeric)
 *   node entitycheck.mjs --site                       # + audit live site JSON-LD identity graph
 *   node entitycheck.mjs --save                       # write snapshot to output/.cache/entity/<iso>.json
 *   node entitycheck.mjs --diff                       # delta vs latest prior snapshot
 *   node entitycheck.mjs --q "text"                   # ad-hoc panel lookup for one query
 *
 * Entities come from `--entity <name[=QID]>` (repeatable) or ENTITY_NAMES (comma-separated).
 * Layer B (Wikidata) runs for entities that carry a QID. The site audit uses ENTITY_SITE.
 *
 * Signal layers:
 *   A. Google Knowledge Panel  (DataForSEO live advanced)  -> verdict: resolved?
 *   B. Wikidata entity         (QIDs in --entity)          -> upstream readiness/gaps
 *   C. Knowledge Graph API v1  (--kgs, GCLOUD_KGS_KEY)     -> Google numeric resultScore
 * Env: DATAFORSEO_LOGIN/PASSWORD, DF_LOCATION_CODE, GCLOUD_KGS_KEY, ENTITY_NAMES, ENTITY_SITE (tools/.env)
 */
import { join } from 'node:path';
import { readdirSync } from 'node:fs';
import { knowledgePanel } from './dataforseo.mjs';
import { request, requestJson } from './lib/http.mjs';
import { env } from './lib/env.mjs';
import { readJson, writeJson, exists } from './lib/cache.mjs';
import { log } from './lib/log.mjs';
import { ENGINE_OUTPUT_DIR } from './lib/paths.mjs';

const KG_API = 'https://kgsearch.googleapis.com/v1/entities:search';
const WD_API = 'https://www.wikidata.org/wiki/Special:EntityData';
const ENTITY_DIR = join(ENGINE_OUTPUT_DIR, '.cache', 'entity');

const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** "Name" or "Name=QID" -> target. */
function targetOf(entry) {
  const [name, qid] = String(entry).split('=').map((s) => s.trim());
  return { label: name, query: name, expectName: new RegExp(escapeRegExp(name), 'i'), qid: qid || null };
}

/** Entities from `--entity <name[=QID]>` (repeatable) or ENTITY_NAMES (comma-separated). */
function buildTargets(argv) {
  const cli = [];
  for (let i = 0; i < argv.length; i++) if (argv[i] === '--entity') cli.push(argv[i + 1]);
  const raw = cli.filter(Boolean);
  const list = raw.length ? raw : String(env('ENTITY_NAMES') || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!list.length) {
    throw new Error('No entities configured. Pass --entity "<name>" (repeatable) or set ENTITY_NAMES in tools/.env — see .env.example.');
  }
  return list.map(targetOf);
}

/* ---------------------- Layer C: Knowledge Graph API (opt-in) ---------------------- */

export async function kgsQuery(query) {
  const p = new URLSearchParams({ key: env('GCLOUD_KGS_KEY', { required: true }), query, limit: '10' });
  const j = await requestJson(`${KG_API}?${p}`);
  if (j.error) throw new Error(`KGS ${j.error.status}: ${j.error.message}`);
  return (j.itemListElement || []).map((it) => ({
    score: it.resultScore ?? 0,
    name: it.result.name,
    mid: it.result['@id'],
    types: it.result['@type'] || [],
  }));
}

/* ---------------------- Layer B: Wikidata entity readiness ---------------------- */

const WD_WANT = [
  ['P31', 'instance of'], ['P17', 'country'], ['P856', 'official website'],
  ['P571', 'inception'], ['P452', 'industry'], ['P112', 'founded by'],
  ['P2002', 'X'], ['P2003', 'instagram'], ['P4264', 'linkedin'],
];

export async function wikidata(qid) {
  const j = await requestJson(`${WD_API}/${qid}.json`, { headers: { 'User-Agent': 'entitycheck/1.0' } });
  const e = j.entities?.[qid];
  if (!e || e.missing !== undefined) return { qid, found: false };
  const claims = e.claims || {};
  return {
    qid,
    found: true,
    label: e.labels?.en?.value || null,
    description: e.descriptions?.en?.value || null,
    claimsPresent: WD_WANT.filter(([p]) => claims[p]?.length).map(([, n]) => n),
    claimsMissing: WD_WANT.filter(([p]) => !claims[p]?.length).map(([, n]) => n),
    sitelinks: Object.keys(e.sitelinks || {}).length,
  };
}

/* ---------------------- Layer A + verdict ---------------------- */

function verdict(panel, expectName) {
  if (panel && expectName.test(panel.title || '')) return 'RESOLVED';
  if (panel) return 'AMBIGUOUS';
  return 'ABSENT';
}

async function check(target, { kgs } = {}) {
  const { panel } = await knowledgePanel(target.query);
  const status = verdict(panel, target.expectName);
  const rec = { label: target.label, query: target.query, status, panel, kgs: null, wikidata: null };

  log.info(`${status.padEnd(10)} ${target.label.padEnd(10)} panel: ${panel ? `${panel.title} [${panel.type}] cid=${panel.cid}` : '(none)'}`);
  if (panel) {
    log.info(`${' '.repeat(10)} profiles: ${panel.profiles.map((p) => p.title).join(', ') || '-'} | attrs: ${panel.attributes.map((a) => a.name).join(', ') || '-'}`);
  }
  if (target.qid) {
    rec.wikidata = await wikidata(target.qid);
    if (rec.wikidata.found) {
      log.info(`${' '.repeat(10)} wikidata ${target.qid}: ${rec.wikidata.claimsPresent.length} claims, ${rec.wikidata.sitelinks} sitelinks; missing: ${rec.wikidata.claimsMissing.join(', ') || '-'}`);
    } else {
      log.warn(`${' '.repeat(10)} wikidata ${target.qid}: not found`);
    }
  }
  if (kgs) {
    try {
      const results = await kgsQuery(target.query);
      const hit = results.find((r) => target.expectName.test(r.name)) || null;
      rec.kgs = { top: results.slice(0, 3), hit };
      log.info(`${' '.repeat(10)} kgs v1: ${hit ? `${hit.name} score=${hit.score.toFixed(3)}` : `no match (top ${results[0]?.score?.toFixed(3) ?? '-'})`}`);
    } catch (e) {
      rec.kgs = { error: e.message };
      log.warn(`${' '.repeat(10)} kgs v1: ${e.message}`);
    }
  }
  return rec;
}

/* ---------------------- live site JSON-LD identity audit ---------------------- */

export async function siteAudit(site) {
  const html = await (await request(site)).text();
  const nodes = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => { try { return JSON.parse(m[1]); } catch { return null; } })
    .filter(Boolean)
    .flatMap((d) => d['@graph'] || [d]);
  const org = nodes.find((n) => ['LocalBusiness', 'Organization'].includes(n['@type'])) || null;
  const idents = org?.identifier ? [org.identifier].flat() : [];
  const qid = idents.find((i) => i.propertyID === 'Wikidata')?.value || null;
  const rec = { org: !!org, id: org?.['@id'] || null, sameAs: org?.sameAs || [], qid, founders: org?.founder?.length || 0 };
  log.info(`site JSON-LD: org=${rec.org} @id=${rec.id} sameAs=${rec.sameAs.length} wikidata=${rec.qid} founders=${rec.founders}`);
  return rec;
}

/* ---------------------- snapshot + diff ---------------------- */

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

function latestSnapshot() {
  if (!exists(ENTITY_DIR)) return null;
  const files = readdirSync(ENTITY_DIR).filter((f) => f.endsWith('.json')).sort();
  return files.length ? join(ENTITY_DIR, files[files.length - 1]) : null;
}

async function main() {
  const argv = process.argv.slice(2);
  const flag = (f) => argv.includes(f);
  const val = (f) => { const i = argv.indexOf(f); return i > -1 ? argv[i + 1] : null; };

  if (val('--q')) {
    const { panel } = await knowledgePanel(val('--q'));
    log.info(panel ? `${panel.title} [${panel.type}] ${panel.url} cid=${panel.cid}` : 'no panel');
    return;
  }

  const targets = buildTargets(argv);
  const results = [];
  for (const t of targets) results.push(await check(t, { kgs: flag('--kgs') }));

  if (flag('--site')) {
    const site = env('ENTITY_SITE');
    if (!site) log.warn('--site ignored: set ENTITY_SITE in tools/.env');
    else results[0].site = await siteAudit(site);
  }

  if (flag('--diff')) {
    const prevFile = latestSnapshot();
    if (!prevFile) log.warn('no prior snapshot; run --save first');
    else {
      const prev = readJson(prevFile);
      for (const cur of results) {
        const old = prev.results.find((r) => r.query === cur.query);
        if (old && old.status !== cur.status) log.info(`Δ ${cur.query}: ${old.status} -> ${cur.status}`);
      }
    }
  }

  if (flag('--save')) {
    const p = join(ENTITY_DIR, `${stamp()}.json`);
    writeJson(p, { at: new Date().toISOString(), results });
    log.ok('snapshot', p);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { log.error(e.message); process.exit(1); });
}
