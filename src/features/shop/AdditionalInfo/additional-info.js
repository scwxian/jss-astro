import { initAccordionAnimations } from "@scripts/utils.js";

class AdditionalInfoAccordion extends HTMLElement {
	connectedCallback() {
		initAccordionAnimations(this);
	}
}

if (!customElements.get("additional-info-accordion")) {
	customElements.define("additional-info-accordion", AdditionalInfoAccordion);
}
