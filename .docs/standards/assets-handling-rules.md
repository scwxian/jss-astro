# Asset Handling Rules

## Quick Reference Matrix

| Asset Type               | Location                | Implementation                        | Astro Optimization             |
| ------------------------ | ----------------------- | ------------------------------------- | ------------------------------ |
| **Content Photos**       | R2 Bucket               | `getAssetUrl()` + `<Image inferSize>` | ✅ Build-time                  |
| **System/Pre-optimized** | `public/`               | `<img>` (root-relative `/`)           | ❌ None                        |
| **Local UI Graphics**    | `src/assets/`           | `import` + `<Image>`                  | ✅ Build-time                  |

---

## 1. R2 Content Assets

Used for product photos, blog media, and page-specific banners.
**Base URL:** `https://assets.yoursite.com/<collection>/<slug>/<filename>`

### A. Standard Images (Photos, Gradients)

Use Astro's `<Image>` to trigger build-time compression.

```astro
import {Image} from "astro:assets"; import {getAssetUrl} from "../scripts/asset-handling/r2-linking.js";

<Image src={getAssetUrl("products", "slug", "hero.webp")} alt="Hero" inferSize />
```

### B. Videos

Use standard HTML tags. `getAssetUrl()` automatically resolves `.mp4`/`.webm`.

```astro
<video src={getAssetUrl("products", "slug", "demo.mp4")} controls preload="metadata"></video>
```

---

## 2. Public Directory Assets (`public/`)

Used for system files (`favicon.ico`), or manually pre-optimized images that Astro should ignore.

- **Rule:** ALWAYS use standard `<img>` with root-relative paths. NEVER use `<Image>`.

```astro
<img src="/meta-assets/social-share.webp" alt="Share" />
<img src="/assets/images/local-sprite.png" />
```

---

## 3. Local UI Assets (`src/assets/`)

Used for structural logos and UI graphics.

- **Rule:** Import the file and use Astro's `<Image>`.

```astro
import {Image} from "astro:assets"; import logo from "../assets/images/logo.png";

<Image src={logo} alt="Logo" />
```

---

## Decision Flowchart

```text
Asset Category?
├── Content Image (R2)
│   ├── Photograph/Smooth UI  → getAssetUrl() + <Image inferSize>
├── Content Video (R2)        → getAssetUrl() + <video>
├── System / Pre-optimized    → public/ + <img> (Root-relative)
└── Local UI Graphic          → src/assets/ + Import + <Image>
```

---

## Component Reference & Helpers

- **`getAssetUrl(collection, slug, filename)`**: Returns resolved R2 string. Passes external URLs (`http://`) through untouched.
- **`ImageCarousel` / `ProductCarousel`**: Automatically detects R2 URLs vs Public paths and applies `<Image inferSize>` or `<img>` accordingly.

## Common Mistakes

### ❌ Using Astro Image for public assets

```astro
<!-- WRONG: Public assets should use standard img -->
<Image src="/assets/images/spritesheet.png" alt="..." />
```

### ❌ Hardcoding R2 URLs

```astro
<!-- WRONG: Use getAssetUrl() for maintainability -->
<Image src="https://assets.yoursite.com/products/slug/image.jpg" alt="..." />

<!-- Correct -->
<Image src={getAssetUrl("products", "slug", "image.jpg")} alt="..." inferSize />
```

### ❌ Forgetting inferSize for remote images

```astro
<!-- WRONG: Remote images need inferSize for dimension detection -->
<Image src={getAssetUrl("products", "slug", "hero.webp")} alt="..." />

<!-- Correct -->
<Image src={getAssetUrl("products", "slug", "hero.webp")} alt="..." inferSize />
```
