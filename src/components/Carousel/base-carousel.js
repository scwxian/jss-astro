class BaseCarousel extends HTMLElement {
	connectedCallback() {
		if (this.dataset.initialized) return;
		this.dataset.initialized = "true";

		this.track = this.querySelector(".carousel-track");
		this.slides = Array.from(this.querySelectorAll(".carousel-slide"));
		this.indicators = Array.from(this.querySelectorAll(".carousel-indicator"));
		this.prevBtn = this.querySelector(".carousel-button.prev");
		this.nextBtn = this.querySelector(".carousel-button.next");
		this.autoCycle = null;
		this.activeIndex = 0;

		if (!this.track || this.slides.length === 0) return;

		this.slideObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const activeIndex = this.slides.indexOf(entry.target);
						this.indicators.forEach((ind, i) => {
							ind.classList.toggle("active", i === activeIndex);
						});
					}
				});
			},
			{ root: this.track, threshold: 0.5 }
		);

		this.slides.forEach((slide) => this.slideObserver.observe(slide));

		this.scrollToSlide = (index) => {
			if (index < 0 || index >= this.slides.length) return;
			this.activeIndex = index;
			const slide = this.slides[index];

			const targetScroll = slide.offsetLeft - this.track.clientWidth / 2 + slide.clientWidth / 2;
			this.track.scrollTo({ left: targetScroll, behavior: "smooth" });
		};

		this.scrollNext = () => {
			let nextIndex = this.activeIndex + 1;
			if (nextIndex >= this.slides.length) {
				nextIndex = 0;
			}
			this.scrollToSlide(nextIndex);
		};

		this.scrollPrev = () => {
			let prevIndex = this.activeIndex - 1;
			if (prevIndex < 0) {
				prevIndex = this.slides.length - 1;
			}
			this.scrollToSlide(prevIndex);
		};

		if (this.prevBtn) this.prevBtn.addEventListener("click", this.scrollPrev);
		if (this.nextBtn) this.nextBtn.addEventListener("click", this.scrollNext);

		this.indicators.forEach((indicator, index) => {
			indicator.addEventListener("click", () => {
				this.scrollToSlide(index);
			});
		});

		if (this.dataset.interval) {
			const intervalTime = parseInt(this.dataset.interval);

			this.startCycle = () => {
				if (!this.autoCycle) this.autoCycle = setInterval(this.scrollNext, intervalTime);
			};
			this.stopCycle = () => {
				if (this.autoCycle) {
					clearInterval(this.autoCycle);
					this.autoCycle = null;
				}
			};

			this.startCycle();
			this.addEventListener("mouseenter", this.stopCycle);
			this.addEventListener("mouseleave", this.startCycle);
			this.addEventListener("touchstart", this.stopCycle, { passive: true });
			this.addEventListener("touchend", this.startCycle);
		}
	}

	disconnectedCallback() {
		if (this.slideObserver) {
			this.slideObserver.disconnect();
		}
		if (this.autoCycle) {
			clearInterval(this.autoCycle);
		}
	}
}

// Guard against double-registration
if (!customElements.get("base-carousel")) {
	customElements.define("base-carousel", BaseCarousel);
}
