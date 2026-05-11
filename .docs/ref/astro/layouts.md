# Layouts

Source: https://github.com/withastro/docs

## Basic Layout

```astro
---
// src/layouts/MySiteLayout.astro
import BaseHead from "../components/BaseHead.astro";
import Footer from "../components/Footer.astro";
const { title } = Astro.props;
---

<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<BaseHead {title} />
	</head>
	<body>
		<nav>
			<a href="#">Home</a>
			<a href="#">Posts</a>
		</nav>
		<h1>{title}</h1>
		<article>
			<slot />
		</article>
		<Footer />
	</body>
</html>
```

## Using a Layout

```astro
---
import MySiteLayout from "../layouts/MySiteLayout.astro";
---

<MySiteLayout title="Home Page">
	<p>My page content, wrapped in a layout!</p>
</MySiteLayout>
```

## Nested Layouts

```astro
---
// src/layouts/BlogPostLayout.astro
import BaseLayout from "./BaseLayout.astro";
const { frontmatter } = Astro.props;
---

<BaseLayout url={frontmatter.url}>
	<h1>{frontmatter.title}</h1>
	<h2>Post author: {frontmatter.author}</h2>
	<slot />
</BaseLayout>
```

## Transferring Slots

```astro
<!-- BaseLayout.astro -->
<html lang="en">
	<head>
		<slot name="head" />
	</head>
	<body>
		<slot />
	</body>
</html>

<!-- HomeLayout.astro -->
--- import BaseLayout from './BaseLayout.astro'; ---
<BaseLayout>
	<slot name="head" slot="head" />
	<slot />
</BaseLayout>

<!-- Page usage -->
--- import HomeLayout from '../layouts/HomeLayout.astro'; ---
<HomeLayout>
	<title slot="head">Astro</title>
	<h1>Astro</h1>
</HomeLayout>
```
