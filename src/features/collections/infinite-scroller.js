let observer;

document.addEventListener("astro:page-load", () => {
	if (observer) {
		observer.disconnect();
	}

	const grid = document.querySelector("[data-collection-grid]");
	const trigger = document.querySelector("[data-infinite-scroll-trigger]");

	if (!grid || !trigger) return;

	let isLoading = false;

	const loadNextPage = async () => {
		if (isLoading) return;
		isLoading = true;

		const nextUrl = trigger.getAttribute("href");
		if (!nextUrl) return;

		try {
			const originalText = trigger.textContent;
			trigger.textContent = "Loading...";
			trigger.style.pointerEvents = "none";

			const response = await fetch(nextUrl);
			if (!response.ok) throw new Error("Network response failed");

			const htmlText = await response.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(htmlText, "text/html");

			const newGrid = doc.querySelector("[data-collection-grid]");
			const newTrigger = doc.querySelector("[data-infinite-scroll-trigger]");

			if (newGrid) {
				const newItems = Array.from(newGrid.children);
				newItems.forEach((item) => grid.appendChild(item));
			}

			if (newTrigger) {
				const newHref = newTrigger.getAttribute("href");
				trigger.setAttribute("href", newHref);
				trigger.textContent = originalText;
				trigger.style.pointerEvents = "auto";

				window.history.replaceState({}, "", nextUrl);
			} else {
				observer.unobserve(trigger);
				trigger.remove();
			}
		} catch (error) {
			// Failed to load more items - show retry UI
			trigger.textContent = "Load More (Retry)";
			trigger.style.pointerEvents = "auto";
		} finally {
			isLoading = false;
		}
	};

	observer = new IntersectionObserver(
		(entries) => {
			if (entries[0].isIntersecting) {
				loadNextPage();
			}
		},
		{
			root: null,
			rootMargin: "400px",
			threshold: 0,
		}
	);

	trigger.addEventListener("click", (e) => {
		e.preventDefault();
		loadNextPage();
	});

	observer.observe(trigger);
});
