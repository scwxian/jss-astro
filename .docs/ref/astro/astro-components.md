# Astro Components

Source: https://github.com/withastro/docs

## Component Structure

An Astro component (`.astro`) consists of three parts:

1. **Frontmatter** - JavaScript that runs at build time
2. **Template** - HTML with dynamic expressions
3. **Styles** - Scoped CSS

```astro
---
// Frontmatter - runs at build time
const pageTitle = "Hello World";
const { greeting = "Hi" } = Astro.props;
---

<!-- Template - HTML with dynamic expressions -->
<h1>{greeting}, {pageTitle}!</h1>

<style>
	h1 {
		color: orange;
	}
</style>
```

## Frontmatter

The frontmatter is the code fence (`---`) at the top. Variables defined here are available in the template.

```astro
---
const name = "Astro";
const items = ["one", "two", "three"];
---

<h1>Hello, {name}!</h1>
<ul>
	{items.map((item) => <li>{item}</li>)}
</ul>
```

## Props

Access props via `Astro.props`:

```astro
---
const { title, count = 0 } = Astro.props;
---

<h1>{title} ({count})</h1>
```

## Slots

```astro
---
// Component with slot
---

<div class="wrapper">
	<slot />
</div>

<!-- Usage -->
<Wrapper>
	<p>Content goes here</p>
</Wrapper>
```

## CSS Variables with define:vars

Pass frontmatter variables to CSS:

```astro
---
const foregroundColor = "rgb(221 243 228)";
const backgroundColor = "rgb(24 121 78)";
---

<style define:vars={{ foregroundColor, backgroundColor }}>
	h1 {
		background-color: var(--backgroundColor);
		color: var(--foregroundColor);
	}
</style>
```

## Key Directives

- `{expression}` - Render expression
- `set:html={content}` - Render HTML
- `set:text={content}` - Render text
- `define:vars={{}}` - Pass variables to CSS
- `is:raw` - Render as plain text

## Component Props Interface

For TypeScript, define props with an interface:

```astro
---
interface Props {
	title: string;
	count?: number;
}
const { title, count = 0 } = Astro.props;
---
```
