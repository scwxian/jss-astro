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

// Global YouTube Modal Handler
// Define the escape handler globally so it can be reliably added/removed
function globalYouTubeEscapeHandler(e) {
	if (e.key === "Escape") {
		closeGlobalYouTubeModal();
	}
}

function closeGlobalYouTubeModal() {
	const modal = document.getElementById("global-youtube-modal");
	if (!modal) return;
	if (modal.matches(":popover-open")) {
		modal.hidePopover();
	}
	modal.classList.remove("visible");
	const iframeEl = modal.querySelector(".yt-modal-iframe");
	if (iframeEl) iframeEl.src = "";
	document.removeEventListener("keydown", globalYouTubeEscapeHandler);
}

export function initYouTubeModals(
	scope = document,
	triggerSelector = ".youtube-trigger",
) {
	const triggers = scope.querySelectorAll(triggerSelector);
	triggers.forEach((trigger) => {
		if (trigger.dataset.ytInitialized) return;
		trigger.dataset.ytInitialized = "true";
		trigger.addEventListener("click", () => {
			const videoId = trigger.dataset.youtubeId;
			if (!videoId) return;
			const rawTitle = trigger.dataset.modalTitle || "Now Playing";
			let modal = document.getElementById("global-youtube-modal");
			if (modal && modal.matches(":popover-open")) {
				closeGlobalYouTubeModal();
				return;
			}

			if (!modal) {
				modal = document.createElement("div");
				modal.id = "global-youtube-modal";
				modal.className = "youtube-modal";
				modal.popover = "manual";
				modal.innerHTML = `
					<div class="youtube-modal-header">
						<span class="youtube-modal-title yt-modal-title"></span>
						<button class="youtube-modal-close yt-modal-close" aria-label="Close video">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
								<path d="M5 5L15 15M5 15L15 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
							</svg>
						</button>
					</div>
					<div class="youtube-modal-content">
						<iframe 
							class="yt-modal-iframe" 
							src="" 
							frameborder="0" 
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
							allowfullscreen
						></iframe>
					</div>
				`;
				document.body.appendChild(modal);
				const closeBtn = modal.querySelector(".yt-modal-close");
				closeBtn.addEventListener("click", closeGlobalYouTubeModal);
			}

			const titleEl = modal.querySelector(".yt-modal-title");
			const iframeEl = modal.querySelector(".yt-modal-iframe");
			titleEl.textContent = rawTitle;
			iframeEl.src = `https://www.youtube.com/embed/${videoId}?controls=0&rel=0&modestbranding=1`;
			if (!modal.matches(":popover-open")) {
				modal.showPopover();
			}
			requestAnimationFrame(() => {
				modal.classList.add("visible");
			});

			document.removeEventListener("keydown", globalYouTubeEscapeHandler);
			document.addEventListener("keydown", globalYouTubeEscapeHandler);
		});
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

