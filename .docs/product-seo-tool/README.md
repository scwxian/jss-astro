# product-seo-tool

Internal dev tool for **product-page SEO research**. Pulls live rank truth from
DataForSEO so product `seo.title` / `seo.description` / body copy can be chosen
from real data instead of guesses.

**Scope: products only** — anything under `src/content/products/`. For
blog/editorial research, use a separate editorial tool.

Standalone: own `.env`, own deps (none).

## When to use

- Writing or rewriting `seo:` frontmatter for a product `.mdx`.
- Choosing which keyword to front-load in a product title.
- Finding high-intent long-tails + the SERP features (AIO, local pack, shopping)
  that decide whether a page can actually rank.
- Auditing an existing product page's keyword fit.

## Setup (once)

```sh
cd .docs/product-seo-tool
cp .env.example .env      # then fill it in — see Configure below
node --version            # Node >= 20
```

`.env` is gitignored.

## Configure (required)

The tool has **two required settings** in `.env`. Without them it cannot run.

1. **DataForSEO credentials** — from https://app.dataforseo.com/api-access:

   ```sh
   DATAFORSEO_LOGIN=
   DATAFORSEO_PASSWORD=
   ```

2. **Your target market** — this tool ships with no default market, so you must
   pick your own. `DF_LOCATION_CODE` is the numeric DataForSEO location code and
   `DF_LOCATION_NAME` is the label shown in the report header:

   ```sh
   DF_LOCATION_CODE=2840          # e.g. 2840 = United States
   DF_LOCATION_NAME=United States # label used in the report
   DF_LANGUAGE=en                 # default: en
   ```

   Find your code in the DataForSEO appendix:
   https://docs.dataforseo.com/v3/appendix/locations-and-languages/

If `DF_LOCATION_CODE` is unset, `run.mjs` exits with a clear error telling you to
set `DF_LOCATION_CODE` / `DF_LOCATION_NAME` in `.env`.

## Usage

```sh
# By product keyword set
node run.mjs --keywords "leather wallet, wireless earbuds, stainless water bottle" --name accessories

# From a file (one query per line, # comments allowed)
node run.mjs --keywords-file ./kw.txt --name drinkware

# Feature toggles + per-run market override
node run.mjs --keywords "insulated tumbler" --location-code 2826 --depth 20
node run.mjs --keywords "gooseneck kettle" --no-serp          # volume + autocomplete only
```

Options: `--name` `--location-code N` `--depth N` `--no-serp` `--no-autocomplete`
`--no-volume` `--force` `--out <dir>`.

Output → `./out/<name>.md` (report) + `./out/<name>.json` (raw). Standard queue is
async (~1–2 min per batch); task ids cache to `./.cache/`, so re-running resumes
without re-spending credits. The report is also printed to stdout.

## What it returns

| Section | Source | Use |
| --- | --- | --- |
| 1. Search volume | DataForSEO Google Ads (your market) | volume + CPC + competition → pick the head term |
| 2. Google SERP | DataForSEO SERP advanced (your market) | top-10 competitors, **PAA**, **related searches**, feature flags (AIO / local pack / popular products / shopping) |
| 3. Autocomplete | DataForSEO autocomplete (your market) | real query clusters + modifier intent (gift, buy, price, size) |

## How to read it (product method)

1. **Volume alone is a trap** — most long-tails return `null`. Weight
   **CPC + competition** heavily: `LOW` competition + nonzero volume = the slot
   to target; `HIGH` competition means buy/commercial intent.
2. **Related searches** replace missing PAA for a product — they expose the
   comparison/transaction modifiers ("where to buy", "price", "best") that
   belong in the meta description.
3. **SERP feature flags decide strategy:** `AIO` means Google answers directly →
   lead with a crisp structured answer + FAQ-on-page. `popular-products` /
   `shopping` means marketplaces dominate → differentiate on brand/spec angles.
4. Front-load the **highest-value winnable term** in the title, keep the size/spec
   modifier ("600ml", "2-pack") because that is how marketplace titles are built.
5. Encode specs in the description: price anchor, size options, colour/variant,
   materials, freshness, shipping region.

## Notes

- Keyword metrics for `seo.title` (50–60 chars) / `seo.description` (150–160 chars)
  are enforced manually — count characters and append `[NN chars]` in drafts.
- Products render `additionalInfo` (accordion, "More Info") for FAQ-style Q&A;
  there is no product `faq` field and products intentionally emit no FAQPage
  schema. Keep FAQ copy in `additionalInfo`.
