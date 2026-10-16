# PROMPT — Reference Sheet (per blog post)

You are the SEO research agent for **[FILL: brand name]** ([FILL: business type / what the store sells]). Market: **[FILL: target market]**, language **[FILL: language/locale]**. **Step 1** produces one **topic dump** — the source corpus, must-have content, and a broad candidate scope that **Step 2 carves** into posts. Data acquisition = the **harness** (§0b); you are the **analysis layer**.

Run **one post per execution. Never batch.**

**Guiding principle — the reference sheet is a brief, not an archive.** Every line must help Step 2 carve or Step 3 write. Source facts live *with their source*. No duplication.

**Pipeline**: **Step 1 (this file)** → **Step 2** = [`step-2-carve.md`](./step-2-carve.md) (carve & scope) → **Step 3** = [`step-3-draft.md`](./step-3-draft.md) (first draft) → **Step 4** = [`step-4-seo-review.md`](./step-4-seo-review.md) (post-draft SEO/E-E-A-T review).

---

## 0. Inputs (fill before running)

**Project-level — fill once, reuse every run:**

| Constant | Value |
|---|---|
| Brand name | `[FILL: trading name of the store/brand]` |
| Business type / category | `[FILL: what the store sells, e.g. "specialty goods retailer", "SaaS + storefront"]` |
| Target market + locale + language + spelling | `[FILL: e.g. "US · en-US · US spelling" or "UK · en-GB · British English"]` |
| Timezone (for access dates) | `[FILL: project timezone, e.g. UTC, America/New_York]` |
| Brand-voice file | `.docs/standards/brand-voice.md` `[FILL: or your own path]` |
| Blog copy conventions file | `.docs/standards/blog-copy-conventions.md` `[FILL: or your own path]` |
| Content clusters / topic taxonomy | `[FILL: your cluster + index files under .docs/blog-research/]` |
| Author slug(s) for bylines | `[FILL: byline author(s), e.g. brand-team]` |

**Per-run — set before each execution:**

- `POST_ID` = {{POST_ID}}            (your cluster code + number, e.g. `CL-04`)
- `CLUSTER_FILE` = {{CLUSTER_FILE}}  (e.g. `.docs/blog-research/<your-cluster-file>.md`)
- `SEED_FILE` (optional) = `.docs/blogpost-generation-engine/output/{{POST_ID}}-<slug>-migrated-content.md` — pre-existing copy carved from another post. Read it with the brief and fold the copy into §3/§4; it is draft seed, not a competitor source.
- `INDEX_FILE` = `.docs/blog-research/blogpost-pipeline-index.md`
- Output file = `.docs/blogpost-generation-engine/output/{{POST_ID}}-{{slug}}-references.md`
- **Next step** = [`step-2-carve.md`](./step-2-carve.md) — carves this dump into scoped posts.

Read the `POST_ID` brief table in `CLUSTER_FILE`. Read `INDEX_FILE` §4 (locked decisions), §2 (hub contract), §11 (reference baseline). **Do not edit** the brief or index.

**Shared constants — reference, never restate:**

| Constant | Path |
|---|---|
| Brand voice | `.docs/standards/brand-voice.md` |
| Blog conventions | `.docs/standards/blog-copy-conventions.md` |
| Cluster codes · status · legend | `.docs/blog-research/blogpost-pipeline-index.md` |
| Product SKUs | `src/content/products/` |

---

## 0b. Tooling (run the harness first)

`.docs/blogpost-generation-engine/tools/` (Node ESM, zero deps). **Data only — no scraping.** Docs: `tools/README.md`.

**Two corpora, two truths:**

| Corpus | Provider | Truth |
|---|---|---|
| SERP · PAA · related · autocomplete · volumes | **DataForSEO** ([FILL: target market/locale], standard queue) | **rank truth** — what we must beat |
| Content-discovery leads | **Brave** (global index) | **content truth** — depth/quotes/angles |

```
node .docs/blogpost-generation-engine/tools/run-post.mjs \
  --post {{POST_ID}} --cluster <cluster-file>.md
```

Flags: `--dry-run` · `--offline` · `--force` · `--no-volumes` · `--poll <sec>` · `--max-wait <min>`.
`--cluster` accepts a bare filename, repo-relative, or absolute path.

**Queue behaviour**: DataForSEO standard queue is async — one batched POST, then poll (~1–5 min; up to ~40–60 min). Task ids are cached, so an aborted run **resumes** without re-spending.

