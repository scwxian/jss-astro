# Cloudflare Durable Objects

Source: https://developers.cloudflare.com/workers/best-practices/workers-best-practices

## WebSocket Server with Hibernation

```typescript
import { DurableObject } from "cloudflare:workers";

type Env = {
	CHAT_ROOM: DurableObjectNamespace;
};

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.headers.get("Upgrade") !== "websocket") {
			return new Response("Expected WebSocket", { status: 426 });
		}
		const stub = env.CHAT_ROOM.getByName("default-room");
		return stub.fetch(request);
	},
} satisfies ExportedHandler<Env>;

export class ChatRoom extends DurableObject {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
	}

	async fetch(request: Request): Promise<Response> {
		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);
		this.ctx.acceptWebSocket(server);
		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
		for (const conn of this.ctx.getWebSockets()) {
			conn.send(typeof message === "string" ? message : "binary");
		}
	}

	async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
		ws.close(code, reason);
	}
}
```

## Client-side Connection

```javascript
const websocket = new WebSocket("wss://example.signalnerve.workers.dev");

websocket.onmessage = (event) => {
	console.log(event.data);
};
```

## Key Methods

- `ctx.acceptWebSocket(server)` - Accept WebSocket for hibernation
- `ctx.getWebSockets()` - Get all connected WebSockets
- `ctx.setWebSocketAutoResponse()` - Auto ping/pong without waking
- `ctx.waitFor(event)` - Wait for external events
