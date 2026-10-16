import { initAccordionAnimations } from "@scripts/utils.js";

class AccordionList extends HTMLElement {
	connectedCallback() {
		initAccordionAnimations(this);
	}
}

if (!customElements.get("accordion-list")) {
	customElements.define("accordion-list", AccordionList);
}
