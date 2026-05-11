---
source: Context7 API
library: astro
package: @astrojs/cloudflare
topic: environment-detection-dev-vs-prod
fetched: 2026-04-20T00:00:00.000Z
official_docs: https://docs.astro.build/en/guides/environment-variables/
when_to_use: Detecting dev vs production mode in Astro with Cloudflare Workers adapter
---

# Environment Detection in Astro with Cloudflare Workers

## Default Environment Variables

Astro provides built-in environment variables for detecting runtime mode:

| Variable | Description |
|----------|-------------|
| `import.meta.env.MODE` | `"development"` when running `astro dev`, `"production"` when running `astro build` |
| `import.meta.env.PROD` | `true` if running in production, `false` otherwise |
| `import.meta.env.DEV` | `true` if running in development, `false` otherwise (always opposite of PROD) |

### Basic Usage

```typescript
const isProd = import.meta.env.PROD;
const isDev = import.meta.env.DEV;
```

### Common Pattern - Content Collections Filter

```astro
---
import { getCollection } from 'astro:content';
const blogEntries = await getCollection('blog', ({ data }) => {
  return import.meta.env.PROD ? data.draft !== true : true;
});
---
```

### Common Pattern - CMS Version Selection

```astro
---
const version = import.meta.env.DEV ? "draft" : "published";
---
```

## Cloudflare Workers Specific Behavior

### Environment Detection Change in Astro 6.0

**Important:** In Astro 6.0+, the environment is determined during **build time**, not at deployment time.

```bash
# Build for a specific Cloudflare environment
CLOUDFLARE_ENV=staging astro build && wrangler deploy

# Build for production
CLOUDFLARE_ENV=production astro build && wrangler deploy
```

### Accessing Cloudflare Bindings

```astro
---
import { env } from 'cloudflare:workers';

const myVariable = env.MY_VARIABLE;
const myKVNamespace = env.MY_KV;
---
```

### Type-Safe Environment Variables (Recommended)

```typescript
import { MY_VARIABLE } from 'astro:env/server';
```

## Best Practices

### 1. Use `import.meta.env.PROD` / `import.meta.env.DEV` for Mode Detection

These are the **only** reliable way to detect the current mode in Astro:

```typescript
if (import.meta.env.PROD) {
  // Production behavior
} else {
  // Development behavior
}
```

### 2. Cloudflare-Specific Detection

For Cloudflare-specific environment detection:

```bash
# During build, set CLOUDFLARE_ENV to specify target environment
CLOUDFLARE_ENV=staging astro build
```

The `CLOUDFLARE_ENV` variable is set at **build time**, so:
- `import.meta.env.PROD` reflects whether you ran `astro build` (not the Cloudflare environment)
- For Cloudflare-specific environments, use separate builds with different `CLOUDFLARE_ENV` values

### 3. Use `astro:env` for Type-Safe Variables

```javascript
// astro.config.mjs
import { defineConfig, envField } from "astro/config";

export default defineConfig({
  env: {
    schema: {
      API_URL: envField.string({
        context: "server",
        access: "public",
      }),
    }
  }
});
```

## Key Takeaways

| Scenario | Recommended Approach |
|----------|---------------------|
| Detecting dev vs prod mode | Use `import.meta.env.PROD` or `import.meta.env.DEV` |
| Accessing Cloudflare bindings | Use `cloudflare:workers` module or `astro:env` |
| Building for specific Cloudflare env | Use `CLOUDFLARE_ENV=<env> astro build` |
| Type-safe environment variables | Use `envField` in `astro.config.mjs` with `astro:env/server` |

## Important Caveat

`import.meta.env.PROD` / `import.meta.env.DEV` reflect the **build mode**:
- Running `astro dev` → DEV=true, PROD=false
- Running `astro build` → DEV=false, PROD=true

When using Cloudflare Workers adapter, if you need to target a specific Cloudflare environment (production vs staging), you must **build separately** for each environment using `CLOUDFLARE_ENV`.