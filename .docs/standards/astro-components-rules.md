# Quick View Modal (QVM) & Interactive Component Standards

## Context
This project uses Astro for static site generation but implements a Single Page Application (SPA) feel using a custom Quick View Modal (QVM). The QVM dynamically fetches full product pages and injects the `.product-core-ui` HTML into the DOM via `innerHTML`. 

**Critical Constraint:** Browsers natively block standard `<script>` tags from executing when injected via `innerHTML`. Therefore, all interactive components injected into the QVM MUST use Web Components to leverage native browser DOM-watching lifecycles.

---

## Quick Reference Matrix

| Aspect | Target | Location | Implementation / Action |
| :--- | :--- | :--- | :--- |
| **JavaScript** | Interactive Component Logic | Co-located `.js` file | `class extends HTMLElement` |
| **JavaScript** | QVM Registration | `shop-init.js` | `import "./my-component.js"` |
| **CSS** | Component-Specific Styles | `.astro` file | `<style>` (Astro scoped) |
| **CSS** | 3rd-Party Lib Styles (e.g., Flatpickr) | `.astro` file | `<style is:global>` (Bypasses Dynamic Generation) |
| **CSS** | Used as component in .mdx file | Co-located `.css` file | Import in `ProductCoreUI` |

---

## 1. JavaScript Standards (Web Components)

All interactive elements rendered inside `ProductCoreUI` (and thus injected into the QVM) must be abstracted into strictly co-located Web Components.

### Rule A: The Co-location Split
Separate the HTML structure from the JavaScript logic.
1. **HTML/CSS:** Stays in `ComponentName.astro` wrapped in a custom HTML tag.
2. **Logic:** Goes in `component-name.js` alongside it.

**Example:** `src/components/products/AddToCartForm/`
```astro
<add-to-cart-form>
  <form id="add-to-cart-form">
    <slot />
  </form>
</add-to-cart-form>
```
```javascript
// add-to-cart-form.js
class AddToCartForm extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form');
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
  }
  // ... logic
}
customElements.define('add-to-cart-form', AddToCartForm);
```

### Rule B: The Registration Rule (`shop-init.js`)
To ensure the Web Component is registered in the browser's memory *before* the QVM injects the HTML, you MUST import the `.js` file into `shop-init.js`. 
* `shop-init.js` is imported by `modal-router.js` (lazy-loaded on click) and `ProductCoreUI.astro`.
* Astro will deduplicate the bundle, ensuring it is only fetched and evaluated once.

```javascript
// shop-init.js
import "../../components/products/AddToCartForm/add-to-cart-form.js";
```

---

## 2. CSS Standards

`modal-router.js` is designed to scrape all `<style>` and `<link rel="stylesheet">` tags from the fetched product page's `<head>` and inject them into the QVM. Rely on Astro's native CSS handling to route styles correctly.

### Rule A: Component-Specific CSS
Write styles directly at the bottom of the `.astro` file. Astro will automatically scope them (e.g., `.btn[data-astro-cid-xyz]`), preventing bleed-out.

```astro
<style>
  /* Safe: Will only apply to this specific component */
  .info-accordion { padding: 1rem; }
</style>
```

### Rule B: Third-Party Libraries (`is:global`)
If your component generates DOM nodes at runtime (like Flatpickr or Tooltips), Astro's scoped hashing will break the styles. You MUST use `<style is:global>`. This keeps the CSS bundled with the component but removes the hash.

```astro
<style is:global>
  /* Safe: Bypasses scoping so dynamically generated JS elements receive styles */
  .flatpickr-calendar { background: white; }
</style>
```

### Rule C: External CSS
Styles that apply to components that will be used on the Content section of .mdx files will need to have their styles extracted and stored in `.css` files, then imported in `ProductCoreUI.astro`.

---

## Decision Flowchart

```text
Developing a UI Element for ProductCoreUI?
├── Does it require Client-Side Interactivity (Clicks, Form State, Fetch)?
│   ├── NO  → Standard Astro Component (HTML + CSS only)
│   └── YES → Create Custom HTML Element `<my-element>`
│       ├── Put JS in `my-element.js` (class extends HTMLElement)
│       └── Add `import "./my-element.js"` to `shop-init.js`
├── Does it require CSS?
│   ├── Used in .mdx Content     → Create co-located `.css` file
│   ├── Internal Component UI    → `<style>` inside `.astro`
│   └── Styling 3rd-Party JS DOM → `<style is:global>` inside `.astro`
```

---

## Common Mistakes

### ❌ Inline Scripts for Injected Components
```astro
<script>
  document.querySelector('.btn').addEventListener('click', () => {...})
</script>
```

### ❌ Relying on Global Event Listeners for Forms
```javascript
// WRONG: Coupling global scripts to localized DOM IDs makes QVM logic fragile.
document.addEventListener("submit", (e) => {
  if (e.target.id === "add-to-cart") { ... }
});

// CORRECT: Encapsulate the listener inside the Web Component's connectedCallback()
```

### ❌ Duplicating JS Imports
```astro
<script src="./my-component.js"></script>

```

### ❌ Using `is:inline` for Component Styles
```astro
<style is:inline>

<style is:global>
```
