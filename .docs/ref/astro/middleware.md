# Middleware

Source: https://github.com/withastro/docs

## Define Middleware

```typescript
// src/middleware.ts
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((context, next) => {
	// context - request info, params, etc.
	// next - call next middleware or endpoint
	return next();
});
```

## Middleware with TypeScript

```typescript
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((context, next) => {
	const user = context.cookies.get("user");
	if (!user && context.url.pathname.startsWith("/admin")) {
		return Response.redirect("/login");
	}
	return next();
});
```

## Chain Middleware with sequence

```typescript
import { sequence } from "astro:middleware";

async function validation(context, next) {
	// Validate request
	return next();
}

async function auth(context, next) {
	// Check auth
	return next();
}

export const onRequest = sequence(validation, auth);
```

## Context Properties

- `context.request` - Request object
- `context.url` - URL object
- `context.params` - Route params
- `context.cookies` - Cookie helpers
- `context.redirect` - Redirect helper

## Rewrite URL

```typescript
async function first(context, next) {
	return next("/"); // Rewrite to homepage
}

async function second(context, next) {
	console.log(context.url.pathname); // "/" (rewritten)
	return next();
}

export const onRequest = sequence(first, second);
```
