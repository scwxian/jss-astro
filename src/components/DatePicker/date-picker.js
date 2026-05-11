import flatpickr from "flatpickr";

class DatePicker extends HTMLElement {
	connectedCallback() {
		if (this.dataset.initialized) return;
		this.dataset.initialized = "true";

		const dateInput = this.querySelector("input.date-input");
		if (!dateInput) return;

		const maxFutureDays = 45;

		// Calculate max date: today + 45 days
		const maxDate = new Date();
		maxDate.setDate(maxDate.getDate() + maxFutureDays);

		// Initialize flatpickr and store instance for cleanup
		this._flatpickrInstance = flatpickr(dateInput, {
			minDate: "today",
			maxDate: maxDate,
			dateFormat: "U",
			altInput: true,
			altFormat: "D, j F Y",
			disableMobile: true,
			static: true,
			onReady: (selectedDates, dateStr, instance) => {
				const prevSvg = `<svg xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated;shape-rendering:crispEdges" viewBox="0 0 5 8"><path fill="currentColor" d="M3 0h2v1H3zM2 1h2v1H2zM1 2h2v1H1zM0 3h2v2H0zM1 5h2v1H1zM2 6h2v1H2zM3 7h2v1H3z"/></svg>`;
				const nextSvg = `<svg xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated;shape-rendering:crispEdges" viewBox="0 0 5 8"><path fill="currentColor" d="M0 0h2v1H0zM1 1h2v1H1zM2 2h2v1H2zM3 3h2v2H3zM2 5h2v1H2zM1 6h2v1H1zM0 7h2v1H0z"/></svg>`;

				const prevBtn = instance.calendarContainer.querySelector(
					".flatpickr-prev-month svg",
				);
				const nextBtn = instance.calendarContainer.querySelector(
					".flatpickr-next-month svg",
				);
				if (prevBtn) prevBtn.outerHTML = prevSvg;
				if (nextBtn) nextBtn.outerHTML = nextSvg;
			},
		});
	}

	disconnectedCallback() {
		// Clean up flatpickr instance to prevent memory leaks
		if (this._flatpickrInstance) {
			this._flatpickrInstance.destroy();
			this._flatpickrInstance = null;
		}
	}
}

// Guard against double-registration
if (!customElements.get("date-picker")) {
	customElements.define("date-picker", DatePicker);
}
