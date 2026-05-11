# Cloudflare Workers

Source: https://developers.cloudflare.com/workers

## Quick Start

### Install Adapter

```bash
npx astro add cloudflare
```

### Build & Deploy

```bash
npx astro build
npx wrangler deploy
```

## wrangler.toml Configuration

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2025-02-11"

[[kv_namespaces]]
binding = "MY_KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

[[d1_databases]]
binding = "D1"
database_name = "my-db"
database_id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

## Environment Variables

```jsonc
// wrangler.jsonc
{
	"vars": {
		"MY_VARIABLE": "test",
	},
}
```

```dotenv
# .dev.vars (local development)
DB_PASSWORD=myPassword
```

## Worker Entry Point

```typescript
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return new Response("Hello World!");
	},
} satisfies ExportedHandler<Env>;
```

## Deploy to workers.dev

```bash
npx wrangler deploy                                    # to custom route
npx wrangler deploy --env staging                      # to *.workers.dev
```

## Wrangler CLI Commands

```bash
# KV
npx wrangler kv key put "my-key" "my-value" --namespace-id "xxx"
npx wrangler kv key get "my-key" --namespace-id "xxx"

# D1
npx wrangler d1 execute my-db --command "SELECT * FROM users"

# Deploy
npx wrangler deploy
```
