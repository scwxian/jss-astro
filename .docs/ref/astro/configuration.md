# Configuration Reference

Source: https://github.com/withastro/docs

## Basic Config

```javascript
// astro.config.mjs
import { defineConfig } from "astro/config";

export default defineConfig({
	// Options here
});
```

## Output Mode

```javascript
export default defineConfig({
	output: "static", // Default - can opt-in to SSR per-page
	output: "server", // Full SSR - all pages rendered on-demand
});
```

## Adapters

```javascript
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
	adapter: cloudflare({
		// Options
	}),
});
```

## Integrations

```javascript
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
	integrations: [mdx(), sitemap()],
});
```

## Image Service

```javascript
import { defineConfig, sharpImageService, passthroughImageService } from "astro/config";

export default defineConfig({
	image: {
		service: sharpImageService(),
		// or for Cloudflare without Sharp:
		// service: passthroughImageService(),
	},
});
```

## Vite Config

```javascript
export default defineConfig({
	vite: {
		plugins: [
			/* your plugins */
		],
		environments: {
			client: {
				build: {
					rollupOptions: {
						output: {
							entryFileNames: "js/[name]-[hash].js",
						},
					},
				},
			},
		},
	},
});
```

## Server Options (SSR)

```javascript
export default defineConfig({
	server: {
		host: true, // Listen on all interfaces
		port: 3000,
	},
});
```

## Site URL

```javascript
export default defineConfig({
	site: "https://example.com",
	base: "/docs",
});
```

## Markdown & MDX

```javascript
export default defineConfig({
	markdown: {
		shikiConfig: {
			theme: "dracula",
		},
	},
});
```

## envField (Type-safe Env Vars)

```typescript
// astro.config.ts
import { defineConfig, envField } from "astro/config";

export default defineConfig({
	experimental: {
		env: true,
	},
	env: {
		schema: {
			PUBLIC_API_URL: envField.string({ context: "client", access: "public" }),
			DB_PASSWORD: envField.string({ context: "server", access: "private" }),
		},
	},
});
```
