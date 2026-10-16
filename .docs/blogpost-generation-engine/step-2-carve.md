# PROMPT — Carve & Scope (per topic dump)

You are the scope editor for **[FILL: brand name]** ([FILL: business type / what the store sells]; [FILL: market/locale]). **Step 1** over-collects into one broad **content dump** (the reference sheet) on purpose. **Step 2 (this file)** carves that dump into focused, ship-sized **article scopes**. **You propose; the user disposes** — carving is judgement, so every carve goes to human review before anything is drafted.

**Read before carving:** `brand-voice.md` + `blog-copy-conventions.md` · the Step-1 sheet (§1–§4) · `blogpost-pipeline-index.md` §2/§4/§6/§8 · the cluster file + `blogpost-pipeline-backlog.md` (route to existing IDs first) · `blogpost-pipeline-carved.md` (**merge pool**, §4).

**Pipeline**: Step 1 [`step-1-research.md`](./step-1-research.md) → **Step 2 (this) → Scope Map** → Step 3 [`step-3-draft.md`](./step-3-draft.md) → Step 4 [`step-4-seo-review.md`](./step-4-seo-review.md).

## 1. Confirm (3–4 lines)
Source sheet · the dump's footprint (topics, keywords, PAA) · the **primary scope** · likely number of carved scopes · whether a discovery draft is needed.

## 2. The carve model

**A scope** is a complete article a reader would search for:
- **one promise** — after reading, the reader can do or understand one thing;
- **own demand + distinct intent** (index §2 graduation rule);
- **a searchable title** — what readers type, not a clever label;
- **house band**: 1,200–1,400 words · 3–4 H2 · 2–3 H3 · 6–10 FAQ;
- **keyword ownership** — the terms it owns, and only it.

A scope is not a section. If it's really one H3, it belongs inside a larger scope.

> **Carve rule:** every topic in the dump lands in exactly one scope's body, or is bridged/dropped. If it fits no scope, it *is* a scope — unless it's too small to stand alone, then it goes to the **merge pool**. (No "defer" bucket.)

**One keyword, one owner.** Every must-have / high-volume / long-tail / PAA term goes to exactly one scope. Two owners = cannibalization; split or merge until resolved.

**Lenses — a starting vocabulary, not a classifier.** Ask what job the scope does for the reader. Most scopes carry two; **three or more is the split signal.**

| Lens | Reader wants to… | Example |
|---|---|---|
| Concept | understand what / why | what a term means; why a feature matters |
| Mechanics | understand how / the tool / science | how it works; how it's made or tested |
| Practical use | know how to do / choose | how to choose; how to use or maintain |
| Comparison | decide A vs B | A vs B; budget vs premium |
| Reference | look something up | spec chart; size chart; glossary |
| Asset | take something away | checklist; template; spec card |

**Level check — don't fragment.** Name it the way a reader would search, then check the extent.
- ❌ "How to Compare Two Materials at Home" — one intent, thin demand, fragments the topic.
- ✅ "All About Materials" — what they are, how they differ, how to choose; bridge the advanced lab-testing and spec-sheet bits out.
- Rules: narrow how-to with no standalone demand → fold up · own demand + distinct intent → own scope · umbrella too big for the band → split on the lens seam.

## 3. Method
1. **Inventory** every topic, claim, section, number, PAA in the dump (one line each).
2. **Group into candidate scopes** — lens + keyword owner + demand; the Step-1 must-cover table and the merge pool are the inputs.
3. **Name each as a complete article** — working title, promise, what it owns, what it bridges, size.
4. **Level + size gate** — fold fragments into their umbrella, split over-large scopes, and send anything that still can't stand alone to the **merge pool** (`.docs/blog-research/blogpost-pipeline-carved.md` §4).
5. **Triage within each scope**: **body** (core) · **faq** (how-to/yes-no/PAA) · **bridge** (sibling topic → 1 line + `{/* Future Article: <topic> (<ID|NEW>) - <note> */}`) · **drop** (log it).
6. **Present candidates for review.** Do not draft yet.

## 4. Discovery-draft mode (optional)
If topics resist grouping, write a **fast, unpolished discovery draft** — over-wide on purpose — to surface the seams, then discard it. It is scrap paper and never ships. Record the choice in §1.

## 5. Output & review
- **Scope Map** (append to the Step-1 sheet): table `Scope | Working title | Lens | Owns (keywords/PAA) | Size | Bridges`, plus one boundary paragraph per scope (what's in, what's out, where the out goes).
- **Candidate cards** for the review message: working title · promise · why it deserves its own post · owns/bridges · size · open questions.
- **Carved Posts Log**: append one entry per scope — graduated or merge-pool — to `.docs/blog-research/blogpost-pipeline-carved.md`.
- **Review loop**: present the cards, discuss, expect renames/merges/splits/kills. A carve that feels arbitrary is worse than one fewer post. Only after sign-off does Step 3 draft, and only then do the IDs promote to cluster file + tracker.

## 6. Guardrails
- Human-in-the-loop; never lock a carve silently.
- Don't fragment: a scope is a complete article, not a section. A fragment that can't stand alone goes to the **merge pool**, not into a scope.
- Don't invent demand: real demand or a strategic reason, else fold or drop.
- One keyword, one owner; respect the hub contract (index §2); route to existing IDs first, mint NEW only if genuinely new (IDs are stable).
- The scope bounds the draft; the dump is the quarry.

## 7. Definition of done
- [ ] Every topic assigned to exactly one scope (body / bridge / drop).
- [ ] Every keyword/PAA has one owner.
- [ ] Each scope: one promise, searchable title, lens, size in band, named bridges.
- [ ] Level check applied (no fragments, no oversized scopes).
- [ ] Scope Map + Carved Posts Log updated (incl. non-standalone fragments → merge pool §4).
- [ ] Candidates presented; user confirmed or edited.

**Handoff**: the confirmed Scope Map feeds **Step 3 — [`step-3-draft.md`](./step-3-draft.md)**.

## Appendix — worked example (generic)
| Scope | Working title | Lens | Owns | Size | Bridges |
|---|---|---|---|---|---|
| ★ CL-02 | What Product Labels Actually Tell You | concept | label meaning · how to read a label · label glossary | 1.3k | materials, sizing, care, glossary |
| NEW | All About Materials | practical (umbrella) | materials guide · what is &lt;material&gt; | 1.3k | spec chart, care, glossary |
| NEW | Materials Comparison Chart | reference | material comparison · &lt;material&gt; vs &lt;material&gt; | 1.2k | materials guide, buying guide |
| NEW | Buying Checklist & Spec Card | asset | buying checklist · spec card template | short | buying guide |
| NEW | Why Products Wear Out | mechanics | durability · product lifespan | 1.2k | &lt;sibling ID&gt;, materials |

"All About Materials" absorbs the narrow "how to compare materials at home" how-to and the "what is &lt;material&gt;" PAA into one umbrella, then bridges advanced lab testing and spec sheets out. That's the level check working.
