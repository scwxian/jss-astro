# Blog Post Generation Tools (Step 1 data harness)

Internal dev tooling for the blog-post-generation pipeline. **Not shipped, not imported by app code.**
Node (>=20), zero deps. One post per run. Generic across all posts and markets.

**Data only — no page scraping.** Two corpora, two truths:

| Corpus | Provider | Truth |
|---|---|---|
| SERP · PAA · related · autocomplete · volumes | **DataForSEO** (configured market, standard queue) | **rank truth** — what to beat |
| Content-discovery leads | **Brave** (global index) | **content truth** — depth/quotes/angles |

The agent curates the source corpus from the Brave leads + the local beat-set, fetches each source with its own tools, and writes the analysis (§3 Source corpus + §4 Content inventory).

## Setup

1. `cp .env.example .env` (same dir); fill `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `BRAVE_API_KEY`.
2. `.env` is gitignored. Separate from Cloudflare `.dev.vars` — no prod conflict.
3. No `npm install` (zero runtime deps).

## Configure

**Fill in your market** in `.env` — required for every DataForSEO call:

| Var | Meaning |
|---|---|
| `DF_LOCATION_CODE` | numeric DataForSEO location code for the market you target |
| `DF_LOCATION_NAME` | human label for that market (used in logs + scaffold); optional |
| `DF_LANGUAGE` | language code (default `en`) |

Look location codes up: https://docs.dataforseo.com/v3/appendix/locations_and_languages/
If `DF_LOCATION_CODE` is not set, `dataforseo.mjs` **throws with a clear message** on its first network call.

Other config:

- `BRAVE_API_KEY` (required for discovery), `BRAVE_COUNTRY` (optional, default `all`).
- `GCLOUD_KGS_KEY` (optional; `entitycheck.mjs --kgs`).
- `ENTITY_NAMES` / `ENTITY_SITE` (optional; `entitycheck.mjs`).
- `DF_POLL_MS` / `DF_MAX_WAIT_MS` (optional; standard-queue polling).

**Cluster inputs are user-supplied.** Add your cluster brief files to `.docs/blog-research/` (one file per cluster) and pass the filename via `--cluster`.

## Usage

```sh
node run-post.mjs --post PB-01 --cluster blogpost-pipeline-1.md             # data scaffold (both vendors)
node run-post.mjs --post PB-01 --cluster blogpost-pipeline-1.md --dry-run  # print query plan
node run-post.mjs --post PB-01 --cluster blogpost-pipeline-1.md --offline  # cache only
node run-post.mjs --post PB-01 --cluster blogpost-pipeline-1.md --force    # refetch everything
node run-post.mjs --help
node selftest.mjs                                                         # offline logic tests
```

Flags: `--offline` · `--dry-run` · `--force` · `--no-volumes` · `--poll <sec>` · `--max-wait <min>`.

## What it does

1. Parses the brief → query plan (primary + must-have / high-volume / long-tail).
2. **DataForSEO** (configured market, standard queue, one batched POST then poll): SERP + PAA + related + item types, autocomplete, keyword volumes.
3. **Brave global**: one web search per query → content-discovery leads (deduped, blocklist-filtered).
4. Writes a scaffold reference sheet; the analyst completes the analysis sections.

## Scaffold sections

`§1` Brief & handoff · `§2` Rank truth (configured market). Step 1 then writes `§3` Source corpus + `§4` Content inventory & candidate scope; **Step 2 carves**, Step 3 drafts, Step 4 reviews.

## Source selection (agent, §4 of step-1)

Corpus = **ref-models ∪ local top-5 (BEAT) ∪ Brave editorial (MIRROR) ∪ authorities (CITE)**. Never model content off the thin local top-10. `dedupe.mjs` blocks social/forum/video/marketplace hosts and listing/commerce paths (`/collections/`, `/product/`, … incl. locale-prefixed like `/en/collections/`).

## Queue behaviour (DataForSEO standard queue)

Async: `task_post` returns ids, results arrive later (~1–5 min; up to ~40–60 min at peak).

- **One batched POST** (≤100 tasks), then polls `task_get/{id}`.
- **Resumable**: ids cached (`serp/_batch.tasks.json`); re-run resumes polling — `task_get` is free.
- Tunables: `--poll <sec>` (6) · `--max-wait <min>` (45).

## Outputs

| Path | Content |
|---|---|
| `../output/<POST_ID>-<slug>-references.md` | scaffold reference sheet (analyst completes) |
| `../output/<POST_ID>-<slug>-migrated-content.md` | verbatim copy carved from another post (draft seed — not auto-generated) |
| `../output/.cache/<POST_ID>/serp/*.json` | SERP + PAA + related |
| `../output/.cache/<POST_ID>/autocomplete/*.json` | suggestions |
| `../output/.cache/<POST_ID>/volumes.json` | keyword volumes |
| `../output/.cache/<POST_ID>/discovery/*.json` | Brave global leads |
| `../output/.cache/<POST_ID>/dedupe.json` | domain-frequency beat-set |
| `../output/.cache/<POST_ID>/manifest.json` | run provenance |

Cache is resumable; `--force` refetches.

## Entity monitoring (`entitycheck.mjs`)

Separate mini-tool: does Google resolve **your brand** (and its people) as an entity? Reads the real **Google Knowledge Panel**, not just the legacy API. Three layers:

| Layer | Source | Proves |
|---|---|---|
| **A. Panel** (primary) | DataForSEO live advanced `knowledge_graph` item | Is there a real Knowledge Panel? `title` · `type` · `cid` · attributes · profiles(sameAs) |
| **B. Upstream** | Wikidata (`Special:EntityData/<QID>`) | Entity claim completeness + gaps (leading indicator) |
| **C. Numeric** (`--kgs`) | Knowledge Graph Search API v1 | Google's numeric `resultScore` (legacy; opt-in) |

Entities are configurable — no brand is hardcoded. Pass `--entity "<name>"` (repeatable) or set `ENTITY_NAMES`; append `=QID` to also run the Wikidata layer.

Note: KGS v1 **false-negatives** small entities (brand panel exists while v1 returns nothing) — panel is truth.

```sh
node entitycheck.mjs --entity "Your Brand"          # panel -> verdict (RESOLVED/AMBIGUOUS/ABSENT)
node entitycheck.mjs --entity "Your Brand=Q123"     # + Wikidata readiness
node entitycheck.mjs --kgs                          # + resultScore from Knowledge Graph API v1
node entitycheck.mjs --site                         # + audit live site JSON-LD identity graph (ENTITY_SITE)
node entitycheck.mjs --save                         # snapshot -> output/.cache/entity/<iso>.json
node entitycheck.mjs --diff                         # before/after delta vs latest snapshot
node entitycheck.mjs --q "query"                    # ad-hoc panel lookup
```

If no entities are configured, the tool exits with a clear message telling you to pass `--entity` or set `ENTITY_NAMES`.

Panel data is also captured in every SERP snapshot as `knowledgeGraph` (advanced organic results).

## Testing

- `node selftest.mjs` — brief parsing, dedupe/blocklist, Brave normalisation (offline).
- **Acceptance test**: regenerate a post's sheet, cross-check against the hand-built output (source coverage, PAA, numbers, consensus gaps).
