# MDX Content Rules (Astro 7 + satteri)

## What / Why

MDX files (blog, products) can use custom Astro components **without writing `import` lines**. `src/features/shared/mdx-auto-import.ts` injects imports at build time. Example precedent: a `BlogpostImage.astro` (blog scope) or a card component (products scope).

**Core rule: If going down auto-import path for specific component, NEVER write `import` lines inside MDX for those components.** Register the component in `astro.config.mjs` scope config instead.

## Usage

### Config (astro.config.mjs)

```js
mdxAutoImport({
  scopes: [
    { match: "/blog/", imports: ["./src/features/blog/post-components/BlogpostImage.astro"] },
    { match: "/products/", imports: [
      "./src/components/CardSystem/SimpleCard.astro", // default import, name = filename
      { "./src/features/shared/scripts/example-util.js": ["namedExport"] }, // named import
    ]},
  ],
})
```

- `match`: path substring matched against file path. One scope per content dir.
- `imports` entry: string = default import (name = filename). Record w/ array = named imports.
- MUST register integration BEFORE `mdx()`.
- New content dir = new scope. New component = add path to scope. New post in existing dir = nothing.

### Authoring pattern (MDX)

```mdx
<BlogpostImage src="image2.webp" alt="..." caption="..." />
```

No import line needed. Resolution is owned by the component (e.g. a relative filename → your CDN/R2 path via `getAssetUrl`). Full URL → passthrough.

## How it works

- `astro:config:setup` builds `mdxjsEsm` node (import source in `value` + acorn `estree` in `data`) per scope.
- `updateConfig({ markdown: { processor: satteri({ mdastPlugins: [...] }) } })`.
- Plugin = factory returning **visitor object** keyed by mdast node types. Fires per file (per-file `injected` flag).
- On first block node: match file path against scopes → `ctx.insertBefore(node, importsNode)`.
- Visitors fire in tree order (outer before inner) → first block node = first top-level node → safe insert target.

## CRITICAL pitfalls (Astro 7 + satteri)

1. **`<Content components={{...}} />` injection does NOT work.** Renders EMPTY body, no error, build passes. Content collections use deferred-module render path — components prop silently ignored. Direct imports (auto-inject) are the only working path.
2. **`<img>` is NOT mappable** via components prop — compiles to literal `_jsx("img")`. Only custom tags route through `_components`. Don't try to restyle/rewrite `<img>` in MDX via components prop.
3. **satteri plugins ≠ unified plugins.** `(tree, vfile) => ...` transforms NEVER run. Plugins are factories returning visitor objects keyed by node types. `'root'` never fires. No vfile — use `ctx.fileURL` (URL object, `fileURLToPath` it).
4. **`mdxjsEsm` node needs BOTH `value` AND `data.estree`** (acorn Program) or satteri won't emit the import.
5. **`<Image inferSize>` + remote redirects**: remotePatterns validates BOTH initial URL and redirect targets. Redirect-blocked image = SILENT EMPTY BODY (inferSize) or hard build fail (explicit dims). Add redirect host to `image.remotePatterns` (e.g. `fastly.picsum.photos` for picsum).
6. **Duplicate manual import = build error.** Auto-inject + leftover `import CoffeeDetails` → duplicate binding. Remove manual imports when migrating to auto-inject.
7. **Unused injected import = harmless.** Every file in matched scope gets the import; only files referencing the component render it. Vite tree-shakes unused imports in prod.
8. **Content sync + vite transform both compile MDX** — plugin runs twice per file. Harmless (per-file flag).

## Adding a new MDX-usable component

1. Create `.astro` component (named file → default import name matches tag).
2. Add path to matching scope in `astro.config.mjs` (before `mdx()`).
3. Use `<ComponentName />` in MDX. No import line.
4. If component needs runtime interactivity in QVM contexts, see `astro-components-rules.md` (Web Components + `shop-init.js`).
</content>
