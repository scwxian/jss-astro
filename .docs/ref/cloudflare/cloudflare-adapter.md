# Cloudflare Adapter

Source: https://github.com/withastro/docs

## Setup

```javascript
// astro.config.mjs
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
	adapter: cloudflare(),
	output: "static", // or 'server' for full SSR
});
```

## Cloudflare Bindings

### KV Namespaces

```astro
---
import { env } from "cloudflare:workers";

const value = await env.MY_KV.get("key");
---
```

> See [KV Operations](./kv.md) for more examples (Rust, AI, metadata, TTL)

### Environment Variables

```astro
---
import { env } from "cloudflare:workers";

const myVar = env.MY_VARIABLE;
---
```

Or use type-safe `astro:env`:

```typescript
import { MY_VARIABLE } from "astro:env/server";
```

## Session Storage

```javascript
// astro.config.mjs
export default defineConfig({
	adapter: cloudflare({
		sessionKVBindingName: "SESSION", // default
	}),
});
```

## wrangler.toml / wrangler.jsonc

```jsonc
{
	"kv_namespaces": [
		{
			"binding": "MY_KV",
		},
	],
}
```

## Cloudflare-Specific Modules

```astro
---
import { env } from "cloudflare:workers";
// Access KV, R2, D1, Durable Objects
---
```

## Astro.locals

In Cloudflare SSR, access locals via `Astro.locals`:

```typescript
// src/pages/api/data.ts
export const prerender = false;

export const GET = ({ locals }) => {
	const user = locals.user; // from middleware
	return Response.json({ user });
};
```
