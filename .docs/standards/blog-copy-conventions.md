# Blog Copy Conventions

Blog/editorial layer on top of [brand-voice.md](./brand-voice.md). Read both before drafting; where they touch blog mechanics, this file wins. Pipeline (Step 1 research → Step 2 carve → Step 3 draft → Step 4 review) starts at [`step-1-research.md`](../blogpost-generation-engine/step-1-research.md).

> **Status: template.** Structure only. Fill each `[FILL]` slot with the project's blog spec before treating any rule as binding.

## 1. Structure, cadence & readability
- **Hook first.** The opening line earns the next one. No throat-clearing, no "in this article", no definition before the hook.
- `[FILL]` Approved opener patterns (e.g. declarative · reader's question · counter-take · moment in time).
- `[FILL]` Section cadence + sentence-length rules.
- Skimmable by default: short paragraphs, bullets, tables. Every line passes the "so what?" test.
- One idea per H2; end each section on something usable, not a summary.
- `[FILL]` Heading style (conversational vs textbook).
- `[FILL]` Punctuation rules (e.g. em-dash policy).
- Close by handing control back. Soft pointer at most, never a hard CTA.
- One post = one scope, decided at Step 2 (carve).
- `[FILL]` Jargon-translation rule.

## 2. Voice calibration
- Base voice = `brand-voice.md`. `[FILL]` how strictly it binds.
- `[FILL]` POV (collective "we" vs named author) + direct-address rules.
- `[FILL]` How the post speaks for the business (experience signal).
- `[FILL]` Conversational beats to keep.
- Calibration examples: [`blogpost-voice-calibration-log.md`](./blogpost-voice-calibration-log.md).

## 3. Linking policy
- `[FILL]` Internal link hierarchy (category → product, etc.).
- `[FILL]` Live component shelves vs hardcoded names.
- Spoke links up to its hub once; siblings link across.
- Deferred content → 1-line bridge + one comment marker:
  `{/* Future Article: <topic> (<ID>) - <note> */}`
- The only inline comments allowed: `Future Article` and `Citation Rec`. No `TODO` / `Fact Check`.

## 4. Frontmatter, slug & FAQ
- Source of truth: `src/content.config.ts` → `blogPostSchema`.
- Map the scope: H1 → `title`; SEO title → `seo.title`; TL;DR → `summary`.
- `[FILL]` Headline + meta-description rules.
- FAQ lives in frontmatter (`faq: [{ summary, content }]`), driving FAQPage schema.
- `[FILL]` Slug rules (casing, length, keyword lead-in, uniqueness).
- `[FILL]` Hero image + author + category + date field conventions.

## 5. Media & visual breaks
- `[FILL]` Where images go and how many per post.
- `[FILL]` Placeholder pattern when assets aren't ready.
- `[FILL]` Real-image + caption/credit conventions.
- Auto-import mechanism: [`mdx-content-rules.md`](./mdx-content-rules.md).

## 6. Editorial commercial rules
- `[FILL]` Pricing policy.
- `[FILL]` How to flag first-hand facts only the business can supply.
- `[FILL]` Write-for-the-reader rule.

## 7. Citations & sources
- `[FILL]` Competitor citation policy.
- `[FILL]` Neutral authorities allowed in prose.
- `[FILL]` Machine-readable `citations:` frontmatter rule.
- Inline recommendation marker: `{/* Citation Rec: <claim> — cite <authority> */}`.

## 8. Keyword weaving
- Must-have keyword → `title` + first H2 + first ~100 words.
- Each PAA question → a self-contained 40–60 word answer.
- Long-tail/PAA terms verbatim in the H2/H3 that owns them.
- Keep `{/* KEYWORDS: … */}` as the first body line. No stuffing.

## 9. Length, spelling & verification
- `[FILL]` House length band + H2/H3/FAQ counts.
- `[FILL]` Spelling/locale convention.
- Verify before hand-off: within the band · keyword in first ~100 words · FAQ count · comment syntax clean.
