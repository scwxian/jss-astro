let cleanupController;

// Extract .product-core-ui element HTML and its associated styles from full product page HTML
function extractCoreUIHTML(fullHTML) {
	const parser = new DOMParser();
	const doc = parser.parseFromString(fullHTML, "text/html");
	const coreUI = doc.querySelector(".product-core-ui");
	const content = coreUI ? coreUI.outerHTML : "";

	const styles = Array.from(doc.querySelectorAll("head style"))
		.map((style) => style.textContent)
		.join("\n");

	const stylesheetLinks = Array.from(
		doc.querySelectorAll('head link[rel="stylesheet"]'),
	).map((link) => link.getAttribute("href"));

	return { content, styles, stylesheetLinks };
}

// Inject content and styles into the modal
async function injectModalContent(extracted, injectionTarget, loaderElement) {
	if (extracted.styles) {
		const existingStyle = document.getElementById("quick-view-styles");
		if (existingStyle) {
			existingStyle.textContent = extracted.styles;
		} else {
			const styleEl = document.createElement("style");
			styleEl.id = "quick-view-styles";
			styleEl.textContent = extracted.styles;
			document.head.appendChild(styleEl);
		}
	}

	if (extracted.stylesheetLinks && extracted.stylesheetLinks.length > 0) {
		const fetches = extracted.stylesheetLinks.map(async (href) => {
			if (document.querySelector(`link[href="${href}"]`) || document.querySelector(`style[data-qv-href="${href}"]`)) {
				return;
			}

			try {
				const res = await fetch(href);
				if (!res.ok) return;
				const cssText = await res.text();
				const styleEl = document.createElement("style");
				styleEl.dataset.qvHref = href;
				styleEl.textContent = cssText;
				document.head.appendChild(styleEl);
			} catch {
				const linkEl = document.createElement("link");
				linkEl.rel = "stylesheet";
				linkEl.href = href;
				document.head.appendChild(linkEl);
			}
		});

		await Promise.all(fetches);
	}

	loaderElement.style.display = "none";
	injectionTarget.innerHTML = extracted.content;
}

document.addEventListener("astro:page-load", () => {
	if (cleanupController) {
		cleanupController.abort();
	}
	cleanupController = new AbortController();
	const { signal } = cleanupController;

	const dialog = document.getElementById("quick-view-modal");
	if (!dialog) return;

	const injectionTarget = document.getElementById("quick-view-injection");
	const loader = document.getElementById("quick-view-loader");
	const closeBtn = document.getElementById("quick-view-close");
	const expandLink = document.getElementById("quick-view-expand");

	let originalUrl = window.location.pathname + window.location.search;

	document.body.addEventListener(
		"click",
		async (e) => {
		const trigger = e.target.closest("[data-quick-view-trigger]");
		if (!trigger) return;

		if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

		e.preventDefault();

			const slug = trigger.getAttribute("data-quick-view-trigger");
			if (!slug) return;

			const loadComponentsPromise = import(
				"@shop/shop-init.js"
			).catch(() => {
				// Failed to lazy-load components - silent fail
			});

			originalUrl = window.location.pathname + window.location.search;
			injectionTarget.innerHTML = "";
			loader.style.display = "block";
			dialog.showModal();
			dialog.focus();

			if (expandLink) {
				expandLink.href = `/products/${slug}/`;
			}

			// Prevent background scrolling while modal is open
			document.body.style.overflow = "hidden";
			// Spoof the URL for shareability and back-button support
			window.history.pushState({ modalOpen: true }, "", `/products/${slug}/`);

			try {
				const [response] = await Promise.all([
					fetch(`/products/${slug}/`),
					loadComponentsPromise,
				]);

				if (!response.ok) throw new Error("Failed to fetch product page");
				const fullHTML = await response.text();
				const extracted = extractCoreUIHTML(fullHTML);
				if (!extracted.content) {
					throw new Error("Could not extract product content");
				}
				await injectModalContent(extracted, injectionTarget, loader);

				// Reveal animate-elements inside modal immediately
				injectionTarget.querySelectorAll(".animate-element").forEach((el) => {
					el.classList.add("is-visible");
				});
			} catch (error) {
				// Error loading product details - show user message
				loader.style.display = "none";
				injectionTarget.innerHTML =
					'<p style="padding: 2rem; text-align: center;">Failed to load product details 😵‍💫</p>';
			}
		},
		{ signal },
	);

	const closeModal = () => {
		dialog.close();
	};

	if (closeBtn) {
		closeBtn.addEventListener("click", closeModal, { signal });
	}

	// Close on Backdrop Click
	dialog.addEventListener(
		"click",
		(e) => {
			const rect = dialog.getBoundingClientRect();
			const isInDialog =
				rect.top <= e.clientY &&
				e.clientY <= rect.top + rect.height &&
				rect.left <= e.clientX &&
				e.clientX <= rect.left + rect.width;
			if (!isInDialog) {
				closeModal();
			}
		},
		{ signal },
	);

	// Handle Cleanup when the dialog actually closes (via Esc key, or closeModal())
	dialog.addEventListener(
		"close",
		() => {
			document.body.style.overflow = "";
			if (window.location.pathname !== originalUrl) {
				window.history.replaceState({}, "", originalUrl);
			}
			setTimeout(() => {
				injectionTarget.innerHTML = "";
			}, 300);
		},
		{ signal },
	);

	// If user hits the browser's native back button while modal is open, intercept it
	window.addEventListener(
		"popstate",
		() => {
			if (dialog.open) {
				dialog.close();
			}
		},
		{ signal },
	);
});
