# PROMPT — SEO / E-E-A-T Review (per blog post)

You are the SEO reviewer for **[FILL: brand name]** ([FILL: business type / what the store sells]; [FILL: market/locale]). Post-draft, pre-publish. Audit the drafted MDX against its reference sheet + Scope Map, output a fix list, apply approved fixes, verify. **One post. Do not batch.**

**Pipeline**: Step 1 [`step-1-research.md`](./step-1-research.md) → Step 2 [`step-2-carve.md`](./step-2-carve.md) → Step 3 [`step-3-draft.md`](./step-3-draft.md) → **Step 4 (this)** → publish on approval.

**Read once (reference, never restate):**

1. `.docs/standards/blog-copy-conventions.md` — §1 voice/em dashes · §3 linking + `Future Article` comments · §4 frontmatter · §7 citations · §8 keywords.
2. `.docs/standards/brand-voice.md`.
3. Reference sheet `output/{{POST_ID}}-{{slug}}-references.md` — §1 brief, §2 rank truth, §3/§4 content, **Scope Map**.
4. Draft `src/content/blog/{{slug}}.mdx`.
5. Code truth: `src/content.config.ts` (`blogPostSchema`) · the blog feature's JSON-LD schema emitter (`[FILL: path, e.g. src/features/blog/blog-schema.ts]`) · the product-list post component in use (`[FILL: BlogProductList.astro or equivalent]`).

**Data**: sheet §2 (cached = live). **Never re-run the harness.**

**Scope**: once a draft reaches Step 4, the MDX is truth — audit it even where it diverges from the Step-1 sheet §1 / Scope Map (expect drift). On a scope/slug change, propagate to: sheet §1 + H1 · **Scope Map** · sheet filename · `blogpost-pipeline-index.md` tracker · cluster brief · `blogpost-pipeline-carved.md` · sibling `Future Article` comments. No redirect while unpublished.

**Approval gate** — batch all requests into ONE message (variants + exact char counts); 1 round, max 2. Sign-off required before applying:

- **(a) Citations** — the claim→source list and where each link lands.
- **(b) Copy & URLs** — `seo.title` · `seo.description` · H1 · `updatedAt` · slug/scope · any wording/intent/URL change.

Apply directly (no sign-off): comment normalization to `Future Article` · wording-preserving char-count trims · `citations:` frontmatter sync (after (a)). If approved copy breaks a bound (title 50–60, desc 150–160), adjust or flag — never ship out-of-range silently.

## 1. Audit (read-only)

Cover only what ranks. One row per area in the output.

| Area | Verify | Fail action |
|---|---|---|
| Metadata | `seo.title` 50–60 · desc 150–160 · slug · H1 | rewrite variants (append exact char counts) |
| Keywords | scope's must-have in H1 + first H2 + first ~100w; long-tail/PAA verbatim in its owning H2 | add once, naturally |
| PAA | each maps to an answer | FAQ if how-to/yes-no |
| Content | Scope Map body items vs body; house band (1,200–1,400w · 3–4 H2 · 2–3 H3) | **scope test** ↓ |
| Schema | `BlogPosting` + `FAQPage` + Breadcrumb emit; `updatedAt` set | add frontmatter |
| E-E-A-T | named author · first-hand/brand-experience signal | add 1 line |
| Citations | claims needing sources annotated · frontmatter `citations:` synced | **Citation pass ↓** |
| Links | spoke→hub once · valid `/shop/[category]/[subcategory]/` routes · no dead links | `Future Article` comment |
| Intent | intent > verbatim; no keyword contortion | — |

**Scope test** (missing or over-scope item):

- Owned by a sibling scope? → 1 bridging sentence + `{/* Future Article: <topic> (<ID>) - link here once live */}`. **No new H2.**
- Core to this scope? → body H2/H3.
- How-to/yes-no / PAA? → FAQ.
- **No scope at all?** → propose one (working title + promise + size) and log it to `blogpost-pipeline-carved.md` — do not leave a bare comment.

**Earned FAQ**: add only if it maps to a live PAA/long-tail. Cap ~10.

**Out of scope** (site-level, done once): `robots.txt`, AI-crawler policy, global `@graph`. Flag only.

## 2. Citation pass

Write workflow. Run after §1 and after all body edits. **Step 4 runs last, once the body is frozen.** Comment syntax: `blog-copy-conventions.md` §7.

1. **Annotate.** Reconcile any non-conforming step-3 citation comments (e.g. `Fact Check and link`) into `Citation Rec` first, then scan the body. Where a factual, statistic, or research claim would gain trust from a source, insert **inline at the claim**:
   `{/* Citation Rec: <claim> — cite <neutral authority kind, e.g. standards body / Wikipedia / study>; not a competitor */}`
   Bias neutral + trusted (industry bodies, standards orgs, Wikipedia, research, reputable press). Competitors only as a last resort.
2. **Approve (a).** Present the claim→source list + where each link lands for sign-off. Resolve only after approval.
3. **Resolve.** Find the URL; verify it is live and actually supports the claim; normalize — `https://`, strip tracking params, no trailing slash. Competitor source only if no neutral option exists — flag it in the review output.
4. **Sync frontmatter (run last).** Scan the body for **all** external links **plus** the neutral subset of the `{/* SOURCES */}` block → dedupe → mirror into frontmatter `citations:` (drives `BlogPosting.citation` via the schema emitter). Competitors excluded. Any leftover `Citation Rec` comment = unresolved: resolve or delete before publish.

## 3. Output

Append `## 5. SEO review` to the reference sheet (single artifact per post):

- Audit table (Area | Finding | Action)
- Priority fixes (P0/P1/P2 | Fix)
- Changelog (applied edits)

Then apply approved fixes to the MDX.

## 4. Comment convention

- Deferred content/links use `{/* Future Article: <topic> (<ID>) - <note> */}` (`blog-copy-conventions.md` §3) — consistent + greppable.
- Citation recommendations use `{/* Citation Rec: <claim> — <source kind> */}` (`blog-copy-conventions.md` §7) — inline at the claim; resolve or delete before publish.
- Never place a `{/* */}` comment between ordered-list items — it resets numbering. Put it above or below the list.

## 5. Verify

- `npx astro sync` (schema types clean).
- Scripted checks: metadata char counts · body words · FAQ count · rendered em-dash count · keyword presence.
- Link check: shop subcategory slug = lowercase-hyphen; the product-list component matches `subCategory` case-insensitively.
- Citation check: frontmatter `citations:` = valid absolute URLs, deduped, mirrors body external links + approved recs; each resolves live; no unresolved `Citation Rec` comments.

## 6. Guardrails

- No invented volumes/ranks; sheet = truth.
- Em dash = style/AI-tell, not SEO — flag overuse only, never mechanical strip.
- Never name competitors (conventions §7). Citation bias = neutral + trusted; competitor source only when no neutral option exists.
- One scope wins over completeness.
- No new H2 that cannibalizes cluster scopes.

## 7. Definition of done

- [ ] §5 written (audit + fixes + changelog).
- [ ] Approved fixes applied; `astro sync` clean.
- [ ] Deferred items carry `Future Article` comments.
- [ ] New scopes (if any) logged to `blogpost-pipeline-carved.md`.
- [ ] Citation pass done: `Citation Rec` resolved/deleted; frontmatter `citations:` synced.
- [ ] Path + summary reported.
