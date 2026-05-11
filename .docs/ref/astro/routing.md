# File-based Routing

Source: https://github.com/withastro/docs

## Overview

Astro uses file-based routing. Each file in `src/pages/` becomes a route.

```
src/pages/index.astro      → /
src/pages/about.astro      → /about
src/pages/blog/[id].astro  → /blog/1, /blog/2, etc.
```

## Dynamic Routes

```astro
---
// src/pages/blog/[id].astro
export async function getStaticPaths() {
  const posts = await fetchPosts();
  return posts.map(post => ({
    params: { id: post.id },
    props: { post },
  }));
}

const { id } = Astro.params;
const { post } = Astro.props;
---
<h1>{post.title}</h1>
```

## Route Parameters

- `[param]` - Required param
- `[...param]` - Catch-all
- `[...param]` with `spread` - Optional (Astro 5+)

```astro
# src/pages/[...slug].astro
export async function getStaticPaths() {
  return [
    { params: { slug: 'about' } },
    { params: { slug: 'blog/post-1' } },
  ];
}

const { slug } = Astro.params;
```

## Access Route Data

- `Astro.params` - Dynamic route params
- `Astro.props` - Props from getStaticPaths
- `Astro.url` - Current URL
- `Astro.request` - Request object

## Rest Parameters

```astro
# src/pages/[...path].astro
export async function getStaticPaths() {
  return [
    { params: { path: 'a/b/c' } },
  ];
}

const { path } = Astro.params;  // "a/b/c"
```