# Astro E-Commerce Boilerplate

It's another [Astro](https://astro.build) + Boilerplate, designed for e-comm websites and deployed via Cloudflare Workers.
Built for stores that don't have 10000000 products and only needs simple filters. 
Live Example: Built for my coffee roastery business — [Main Coffee Lab](https://maincoffeelab.com) 
Production-ready, Static-first, JavaScript progressively enhanced, no JS frameworks, Vanilla CSS, entirely customizable.

**For AI agents**: see [AGENTS.md](./AGENTS.md).

---

## What's NOT Included

This is a frontend + checkout boilerplate. It does **not** include:

- Admin panel / dashboard
- CMS (products are MDX files — edit in code)
- Customer accounts / login system
- Email delivery system (use Make.com or similar for post-purchase emails)
- Analytics / tracking
- Inventory management beyond what's in product MDX

If you need these, you can integrate external services or build them on top.

---

## Key Features

Coming soon.

---

## Components

Coming soon.

---

## Project Structure

Coming soon.

---

## Shipped Pages

Coming soon.

---

## Styles

Coming soon.

---

## Architecture

Coming soon.

---

## Tech Stack

| Dependency | Purpose |
|-----------|---------|
| [Astro 6.x](https://astro.build) | Static site + server actions |
| [@astrojs/cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) | Workers adapter |
| [nanostores](https://github.com/nanostores/nanostores) | Reactive state (`atom`/`computed`) |
| [@nanostores/persistent](https://github.com/nanostores/persistent) | localStorage/sessionStorage-backed stores |
| [flatpickr](https://flatpickr.js.org) | Date picker (Web Component wrapper) |
| [@astrojs/mdx](https://docs.astro.build/en/guides/markdown-content/) | MDX content |
| [@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/) | Auto-generated sitemap |
| [Vitest](https://vitest.dev) | Testing (edge-runtime) |
| [MSW](https://mswjs.io) | API mocking |
| [wrangler](https://developers.cloudflare.com/workers/wrangler/) | Cloudflare CLI |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Cloudflare account (KV, D1, R2, deployment)

### Installation

```bash
git clone <repo-url> my-store
cd my-store
npm install
```

### Configuration

Coming soon

## License

ISC — commercial use allowed, copyright notice required in source copies.
