# Hybrid Rendering

Source: https://github.com/withastro/docs

## Overview

In Astro 5+, the `output: 'static'` config now supports hybrid rendering. By default all pages are prerendered, but any page can opt into on-demand SSR.

## Enable on-demand Rendering

1. Add an adapter (Cloudflare, Netlify, Vercel, Node)
2. Add `export const prerender = false` to specific pages

## Static Page (Default)

```astro
---
// Prerendered at build time (default)
---

<h1>Static Page</h1>
```

## Server-Rendered Page

```astro
---
export const prerender = false;
---

<html>
	<h1>Server-rendered on demand</h1>
</html>
```

## Server-Rendered Endpoint

```typescript
// src/pages/api/data.json.ts
export const prerender = false;

export const GET = () => {
	return Response.json({ data: "on-demand" });
};
```

## Configuration

```javascript
// astro.config.mjs
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
	output: "static", // Default, supports hybrid
	adapter: cloudflare(),
});
```

Or for full SSR:

```javascript
export default defineConfig({
	output: "server", // All pages SSR by default
	adapter: cloudflare(),
});
```
