# Cloudflare KV

Source: https://developers.cloudflare.com/workers/wrangler/commands

## wrangler.toml Configuration

```toml
[[kv_namespaces]]
binding = "MY_KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

## Basic Operations

```typescript
interface Env {
	MY_KV: KVNamespace;
}

export default {
	async fetch(request: Request, env: Env) {
		// Store data
		await env.MY_KV.put("key", "value");

		// Store JSON
		const data = { todos: [{ id: 1, name: "Task", completed: false }] };
		await env.MY_KV.put("data", JSON.stringify(data));

		// Retrieve
		const value = await env.MY_KV.get("key", "text");
		const json = JSON.parse(await env.MY_KV.get("data", "text"));

		return new Response(value);
	},
} satisfies ExportedHandler<Env>;
```

## With Metadata

```bash
npx wrangler kv key put "my-key" "my-value" --namespace-id "xxx" --metadata '{"meta":true}'
```

## TTL & Expiration

```bash
# Expire after 60 seconds
npx wrangler kv key put "my-key" "my-value" --ttl 60

# Expire at specific UNIX timestamp
npx wrangler kv key put "my-key" "my-value" --expiration 1735689600
```

## CLI Commands

```bash
# Write
npx wrangler kv key put "my-key" "my-value" --namespace-id "xxx"

# Read
npx wrangler kv key get "my-key" --namespace-id "xxx"

# Delete
npx wrangler kv key delete "my-key" --namespace-id "xxx"

# List
npx wrangler kv key list --namespace-id "xxx"
```

## Rust Worker

```rust
use worker::*;

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let router = Router::new();

    router
        .post_async("/:country", |mut req, ctx| async move {
            let country = ctx.param("country").unwrap();
            let city = match req.json::<Country>().await {
                Ok(c) => c.city,
                Err(_) => String::from(""),
            };
            ctx.kv("cities")?.put(country, &city)?.execute().await?;
            Response::ok(city)
        })
        .get_async("/:country", |_req, ctx| async move {
            if let Some(country) = ctx.param("country") {
                if let Some(city) = ctx.kv("cities")?.get(country).text().await? {
                    return Response::ok(city);
                }
            }
            Response::error("Not found", 404)
        })
        .run(req, env)
        .await
}
```

## AI Function Calling with KV

```typescript
import { runWithTools } from "@cloudflare/ai-utils";

type Env = {
	AI: Ai;
	KV: KVNamespace;
};

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const updateKvValue = async ({ key, value }: { key: string; value: string }) => {
			await env.KV.put(key, value);
			return `Updated ${key} = ${value}`;
		};

		const response = await runWithTools(env.AI, "@hf/nousresearch/hermes-2-pro-mistral-7b", {
			messages: [{ role: "user", content: "Set banana to yellow" }],
			tools: [
				{
					name: "KV update",
					description: "Update key-value in database",
					parameters: {
						type: "object",
						properties: {
							key: { type: "string" },
							value: { type: "string" },
						},
						required: ["key", "value"],
					},
					function: updateKvValue,
				},
			],
		});
		return Response.json(response);
	},
} satisfies ExportedHandler<Env>;
```

## Miniflare Testing

```javascript
const mf = new Miniflare({
	kvNamespaces: ["KV"],
});

const bindings = await mf.getBindings();
await bindings.KV.put("key", "value");
assert.strictEqual(await bindings.KV.get("key"), "value");
```
