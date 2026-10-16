#!/usr/bin/env node
/** Offline self-test for the Step-1 data harness (no network, no creds). */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBrief, listBriefs, splitList, slugFromField, refModelHints } from './brief-parser.mjs';
import { dedupe, isBlockedUrl, isBlockedHost, norm } from './dedupe.mjs';
import { normalizeBrave } from './brave.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (n) => readFileSync(join(HERE, 'fixtures', n), 'utf8');

let pass = 0;
let fail = 0;
function check(name, cond, extra = '') {
  if (cond) {
    pass++;
    process.stdout.write(`  ok   ${name}\n`);
  } else {
    fail++;
    process.stdout.write(`  FAIL ${name} ${extra}\n`);
  }
}

process.stdout.write('brief-parser\n');
const briefMd = read('brief-sample.md');
const briefs = listBriefs(briefMd);
check('listBriefs finds 2 posts', briefs.length === 2, `got ${briefs.length}`);
const pb01 = parseBrief(briefMd, 'PB-01');
check('PB-01 slug field parsed', pb01.fields['Slug'].includes('what-is-stainless-steel-cookware'));
check('slugFromField strips /blog/', slugFromField(pb01.fields['Slug']) === 'what-is-stainless-steel-cookware');
check('splitList must-have = 2', splitList(pb01.fields['Must-have keywords']).length === 2);
check('splitList long-tail = 3', splitList(pb01.fields['Long-tail / PAA']).length === 3);
check('refModelHints defaults to no aliases', refModelHints(pb01.fields['Ref model']).length === 0);
check('refModelHints maps configured alias', refModelHints('BrandX guide', { brandx: 'brandx.example' }).join(',') === 'brandx.example');

process.stdout.write('dedupe\n');
const sers = JSON.parse(read('serp-sample.json'));
const dd = dedupe(sers);
check('dedupe merges recurring domain', dd.domains[0].domain === 'example-cookware.com' && dd.domains[0].hits === 2);
check('dedupe collects PAA', dd.paa.length === 2, JSON.stringify(dd.paa));
check('dedupe collects related', dd.related.length >= 2);

process.stdout.write('blocking\n');
const noisy = [
  {
    keyword: 'k',
    organic: [
      { rank: 1, url: 'https://www.facebook.com/x/posts/1', domain: 'facebook.com', title: 'fb' },
      { rank: 2, url: 'https://www.youtube.com/watch?v=abc', domain: 'youtube.com', title: 'yt' },
      { rank: 3, url: 'https://shopexample.com/collections/cookware', domain: 'shopexample.com', title: 'listing' },
      { rank: 4, url: 'https://en.wikipedia.org/wiki/Cookware', domain: 'en.wikipedia.org', title: 'wiki' },
    ],
    paa: [],
    related: [],
  },
];
const dd2 = dedupe(noisy);
check('blocked host flagged (facebook)', dd2.domains.find((d) => d.domain === 'facebook.com')?.blocked === true);
check('listing-path domain flagged (shopexample)', dd2.domains.find((d) => d.domain === 'shopexample.com')?.blocked === true);
check('editorial domain not flagged (wikipedia)', dd2.domains.find((d) => d.domain === 'en.wikipedia.org')?.blocked === false);
check('isBlockedUrl collections', isBlockedUrl('https://x.com/collections/a'));
check('isBlockedUrl locale-prefixed collection', isBlockedUrl('https://shopexample.com/ms/collections/cookware'));
check('isBlockedHost reddit', isBlockedHost('reddit.com'));
check('norm strips scheme/www/path', norm('https://www.ExampleBrand.com/blog/x') === 'examplebrand.com');

process.stdout.write('brave\n');
const braw = normalizeBrave([
  { url: 'https://www.example-cookware.com/blog/x?a=1&srsltid=abc#h', title: 'EC', description: 'd', meta_url: { hostname: 'example-cookware.com' } },
  { url: 'https://homereviews.com/2020/09/x/?utm_source=brave', title: 'HR', description: null },
]);
check('normalizeBrave ranks from 1', braw[0].rank === 1 && braw[1].rank === 2);
check('normalizeBrave strips srsltid', !braw[0].url.includes('srsltid'), braw[0].url);
check('normalizeBrave strips utm_', !braw[1].url.includes('utm_'), braw[1].url);
check('normalizeBrave maps hostname', braw[0].domain === 'example-cookware.com', String(braw[0].domain));

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
