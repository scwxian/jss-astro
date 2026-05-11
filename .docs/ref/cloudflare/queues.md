# Cloudflare Queues

Source: https://developers.cloudflare.com/workers/runtime-apis/handlers/queue

## Overview

Global message queueing service with guaranteed delivery and message batching.

## Producer + Consumer Worker

```typescript
interface Env {
	REQUEST_QUEUE: Queue;
	UPSTREAM_API_URL: string;
}

export default {
	// Producer: send messages
	async fetch(request: Request, env: Env) {
		const info = {
			timestamp: new Date().toISOString(),
			method: request.method,
			url: request.url,
		};
		await env.REQUEST_QUEUE.send(info);

		return Response.json({
			message: "Request logged",
			requestId: crypto.randomUUID(),
		});
	},

	// Consumer: process messages
	async queue(batch: MessageBatch<any>, env: Env) {
		const requests = batch.messages.map((msg) => msg.body);

		const response = await fetch(env.UPSTREAM_API_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ requests }),
		});

		if (!response.ok) {
			throw new Error(`Upstream API error: ${response.status}`);
		}
	},
} satisfies ExportedHandler<Env>;
```

## wrangler.toml Configuration

```toml
[queues]
producers = [
  { name = "request-queue", binding = "REQUEST_QUEUE" }
]
consumers = [
  {
    name = "request-queue",
    dead_letter_queue = "request-queue-dlq",
    retry_delay = 300
  }
]
```

## JavaScript API (Service Workers)

```javascript
addEventListener("queue", (event) => {
	event.waitUntil(handleMessages(event));
});

async function handleMessages(event) {
	for (const message of event.messages) {
		console.log("Received", message.body);
	}
}
```

## Python Worker

```python
from workers import WorkerEntrypoint

class Default(WorkerEntrypoint):
    async def queue(self, batch):
        for message in batch.messages:
            print("Received", message)
```
