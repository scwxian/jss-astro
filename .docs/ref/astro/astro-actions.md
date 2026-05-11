# Astro Actions

Source: https://github.com/withastro/docs

## Define Actions

```typescript
// src/actions/index.ts
import { defineAction } from "astro:actions";
import { z } from "astro/zod";

export const server = {
	createProduct: defineAction({
		accept: "form", // or 'json'
		input: z.object({
			name: z.string(),
			price: z.number(),
		}),
		handler: async (input) => {
			const product = await persistToDatabase(input);
			return { id: product.id };
		},
	}),
};
```

## Call Actions

### From Client (TypeScript)

```typescript
import { actions } from "astro:actions";

const { data, error } = await actions.createProduct({ name: "Sample Product", price: 9.99 });

if (error) {
	// handle error
	return;
}
// use data
```

### From Form (HTML)

```astro
---
import { actions } from "astro:actions";
---

<form method="POST" action={actions.createProduct}>
	<input type="text" name="name" />
	<input type="number" name="price" />
	<button>Create</button>
</form>
```

## Error Handling

```typescript
import { isActionError, isInputError, ActionError } from "astro:actions";

const { data, error } = await actions.myAction(input);

if (isActionError(error)) {
	console.log(error.code); // 'INVALID_INPUT', 'UNAUTHORIZED', etc.
}

if (isInputError(error)) {
	// Handle validation errors
	console.log(error.fields.email); // ['Invalid email']
}
```

## Get Action Result in Astro Page

```astro
---
import { actions, isInputError } from "astro:actions";

const result = Astro.getActionResult(actions.newsletter);
const inputErrors = isInputError(result?.error) ? result.error.fields : {};
---

<form method="POST" action={actions.newsletter}>
	<input type="email" name="email" />
	{inputErrors.email && <p>{inputErrors.email.join(",")}</p>}
</form>
```
