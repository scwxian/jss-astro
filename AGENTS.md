# AGENTS.md

## 1. CRITICAL DIRECTIVES

- **Runtime**: Cloudflare Workers V8. NEVER Node.js built-ins.
- **Frontend**: `.astro` + Vanilla JS + HTML/CSS. NEVER reactive frameworks. JS = progressive enhancement only.
- **Math**: Integer cents (`$45.00` = `4500`). NEVER float. Pricing = 100% deterministic.
- **Security**: NEVER PII in `localStorage`. Astro Sessions (HttpOnly) only.
- **Validation**: Zod via `astro/zod`. NEVER separate `zod` package. NEVER trust client data.
- **Content**: `.mdx` = READ-ONLY.
- **Exports**: Named only. NEVER default exports.
- **Rendering**: `output: "static"`. Dynamic routes: `prerender = false`.
- **Logging**: NEVER `console.*`. Use `logger` utility. `alert` for CRITICAL severity.
- **Errors**: NEVER raw exceptions to clients. `ActionError` objects. Handle like Golang.
- **Idempotency**: Guard checkout + webhook processing. KV-backed locks.

## 2. ARCHITECTURE

Feature-sliced: `/src/features/{domain}/` owns models, logic, scripts, stores.

| Pattern | Rule |
|---------|------|
| Pipeline/Modifier | Calc engine chains pure fns `State → State`. Immutable modifiers. |
| Factory + Adapter | Gateway factory returns interface. Adapter per provider. |
| Orchestrator | `*-orchestrator.ts` coordinates multi-step checkout flows. |
| Idempotency Lock | `acquireCheckoutLock()` via KV. SHA-256 payload hash. |
| Web Components | Custom elements. Register once. Guard: `if (!customElements.get(...))` |
| Zod-First Types | Schema → `z.infer<typeof schema>`. Never manual interfaces for API boundaries. |
| Discriminated Unions | Result types use `status` field for exhaustive handling. |

## 3. STATE & DATA

- **Nanostores**: Reactive state via `atom`/`computed`. Persistent via `@nanostores/persistent` (`persistentMap`). Store files: `*.store.ts`.
- **D1**: Orders table for persistence. `src/db/migrations/` for schema. `src/db/db.utils.ts` for CRUD helpers. Type-safe via `wrangler types` → `worker-configuration.d.ts`.
- **KV Namespaces**: `SESSION` (HttpOnly session data), `IDEMP_CHKOUT_KV` (checkout idempotency locks), `NOTIFY_DEDUP_KV` (alert rate limiting).
- **R2**: User-uploaded assets. Bound as `ASSETS` binding. `src/features/shared/scripts/asset-handling/r2-linking.js`.
- **Session PII**: User email, address, delivery method. Stored via `context.session` in Astro Actions. NEVER in `localStorage` or client-accessible stores.

## 4. FRAMEWORK PATTERNS

- **Astro Actions**: Server-side functions via `defineAction` from `astro:actions`. Central registry: `src/actions/index.ts`. Zod input validation. Called from client via `actions.xxx()`.
- **Content Collections**: `content.config.ts` defines schemas via `defineCollection` + Zod. `src/content/products/` = MDX product catalog. `src/content/blog/` = MDX blog posts. Never mutate MDX programmatically.
- **Env Vars (3 tiers)**:

  | Tier | Location | Purpose |
  |------|----------|---------|
  | Build-time | `wrangler.jsonc` `vars` | Non-secret config (active gateway) |
  | Secrets | `astro.config.mjs` `env.schema` | Type-safe, validated secrets |
  | Local dev | `.dev.vars` | Local secret overrides |

  Access via `astro:env/server` (server) or `import.meta.env` (public).
- **Fonts**: Astro font providers (`fontProviders.fontsource()`). Defined in `astro.config.mjs`. CSS variables: `--serif-font`, `--sans-font`.
- **Images**: `remotePatterns` in `astro.config.mjs` for external image hosts. Static assets in `public/` and `src/assets/`.

## 5. CODE QUALITY

- Pure functions. Immutable data. Composition over inheritance.
- Config-driven > code-based logic.
- Minimal comments. Self-explanatory code. NEVER verbose JSDoc.
- DRY preferred. Acceptable duplication if it simplifies implementation.
- Zero/minimal dependencies. Add only if significant benefit.
- TypeScript strict. `any` only for webhook payloads.
- No magic numbers. Declare purpose integers at top.

## 6. FILE CONVENTIONS

| Extension | Role | Example |
|-----------|------|---------|
| `.ts` | Server logic, types, stores, actions | `cart.store.ts`, `checkout.orchestrator.ts` |
| `.js` | Client-side vanilla JS, progressive enhancement | `cart-init.js`, `checkout.ui.js` |
| `.astro` | Components, pages, layouts | `ProductCard.astro`, `index.astro` |
| `.mdx` | Content (products, blog) | `generic-physical.mdx` |
| `.test.ts` / `.test.js` | Tests | `checkout.lock.test.ts` |

## 7. TESTING

- Priority: E2E > Integration > Unit.
- Unit: pure critical functions only (calc-engine). Not all scripts need tests.
- Vitest + edge-runtime + MSW. AAA pattern. Factory fixtures.
- Mock external APIs with MSW. Mock KVNamespace for Workers bindings.

## 8. DISCOVERY

- Check `tsconfig.json` paths for import aliases. Prefer shortest (`@shared` not `@features/shared`).
- Follow existing file + variable naming in codebase. Match conventions you find.
- Config files: `astro.config.mjs`, `wrangler.jsonc`, `vitest.config.ts`.
- Cloudflare bindings (KV, D1, R2, env vars): read `wrangler.jsonc`.
- Env vars: defined in `astro.config.mjs` `envField`. Type-safe via `astro:env/server`.
- Path structure: list `/src/` before creating new files. Follow feature-sliced layout.
- Content schemas: `content.config.ts` defines product/blog Zod schemas. Type exports at bottom of file.
- Fonts + images: check `astro.config.mjs` for `fonts` and `image.remotePatterns` config.
- D1 types: run `npm run generate-types` after DB schema changes to update `worker-configuration.d.ts`.
