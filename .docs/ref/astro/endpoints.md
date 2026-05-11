# API Endpoints

Source: https://github.com/withastro/docs

## Basic Endpoint

```typescript
// src/pages/api/endpoint.ts
import type { APIRoute } from "astro";

export const GET: APIRoute = ({ request, url, cookies }) => {
	return Response.json({
		message: "Hello API",
	});
};
```

## HTTP Methods

```typescript
// src/pages/api/methods.json.ts
export const GET = (({ request }) => {
	return Response.json({ message: "This was a GET!" });
}) satisfies APIRoute;

export const POST = (({ request }) => {
	return Response.json({ message: "This was a POST!" });
}) satisfies APIRoute;

export const DELETE = (({ request }) => {
	return Response.json({ message: "This was a DELETE!" });
}) satisfies APIRoute;

export const ALL = (({ request }) => {
	return Response.json({ message: `This was a ${request.method}!` });
}) satisfies APIRoute;
```

## Handle JSON Body

```typescript
export const POST: APIRoute = async ({ request }) => {
	if (request.headers.get("Content-Type") === "application/json") {
		const body = await request.json();
		return Response.json({ received: body });
	}
	return new Response(null, { status: 400 });
};
```

## Handle Form Data

```typescript
export const POST: APIRoute = async ({ request }) => {
	const data = await request.formData();
	const name = data.get("name");
	const email = data.get("email");

	if (!name || !email) {
		return Response.json({ error: "Missing fields" }, { status: 400 });
	}

	return Response.json({ success: true });
};
```

## Enable SSR Endpoints

In static mode, add:

```typescript
export const prerender = false;
```

Or set `output: 'server'` in config.
