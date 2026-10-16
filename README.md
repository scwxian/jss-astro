[![AI Coauthored](https://img.shields.io/badge/AI_Coauthored-Engineered_↗-blue)](https://coauthored.dev/#v:2;o:~Y29hdXRob3JlZC5kZXY;stakes:4;autonomy:2;scope:project;tools:~T3BlbmNvZGUgd2l0aCBLaW1pIEsyLjUgJiBEZWVwc2Vlaw;review:ran;watch:code,security,edge,tests;notes:~QnVpbHQgd2l0aCBIZWxwIG9mIEFJIExMTXMuIEV2ZXJ5IGxpbmUgb2YgY29kZSB3YXMgcmV2aWV3ZWQgYW5kIG1vZGlmaWVkIGJ5IG1lLCBidXQgSSdtIG9ubHkgaHVtYW4sIHNvIHRoZXJlIHdpbGwgYmUgbWlzdGFrZXMgYW5kIGJ1Z3Mu;created:2026-05-12)
# 'Just Sell Stuff' (JSS) Astro E-Commerce Boilerplate

Production-ready ecommerce template built with 🚀 [Astro 7](https://astro.build) + 🛠️ [Cloudflare Workers](https://developers.cloudflare.com/workers/) + 📦 [Nanostores](https://github.com/nanostores/nanostores).

**Live demo** : [maincoffeelab.com](https://maincoffeelab.com) *(my coffee roastery, come check us out!)*

**Philosophy**: Static-first, no JS frameworks, Vanilla CSS. Entirely customizable. Built for simple online stores that need fast checkout and don't have 1000000 products or require complex filtering.

> [!TIP] 
> Looking for something even simpler? Check out my other boilerplate: [ASSG](https://github.com/scwxian/assg#)
> 
> Pure HTML, Vanilla CSS and JS built using Vite 8. Made for quick landing pages or simple 3 - 8 page marketing static sites, deployed via any Bucket + CDN Combo *(AWS S3 + Cloudfront or equivalent)*. A poor man's Astro.


## AI Assisted Development
To be 100% transparent, this project was built with AI LLMs Assistance *(mainly w/ Kimi and Deepseek via [opencode.nvim](https://github.com/nickjvandyke/opencode.nvim))*

**Contribution Breakdown:**
* **Architecture & Stack Selection**: 100% on me
* **Implementation**: Collaborative (I directed; AI generated initial code; I refactored and optimized; AI helped fix bugs based on my approval).
* **Oversight & Security**: 100% on me, every line of code was reviewed by me.

I'm only human so there will be mistakes. Proceed with this in mind and just change the code as you see fit — a lot of them were designed to be config-driven, functional-style *(except for some adapters patterns)* and as simple as possible, because I'm not a smart engineer.

**For AI agents**: see [AGENTS.md](./AGENTS.md). Full LLM documentation system at [AI Agents](../../wiki/AI-Agents).


## When should I use this?

### ✅ Use this if:
- You're building an ecommerce store with [Astro](https://astro.build) and want a fast, static-first site with minimum dependencies overhead to start *(No React/Vue/Svelte/Tailwind/etc)*
- You have limited number of products, such that you can comfortably track and edit them in code *(MDX files)*
- You're open to using serverless/Cloudflare's edge infrastructure *(Workers, D1, KV, R2)* — not a VPS. I've not yet checked how swappable are Astro's Adapters *(ex: Cloudflare -> Netlify)*
- You want to own your code and host it yourself *(no SaaS lock-in)*
- You or someone in your team actually knows programming — but you're reading a GH repo so I assume this is a no brainer

### ❌ Probably not for you if:
- You need a full admin dashboard / visual CMS *(this is code-first and edge-heavy, you'll need to hook up a VPS for the headless stuff and modify the existing apis to do fetch calls instead)*
- You have 1000000+ products with complex warehouse inventory management<br>*(like a fashion store that requires very complex filtering rules in the main `/shop/` page)*
- You need built-in customer accounts, login, or order history portal. This framework intentionally avoids this.
- You don't want to be responsible for or handle deployment and server-side stuff.
- You need server-side rendering for most pages *(this is static-first)*

### ⚠️ What's not included:

This is a **frontend + checkout** boilerplate. It does **NOT** include:

- Admin panel / dashboard
- CMS (for products or blogs)
- Customer accounts / login system
- Email delivery system *(use any ESPs that you like)*
- Analytics / tracking *(zero assumptions, implement what you like)*

It's designed as a base for extension — add external services or build on top as you like. I explain some of my logic on why I made certain implementation decisions in their respective wiki pages. 


## Key Features

| Feature | |
|---------|----|
| [🛒 Dual cart](../../wiki/Cart-and-Checkout) | Separate carts for one-time (`localStorage`) and subscription (`sessionStorage`) products. Independent validation and checkout paths. |
| [🔀 Two-lane checkout](../../wiki/Cart-and-Checkout) | Single form auto-routes to one-time or subscription payment. Zod discriminated union on `checkoutType`. |
| [🔌 Hot-swappable gateways](../../wiki/Payment-Gateways-and-Post-Purchase) | Change payment provider by switching one env var. Add new gateways via adapter interface. |
| [🧮 Deterministic pricing](../../wiki/Calc-Engine) | Integer-cent math only. Pure function pipeline: base → promos → shipping → taxes → subscription. Immutable, testable in isolation. |
| [🔒 Idempotency lock](../../wiki/Cart-and-Checkout) | SHA-256 hash + KV-backed lock. Prevents duplicate charges on refresh/retry. |
| [📦 MDX product catalog](../../wiki/Product-Catalog) | Products in `.mdx` files. Zod-validated discriminated unions (physical, digital, subscription), contains variants, inventory, and SEO. |
| [🪟 QuickView modal](../../wiki/Shop-and-Product-UI#quickviewmodal) | SPA-like product preview in a `<dialog>` for a no-navigation `/shop/` page. Fetches `/products/{slug}` via JS to prevent duplicate rendering. |
| [🔐 Session-based PII](../../wiki/User-Sessions-and-PII) | User data stored via Astro Sessions (HttpOnly cookie, KV-backed). Never in `localStorage`. |
| [📊 Collections + SEO](../../wiki/Collections-System) | Paginated shop pages, category/subcategory routing, Schema.org structured data, infinite scroll on all `collection` hub pages. |
| [🚨 Structured logging](../../wiki/Logging-Alerts-and-Notifications) | Logger (debug→critical), rate-limited team notifications with adapter pattern allowing multiple notification channels. |

→ [Explore the Wiki](../../wiki/Home)


## How to Use This Project

You can approach this 2 ways — pick what works for you:

### A. Full clone — start a new store
Clone the entire boilerplate as your store's foundation. Best for new projects and you're open to learning how the overall architecure works. Follow the customization checklist to replace demo content with your own.

→ [Customization Checklist](../../wiki/Customization-Checklist)

### B. Cherry-pick features — add to existing Astro project

The architecture is feature-sliced, so you can literally copy individual features into any Astro project. I tried to make each feature in `src/features/` and `src/components/` as self-contained as possible — copy the dir, wire up its dependencies, and it *should* work.

| Feature | Copy folder | Dependencies |
|---------|-----------|--------------|
| Shopping cart | `cart/` | nanostores |
| Checkout flow | `checkout/` | cart, calc-engine, payment-gateways, users, D1 |
| Pricing engine | `calc-engine/` | Content collections |
| Payment gateways | `payment-gateways/` | checkout model types |
| Logger + alerts | `log-alert/` | KV (NOTIFY_DEDUP_KV) |
| Product display | `shop/` | cart, content collections |
| Navigation | `collections/` | Content collections |

→ [Project Structure](../../wiki/Project-Structure) 

## Quick Start

```bash
git clone https://github.com/scwxian/jss-astro/ my-store
cd my-store
npm install
npm run dev -- --host
```

You should have a dev server up and running with a demo site.

→ [Full Getting Started guide](../../wiki/Getting-Started) &nbsp;|&nbsp; [Configuration reference](../../wiki/Configuration)

> [!TIP] 
> **Where to Go Next**:
> * 🚀 I want to launch fast: [[Getting Started](../../wiki/Getting-Started)] → [[Configuration](../../wiki/Configuration)] → [[Customization Checklist](../../wiki/Customization-Checklist)] → [[Full pages & routing guide](../../wiki/Pages-and-Routing)] → [[Deployment](../../wiki/Deployment)]
> * 🔍 I want to understand how it works: [[Project Structure](../../wiki/Project-Structure)] → [[Architecture](../../wiki/Architecture)] → [[Cart & Checkout](../../wiki/Cart-and-Checkout)] → [[Calc Engine](../../wiki/Calc-Engine)] → [[Product Catalog](../../wiki/Product-Catalog)]
> * 🎨 I want to customize the look: [[Styles & Theming](../../wiki/Styles-and-Theming)] → [[UI Components](../../wiki/UI-Components-and-Overlays)] → [[Assets & Images](../../wiki/Assets-and-Images)]

## Full Documentation

| Topic | Wiki Page |
|-------|----------|
| Setup & config | [Getting Started](../../wiki/Getting-Started) &nbsp;•&nbsp; [Configuration](../../wiki/Configuration) &nbsp;•&nbsp; [Customization Checklist](../../wiki/Customization-Checklist) |
| Code layout | [Project Structure](../../wiki/Project-Structure) &nbsp;•&nbsp; [Architecture](../../wiki/Architecture) |
| Core systems | [Cart & Checkout](../../wiki/Cart-and-Checkout) &nbsp;•&nbsp; [Calc Engine](../../wiki/Calc-Engine) &nbsp;•&nbsp; [Product Catalog](../../wiki/Product-Catalog) |
| Payments | [Payment Gateways & Post-Purchase](../../wiki/Payment-Gateways-and-Post-Purchase) |
| Storefront | [Shop & Product UI](../../wiki/Shop-and-Product-UI) &nbsp;•&nbsp; [Collections System](../../wiki/Collections-System) &nbsp;•&nbsp; [Pages & Routing](../../wiki/Pages-and-Routing) &nbsp;•&nbsp; [SEO & Metadata](../../wiki/SEO-and-Metadata) |
| Presentation | [UI Components & Overlays](../../wiki/UI-Components-and-Overlays) &nbsp;•&nbsp; [Styles & Theming](../../wiki/Styles-and-Theming) &nbsp;•&nbsp; [Assets & Images](../../wiki/Assets-and-Images) |
| Operations | [Logging & Alerts](../../wiki/Logging-Alerts-and-Notifications) &nbsp;•&nbsp; [User Sessions & PII](../../wiki/User-Sessions-and-PII) |
| Development | [AI Agents](../../wiki/AI-Agents) &nbsp;•&nbsp; [Testing](../../wiki/Testing) &nbsp;•&nbsp; [Deployment](../../wiki/Deployment) |
| Help | [Troubleshooting & FAQ](../../wiki/Troubleshooting-and-FAQ) |


## Need Help?

- **Bug reports** — Open a [GitHub Issue](https://github.com/scwxian/jss-astro/issues). Include: what you tried, what you expected, error logs (redact secrets), and your environment (Node version, OS).
- **Questions** — Use [GitHub Discussions](https://github.com/scwxian/jss-astro/discussions) for usage questions.

## Contributing

Contributions are welcome, I'll check them as I get time. 

| What | How |
|------|-----|
| 🐛 Bug fix | Open issue → fork → fix → PR |
| 💳 New payment gateway | Implement adapter interface → add to factory |
| 🔔 New notification channel | Implement `NotifyChannel` adapter |
| 📦 New post-purchase channel | Implement `PostPurchaseChannel` adapter |
| 📖 Documentation | Edit wiki pages directly |

→ [Contributing](../../wiki/Contributing)

---

## License

MIT — commercial use allowed, copyright notice required in source copies.
