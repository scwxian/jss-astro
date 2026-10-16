// accordion animations handler
export function initAccordionAnimations(parentElement = document) {
	document.querySelectorAll("details").forEach((accordion) => {
		if (accordion.dataset.hasListener) return;
		accordion.dataset.hasListener = "true";

		const summary = accordion.querySelector("summary");
		const contentWrapper = accordion.querySelector(".details-content");

		if (!summary || !contentWrapper) {
			return;
		}

		summary.addEventListener("click", (event) => {
			event.preventDefault();

			if (accordion.open) {
				accordion.classList.remove("is-open");

				const animation = contentWrapper.animate(
					{ height: [`${contentWrapper.offsetHeight}px`, "0px"] },
					{ duration: 150, easing: "ease-out" },
				);
				animation.onfinish = () => {
					accordion.removeAttribute("open");
				};
			} else {
				accordion.setAttribute("open", "");
				accordion.classList.add("is-open");

				contentWrapper.animate(
					{ height: ["0px", `${contentWrapper.scrollHeight}px`] },
					{ duration: 150, easing: "ease-out" },
				);
			}
		});
	});
}

// tab layout handler
export function initTabLayout(parentElement = document) {
	const allTabWrappers = parentElement.querySelectorAll(".tab-wrapper");

	allTabWrappers.forEach((tabWrapper) => {
		if (tabWrapper.dataset.hasListener) return;
		tabWrapper.dataset.hasListener = "true";

		const tabNav = tabWrapper.querySelector(".tab-nav");
		const tabContent = tabWrapper.querySelector(".tab-content");
		const tabButtons = tabWrapper.querySelectorAll(".tab-button");
		const tabPanes = tabWrapper.querySelectorAll(".tab-pane");
		const nextBtn = tabWrapper.querySelector(".tab-next-btn");

		if (!tabNav || !tabContent || !tabButtons.length || !tabPanes.length) {
			// Skip tab-wrapper with missing elements
			return;
		}

		tabNav.addEventListener("click", (event) => {
			const clickedButton = event.target.closest(".tab-button");

			if (!clickedButton) {
				return;
			}
			event.preventDefault();

			const targetTabId = clickedButton.dataset.tab;
			if (!targetTabId) {
				// Tab button missing data-tab attribute
				return;
			}

			const targetPane = tabContent.querySelector(`#${targetTabId}`);

			if (!targetPane) {
				// No tab pane found with ID
				return;
			}

			tabButtons.forEach((btn) => btn.classList.remove("active"));
			tabPanes.forEach((pane) => pane.classList.remove("active"));

			clickedButton.classList.add("active");
			targetPane.classList.add("active");
		});

		if (nextBtn) {
			nextBtn.addEventListener("click", (e) => {
				e.preventDefault();
				const currentButton = tabWrapper.querySelector(".tab-button.active");
				if (!currentButton) return;

				const currentIndex = Array.from(tabButtons).indexOf(currentButton);

				let nextIndex = currentIndex + 1;
				if (nextIndex >= tabButtons.length) {
					nextIndex = 0;
				}

				const nextTab = tabButtons[nextIndex];
				nextTab.click();

				nextTab.scrollIntoView({
					behavior: "smooth",
					block: "nearest",
					inline: "center",
				});
			});
		}
	});
}

// Select Animations Handler
export function initSelectPanes(
	scope = document,
	containerSelector = ".select-pane-container",
	selectSelector = ".select-pane-trigger",
	paneSelector = ".select-pane",
	dataAttr = "paneId", // translates to data-recipe-pane in HTML
) {
	const containers = scope.querySelectorAll(containerSelector);

	containers.forEach((container) => {
		if (container.dataset.selectPaneInit) return;
		container.dataset.selectPaneInit = "true";

		const select = container.querySelector(selectSelector);
		const panes = container.querySelectorAll(paneSelector);

		if (!select || !panes.length) return;

		function syncPanes() {
			const selectedValue = select.value;

			panes.forEach((pane) => {
				const isActive = pane.dataset[dataAttr] === selectedValue;
				pane.classList.toggle("active", isActive);
			});
		}

		select.addEventListener("change", syncPanes);
		syncPanes();
	});
}

import { siteInfo } from "@shared/siteInfo.js";

// Common currency-to-locale mappings for deterministic formatting
const CURRENCY_LOCALE_MAP = {
	USD: "en-US",
	MYR: "en-MY",
	EUR: "en-GB",
	GBP: "en-GB",
	SGD: "en-SG",
	CAD: "en-CA",
	AUD: "en-AU",
};

// Site-wide price formatter. Optional currency override for multi-currency support.
export function formatPrice(cents, currency = siteInfo.defaultCurrency) {
	const locale = CURRENCY_LOCALE_MAP[currency] ?? "en-US";
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency,
	}).format(cents / 100);
}

// Format date as medium locale string
export function formatDate(date) {
	return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(date);
}

// Turn kebab slug into title label, e.g. "coffee-basics" -> "Coffee Basics"
export function formatCategoryLabel(slug) {
	if (!slug) return "";
	return slug
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

// Estimate reading time in minutes from raw content
export function computeReadTime(content, wpm = 220) {
	if (!content) return 1;
	const stripped = content
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/`[^`]*`/g, " ")
		.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, " $1 ")
		.replace(/<[^>]*>/g, " ")
		.replace(/https?:\/\/\S+/g, " ")
		.replace(/^\s*(\d+\.|[-+])\s+/gm, " ")
		.replace(/[#*_>~|{}[\]()]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	const words = stripped.split(" ").filter((t) => /[A-Za-z0-9]/.test(t)).length;
	return Math.max(1, Math.ceil(words / wpm));
}

// Strip HTML tags + decode entities + fix punctuation spacing
const HTML_ENTITIES = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&#39;": "'",
	"&nbsp;": " ",
};

export function stripHtml(html) {
	if (!html) return "";
	let text = html.replace(
		/&(amp|lt|gt|quot|#39|nbsp);/g,
		(_, e) => HTML_ENTITIES["&" + e + ";"] ?? _,
	);
	text = text.replace(/<[^>]*>/g, " ");
	text = text.replace(/\s+/g, " ");
	text = text.replace(/\s+([?.!,:;])/g, "$1");
	return text.trim();
}

