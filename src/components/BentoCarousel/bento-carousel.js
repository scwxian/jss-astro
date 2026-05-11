export class BentoCarouselElement extends HTMLElement {
	constructor() {
		super();
		this.isScrolling = false;
	}

	connectedCallback() {
		this.tabs = this.querySelector(".bento-carousel-tabs");
		this.cardsContainer = this.querySelector(".bento-carousel-cards");

		if (!this.tabs || !this.cardsContainer) return;
		this.tabButtons = this.tabs.querySelectorAll(".tab-button");
		this.cards = this.cardsContainer.querySelectorAll("[data-card-id]");
		this.progressFill = this.tabs.querySelector(".tabs-progress-fill");

		this.initScrollListener();
		this.initIntersectionObserver();
		this.initTabClicks();
		this.updateProgressBar();
	}

	updateProgressBar() {
		if (this.progressFill && this.cards.length > 0) {
			const scrollLeft = this.cardsContainer.scrollLeft + this.cards[0].getBoundingClientRect().width + 50;
			const maxScroll = this.cardsContainer.scrollWidth - this.cardsContainer.clientWidth;
			const scrollProgress = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;
			this.progressFill.style.width = `${scrollProgress}%`;
		}
		this.isScrolling = false;
	}

	initScrollListener() {
		this.cardsContainer.addEventListener(
			"scroll",
			() => {
				if (!this.isScrolling) {
					window.requestAnimationFrame(() => this.updateProgressBar());
					this.isScrolling = true;
				}
			},
			{ passive: true },
		);
	}

	initIntersectionObserver() {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					const cardId = entry.target.dataset.cardId;

					if (entry.isIntersecting) {
						entry.target.classList.add("in-view");

						let activeTab = null;
						this.tabButtons.forEach((btn) => {
							const isActive = btn.dataset.tab === cardId;
							btn.classList.toggle("active", isActive);
							btn.setAttribute("aria-selected", String(isActive));
							if (isActive) activeTab = btn;
						});

						// Scroll tabs to keep active item in view
						if (activeTab) {
							const tabsRect = this.tabs.getBoundingClientRect();
							const tabRect = activeTab.getBoundingClientRect();
							const scrollOffset =
								tabRect.left +
								tabRect.width / 2 -
								(tabsRect.left + tabsRect.width / 2);

							this.tabs.scrollBy({ left: scrollOffset, behavior: "smooth" });
						}
					} else {
						entry.target.classList.remove("in-view");
					}
				});
			},
			{
				root: this.cardsContainer,
				threshold: 0.5,
			},
		);

		this.cards.forEach((card) => observer.observe(card));
	}

	initTabClicks() {
		this.tabButtons.forEach((btn) => {
			btn.addEventListener("click", () => {
				const tabId = btn.dataset.tab;
				const targetCard = this.cardsContainer.querySelector(
					`[data-card-id="${tabId}"]`,
				);

				if (targetCard) {
					const containerRect = this.cardsContainer.getBoundingClientRect();
					const cardRect = targetCard.getBoundingClientRect();

					// Calculate center position
					const scrollOffset =
						cardRect.left -
						containerRect.left -
						containerRect.width / 2 +
						cardRect.width / 2;

					this.cardsContainer.scrollBy({
						left: scrollOffset,
						behavior: "smooth",
					});
				}
			});
		});
	}
}

if (!customElements.get("bento-carousel")) {
	customElements.define("bento-carousel", BentoCarouselElement);
}
