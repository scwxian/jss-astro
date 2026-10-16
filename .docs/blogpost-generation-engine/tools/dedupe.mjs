/** Merge N SERP snapshots into a de-duplicated, readable working set. */

function safeHost(u) {
  try {
    return new URL(u).host.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Normalise a domain or URL-ish string to a bare host. */
export function norm(d) {
  return String(d || '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
}

/**
 * Hosts that are social / forum / video / marketplace / search-result aggregators.
 * Never useful as editorial references.
 */
const BLOCK_HOST = new Set([
  'facebook.com', 'fb.com', 'fb.watch', 'm.facebook.com',
  'instagram.com', 'tiktok.com', 'threads.com', 'threads.net', 'pinterest.com',
  'youtube.com', 'youtu.be', 'reddit.com', 'quora.com', 'twitter.com', 'x.com',
  'linkedin.com', 'whatsapp.com', 'telegram.org', 't.me', 'discord.com',
  'shopee.com', 'lazada.com', 'carousell.com', 'amazon.com', 'ebay.com',
]);

/** Path prefixes that signal a listing / commerce / search page, not an article. */
const BLOCK_PATH = /^\/(?:collections?|products?|tags?|categories?|search|shop|store|cart|checkout|account|login|sign-?in|sign-?up)\b/i;

export function isBlockedHost(domain) {
  const h = norm(domain);
  for (const b of BLOCK_HOST) if (h === b || h.endsWith(`.${b}`)) return true;
  return false;
}

export function isBlockedUrl(url) {
  try {
    let path = new URL(url).pathname;
    path = path.replace(/^\/[a-z]{2}(?:-[a-z]{2})?(?=\/)/i, ''); // drop a leading locale segment (/en/, /en-gb/, …)
    return BLOCK_PATH.test(path);
  } catch {
    return false;
  }
}

/** Pick the most-useful URL for a domain: non-blocked, best rank. */
function pickBestUrl(urls, rankOf) {
  const ok = urls.filter((u) => !isBlockedUrl(u));
  const pool = ok.length ? ok : urls;
  return pool.slice().sort((a, b) => (rankOf(a) ?? 999) - (rankOf(b) ?? 999))[0] || urls[0] || null;
}

/**
 * @param {Array<{keyword:string, organic:Array, paa:Array, related:Array}>} sers
 */
export function dedupe(sers) {
  const domains = new Map();
  const paa = new Map();
  const related = new Set();

  for (const s of sers) {
    for (const o of s.organic || []) {
      const d = o.domain || safeHost(o.url);
      if (!d) continue;
      const e = domains.get(d) || { domain: d, hits: 0, bestRank: Infinity, queries: [], urlRanks: new Map() };
      const rank = o.rank ?? 999;
      e.hits += 1;
      e.bestRank = Math.min(e.bestRank, rank);
      e.queries.push(s.keyword);
      if (o.url) e.urlRanks.set(o.url, Math.min(e.urlRanks.get(o.url) ?? 999, rank));
      domains.set(d, e);
    }
    for (const q of s.paa || []) {
      if (!q.question) continue;
      const prev = paa.get(q.question) || { question: q.question, url: q.url || null, seen: 0 };
      prev.seen += 1;
      paa.set(q.question, prev);
    }
    for (const r of s.related || []) related.add(String(r));
  }

  const ranked = [...domains.values()]
    .map((e) => {
      const urls = [...e.urlRanks.keys()];
      const hosted = isBlockedHost(e.domain);
      const allPathsBlocked = urls.length > 0 && urls.every(isBlockedUrl);
      return {
        domain: e.domain,
        hits: e.hits,
        bestRank: e.bestRank,
        queries: [...new Set(e.queries)],
        urls,
        bestUrl: pickBestUrl(urls, (u) => e.urlRanks.get(u)),
        blocked: hosted || allPathsBlocked,
      };
    })
    .sort((a, b) => b.hits - a.hits || a.bestRank - b.bestRank);

  return {
    domains: ranked,
    paa: [...paa.values()].sort((a, b) => b.seen - a.seen),
    related: [...related],
  };
}
