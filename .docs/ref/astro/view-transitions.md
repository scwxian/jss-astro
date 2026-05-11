# View Transitions

Source: https://github.com/withastro/docs

## Enable View Transitions

```astro
---
import { ClientRouter } from "astro:transitions";
---

<!doctype html>
<html>
	<head>
		<ClientRouter />
	</head>
	<body>
		<slot />
	</body>
</html>
```

## Built-in Animations

```astro
---
import { fade, slide } from "astro:transitions";
---

<!-- Default fade -->
<div transition:animate="fade"></div>

<!-- Slide -->
<div transition:animate="slide"></div>

<!-- No animation -->
<div transition:animate="none"></div>

<!-- Custom duration -->
<div transition:animate={fade({ duration: "0.4s" })}></div>
<div transition:animate={slide({ duration: "400ms" })}></div>
```

## Transition Names

Persist elements across pages:

```astro
<!-- Page 1 -->
<img src="/img.png" transition:name="product-image" />

<!-- Page 2 - same image animates smoothly -->
<img src="/img.png" transition:name="product-image" />
```

## Per-Page Animation

```astro
<html transition:animate="fade">
	<body>
		<main transition:animate="slide">
			<slot />
		</main>
	</body>
</html>
```
