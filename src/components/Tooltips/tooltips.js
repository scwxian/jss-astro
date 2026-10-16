let tooltipEl = null;
let hideTimer = null;
let showRafId = null;

function getTooltip() {
	if (!tooltipEl || !tooltipEl.isConnected) {
		tooltipEl = document.createElement("div");
		tooltipEl.className = "tooltip global-tooltip";
		tooltipEl.popover = "manual";
		document.body.appendChild(tooltipEl);
	}
	return tooltipEl;
}

function positionTooltip(target) {
	const tooltip = getTooltip();
	const rect = target.getBoundingClientRect();
	const left = rect.left + rect.width / 2;
	const top = rect.top - 10;

	tooltip.style.left = `${left}px`;
	tooltip.style.top = `${top}px`;
	tooltip.style.transform = "translateX(-50%) translateY(-100%)";

	const tRect = tooltip.getBoundingClientRect();
	const gutter = 10;
	const leftOverflow = gutter - tRect.left;
	const rightOverflow = tRect.right - (window.outerWidth - gutter);

	if (leftOverflow > 0) {
		tooltip.style.transform = `translateX(calc(-50% + ${leftOverflow}px)) translateY(-100%)`;
	} else if (rightOverflow > 0) {
		tooltip.style.transform = `translateX(calc(-50% - ${rightOverflow}px)) translateY(-100%)`;
	}
}

function show(target) {
	const content = target.dataset.tooltipContent;
	if (!content) return;

	clearTimeout(hideTimer);
	const tooltip = getTooltip();
	tooltip.innerHTML = content;
	positionTooltip(target);

	try {
		if (!tooltip.matches(":popover-open")) {
			tooltip.showPopover();
		}
	} catch {
		// Fallback for browsers without popover support
		tooltip.style.position = "absolute";
		tooltip.style.zIndex = "100";
	}

	cancelAnimationFrame(showRafId);
	showRafId = requestAnimationFrame(() => {
		tooltip.classList.add("visible");
	});
}

function hide() {
	cancelAnimationFrame(showRafId);
	clearTimeout(hideTimer);
	if (!tooltipEl) return;

	tooltipEl.classList.remove("visible");
	const el = tooltipEl;

	hideTimer = setTimeout(() => {
		try {
			if (el?.matches(":popover-open")) {
				el.hidePopover();
			}
		} catch {
			// Popover unsupported - nothing to close
		}
	}, 250);
}

function onMouseOver(e) {
	const trigger = e.target.closest("[data-tooltip-content]");
	if (!trigger) return;
	if (trigger.contains(e.relatedTarget)) return;
	show(trigger);
}

function onMouseOut(e) {
	const trigger = e.target.closest("[data-tooltip-content]");
	if (!trigger) return;
	if (trigger.contains(e.relatedTarget)) return;
	if (!trigger.classList.contains("tooltip-locked")) hide();
}

function onClick(e) {
	const trigger = e.target.closest("[data-tooltip-content]");

	if (trigger) {
		e.stopPropagation();
		const isLocked = trigger.classList.toggle("tooltip-locked");
		if (isLocked) show(trigger);
		else hide();
		document.querySelectorAll(".tooltip-locked").forEach((n) => {
			if (n !== trigger) n.classList.remove("tooltip-locked");
		});
		return;
	}

	hide();
	document.querySelectorAll(".tooltip-locked").forEach((n) => n.classList.remove("tooltip-locked"));
}

let isInitialized = false;

export function initTooltips() {
	if (isInitialized) return;
	isInitialized = true;

	document.addEventListener("mouseover", onMouseOver);
	document.addEventListener("mouseout", onMouseOut);
	document.addEventListener("click", onClick);

	document.addEventListener("astro:before-swap", () => {
		hide();
	});
}

if (typeof document !== "undefined") {
	initTooltips();
}