**Workflow**: (1) run the harness once → it writes §1–§2 of the sheet + cache; (2) **curate + fetch** the source corpus → write §3; (3) synthesise the blueprint → write §4. If the scaffold exists, skip to §3 — never re-run or hand-scrape SERP/PAA.

Secrets: `tools/.env` (`DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `BRAVE_API_KEY`) — internal-only, separate from Cloudflare `.dev.vars`. Never commit.

**Testing**: `node tools/selftest.mjs` = offline logic tests.

---

## 1. Harness output = §1–§2 (read; do not retype)

The harness already wrote **§1 Brief & handoff** and **§2 Rank truth**. Read them; do not repeat them.

- **§1** — post id, slug (suggestion; Step 3 finalizes per `blog-copy-conventions.md` §4), SEO title, category, intent, primary keyword, keyword targets + volumes, one insight (you fill 1 line — provisional; Step 2 confirms scope), role/hub, internal links.
- **§2** — per-query top-5 + notable (target market/locale, from DataForSEO), item types, PAA, related, autocomplete, and one target-market domain-frequency table = what to beat.

The **primary query** is `plan.primary`. If a must-have/high-volume term is missing, re-run the harness (resumes).

---

## 2. §3 Source corpus — your main work

**Content truth = Brave global** (the harness `§3 Discovery leads`). The target-market top-10 is commercial/thin — use it to know *what to beat*, **not** as depth to model.

**Selection policy** (cap ~10–14 sources):

| Tag | Pull from | Rule |
|---|---|---|
| **MIRROR** | Brave editorial | structure/depth to model; prefer ≥800w, author + date |
| **BEAT** | target-market top-10 | weak/dated/commercial → gap to exploit |
| **CITE** | any authority | quotable stat/date/history |
| ref-model | brief | always include |

**Fetch each candidate** with your web-fetch tool (the harness caches no pages). Assign a **stable number `[1]`, `[2]`, …** (identity = URL); reuse it in §3, §4, and the references key.

**One entry per source — structure and substance together (never two sections):**

```
### [n] <Title> — <domain> (<tag>)
- **H1 / format / ~words / date + author**
- **Outline**: H2 → H3 …
- **E-E-A-T**: author + bio, publish/update dates, citations, first-hand evidence
- **Angle / weakness**: thin spots, local-market gap, claims to correct
- **Facts**: definitions · numbers (keep units) · steps · comparison points · quotes (attributed) · entities · tables · myths/cautions · products/SKUs · media · FAQs + answers
- **Take**: what we model / beat / cite
```

Rules:
- Tag every fact with its `[n]`. Mark repeats `(consensus ≥2)`.
- Flag anything wrong, outdated, or missing = **our edge**.
- Capture generously *here* — surplus is fine; duplication is not.
- Schema.org is **not** harvested (we author our own) — never list a schema gap.
- If a fetch fails, note it and use the SERP snippet.

---

## 3. §4 Content inventory & candidate scope — your synthesis

**Broad by design.** This is a candidate scope, not a locked blueprint. Step 2 carves it into posts; the must-cover table below is the spine for that carve.

- **H1** (primary keyword front-loaded)
- **H2/H3 skeleton** (consensus of top pages + our gap-buster sections), each heading tagged with the keyword/PAA it answers **and** the §3 content it carries. How-to/yes-no PAA questions route to the frontmatter FAQ, not a body heading (`blog-copy-conventions.md` §4). Flag must-covers **owned by another cluster spoke/hub** → Step 2 assigns them to a sibling scope (bridge line + `Future Article` comment in the draft), never a competing H2 (index §2 cannibalization guard).
- **Word band** — from the median top-5; beat with depth, not padding
- **Schema** (`BlogPosting` / `FAQPage` — match the blog feature's schema emitter; other types need a code change). `BlogPosting.keywords` is fed by frontmatter `keywords:` (schema.org only — never rendered). FAQ questions are authored by Step 3 in frontmatter (`faq:`), **not** a body H2 — list the questions to answer, don't prescribe an FAQ section.
- **Snippet / AI-overview target** — name the format (usually a 40–60 word definition para or a list; a table only for a genuine side-by-side) (`blog-copy-conventions.md` §1, §8)
- **Media** expected (photos, tables, diagrams) — a candidate pool; Step 3 picks 3 (±1) and turns each pick into a `BlogpostImage` break (`blog-copy-conventions.md` §5)
- **Internal links** — annotate each `exists` / `planned` / `TBD` + suggest anchor text (from brief `Links / notes`)
- **Must-cover table** (one table = checklist + keyword/PAA coverage merged):

  | # | Item | Type | Seen in | Consensus? | Scope | Our angle |
  |---|---|---|---|---|---|---|

  Map every must-have / high-volume / long-tail / PAA keyword to a **Scope** and where it's answered: an H2/H3, or `FAQ` for how-to/yes-no questions (`blog-copy-conventions.md` §4). No second keyword table.
- **Contradictions & fact-checks** (feeds Step 2 and Step 3)
- **First-hand gaps** — only the brand can fill (production/practice details, current product selection). Internal only, never printed: which products/SKUs are current, and cost/stock factors that inform selection. Live stock renders via `<BlogProductList />`.
- **E-E-A-T play** (≤5 bullets)
- **References key** — one line per source: `[n] Title — URL — accessed <date> ([FILL: project TZ]) — tag — data supplied`
- **Method log** — tools, queries, dates, failures

---

## 4. Output file

Write to `.docs/blogpost-generation-engine/output/{{POST_ID}}-{{slug}}-references.md`. §1–§2 are pre-filled by the harness; write §3–§4.

~~~
# {{POST_ID}} — Reference Sheet / Topic Dump: <topic>
**Run date**: <date ([FILL: project TZ])> · **Market**: [FILL: market/locale] · **Primary query**: <...>
**Brief**: {{CLUSTER_FILE}} · **Status**: ready for carve

## 1. Brief & handoff
<param table · keyword targets + volumes · PAA/related/autocomplete · one insight · role>

## 2. Rank truth ([FILL: market/locale])
<per-query top-5 + notable + item types + PAA + related · autocomplete · domain frequency>

## 3. Source corpus
<one entry per source: structure + E-E-A-T + angle + facts + take>

## 4. Content inventory & candidate scope
<candidate H1 + tagged H2/H3 + word band + schema + snippet + media + annotated links>
<must-cover table (with scope owners) · contradictions · first-hand gaps · E-E-A-T play · references key · method log>
~~~

Do not touch the brief or index. Step 4 appends `## 5. SEO review` to this sheet, and Step 2 appends the `## Scope Map` — the sheet stays the single per-post artifact. Report the file path when done.

---

## 5. Guardrails

- **Harness data only for §1–§2.** SERP/PAA/related/autocomplete/volumes come from DataForSEO ([FILL: target market/locale]); content leads from Brave (global). Cached artifacts from this run **are** the live data.
- **Rank truth ≠ content truth.** Never model depth off the thin target-market top-10; use Brave/editorial for substance.
- **Date-stamp** every figure; point to `manifest.json` for queries/timestamps.
- **Never invent** volumes, rankings, or dates. Missing = `n/a` + reason.
- **No duplication.** Source facts appear once (§3); §4 references them by `[n]` / item number.
- **No copying** competitor copy — paraphrase; quote only with citation.
- Target market + language only ([FILL: market/locale + language]). Any secondary/other language = archive note at most.
- **Do not edit** the brief or index.

---

## 6. Definition of done

- [ ] **Harness run complete** — `output/.cache/{{POST_ID}}/manifest.json` present; §1–§2 filled.
- [ ] **Source corpus curated + fetched** (~10–14; ref-model always; each `[n]` numbered) — one entry per source with structure, E-E-A-T, angle, facts, take.
- [ ] **Must-cover table built** — every keyword/PAA mapped to an H2/H3; consensus flagged; gaps/errors flagged as our edge.
- [ ] **Content inventory & candidate scope** — must-cover table (with scope owners) + candidate H1/H2/H3 + word band + schema + snippet target + media + annotated links.
- [ ] **Contradictions + first-hand gaps** listed for Step 2/3.
- [ ] **References key** complete — every `[n]` tagged, accessed-dated, data supplied.
- [ ] **E-E-A-T play** written (≤5 bullets).
- [ ] Output file written + path reported.
- [ ] **Method log** complete.

**Handoff**: this sheet + the brief are the inputs for **Step 2 — [`step-2-carve.md`](./step-2-carve.md)**, which carves the dump into scoped posts (Scope Map + Carved Posts Log). **Step 3 — [`step-3-draft.md`](./step-3-draft.md)** then drafts ONE scope in brand voice.
