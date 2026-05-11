# Images & Assets

Source: https://github.com/withastro/docs

## Image Component

```astro
---
import { Image } from "astro:assets";
import myImage from "../assets/my-image.png";
---

<Image src={myImage} alt="Description" />
```

## Props

- `src` - Image import or remote URL
- `alt` - Required alt text
- `width` / `height` - Set dimensions
- `format` - Output format (webp, avif, png)
- `quality` - Image quality (0-100)
- `densities` - Responsive srcset
- ` widths` - Generate srcset

## getImage Function

```astro
---
import { getImage } from "astro:assets";
import myImage from "../background.png";

const optimized = await getImage({
	src: myImage,
	format: "avif",
	width: 800,
});
---

<div style={`background-image: url(${optimized.src})`}></div>
```

## Picture Component

```astro
---
import { Picture } from "astro:assets";
import myImage from "../assets/photo.png";
---

<Picture src={myImage} formats={["avif", "webp"]} alt="Photo" />
```

## Remote Images

```astro
<Image src="https://example.com/image.png" alt="Remote" />
```

Configure allowed domains in `astro.config.mjs`:

```javascript
import { defineConfig } from "astro/config";

export default defineConfig({
	image: {
		domains: ["example.com"],
	},
});
```
