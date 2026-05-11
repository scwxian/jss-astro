# Environment Variables

Source: https://github.com/withastro/docs

## Access Env Variables

Use `import.meta.env` (not `process.env`):

```typescript
// Public (client + server)
import.meta.env.PUBLIC_API_URL;

// Private (server only)
process.env.DB_PASSWORD; // Astro 6+
```

## .env Files

```ini
# Public - exposed to client
PUBLIC_API_URL="https://api.example.com"

# Private - server only
DB_PASSWORD="secret"
```

## Environment Checks

```typescript
if (import.meta.env.SSR) {
	// Server-side only
	const data = await db.query(process.env.DB_PASSWORD);
} else {
	// Client-side
	const data = await fetch(import.meta.env.PUBLIC_API_URL);
}
```

## TypeScript

Add to `src/env.d.ts`:

```typescript
/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly PUBLIC_API_URL: string;
	readonly PUBLIC_SITE_NAME: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
```

## Build-time vs Runtime

- **Static builds**: Values inlined at build time
- **SSR mode**: Available at runtime via adapter
