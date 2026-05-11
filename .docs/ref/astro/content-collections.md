# Content Collections

Source: https://github.com/withastro/docs

## Define a Collection

```typescript
// src/content.config.ts
import { defineCollection } from "astro:content";
import { glob, file } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/data/blog" }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
	}),
});

export const collections = { blog };
```

## Zod Types

- `z.string()` - String
- `z.number()` - Number
- `z.boolean()` - Boolean
- `z.date()` - Date object
- `z.coerce.date()` - Coerce string to date
- `z.array(z.string())` - Array of strings
- `z.object({})` - Nested object
- `.optional()` - Make optional
- `.default(value)` - Default value
- `.transform()` - Transform value

## Query Collection

```typescript
import { getCollection } from "astro:content";

const posts = await getCollection("blog");
```

## Get Single Entry

```typescript
import { getEntry } from "astro:content";

const entry = await getCollection("blog", "my-post-slug");
```

## Render Content

```typescript
import { render } from "astro:content";

const { Content } = await render(entry);
```

## Live Collections

For runtime data (API-driven):

```typescript
import { defineLiveCollection } from "astro:content";
import { z } from "astro/zod";

const products = defineLiveCollection({
	loader: apiLoader({ endpoint: process.env.API_URL }),
	schema: z.object({
		id: z.string(),
		name: z.string(),
		price: z.number(),
	}),
});

export const collections = { products };
```

## Loaders

- `glob({ pattern, base })` - Local files
- `file("path/to/file.json")` - Single JSON/JSONL file
- Custom loaders for APIs
