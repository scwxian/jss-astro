// Overlay manager: handles campaign overlay exclusivity, queue, triggers, and cleanup.
import { dismissOverlay, isOverlayDismissed } from "./overlay.store.ts";

interface OverlayEntry {
	element: HTMLElement;
	backdrop: HTMLElement | null;
	campaignId: string;
	trigger: "immediate" | "delay" | "scroll";
	delayMs?: number;
	scrollThreshold?: number;
}

const QUEUE_STAGGER_MS = 2000;

const registry = new Map<string, OverlayEntry>();
let activeId: string | null = null;
const queue: string[] = [];
const timers = new Set<ReturnType<typeof setTimeout>>();
let scrollController: AbortController | null = null;

function isAnyOverlayBlocking(): boolean {
	return (
		!!document.querySelector("dialog[open]") ||
		!!document.querySelector('#cart-popover[data-visible="true"]') ||
		!!document.querySelector('.nav-links[data-visible="true"]')
	);
}

function showElement(id: string): void {
	const entry = registry.get(id);
	if (!entry) return;
	entry.element.setAttribute("data-visible", "true");
	if (entry.backdrop) entry.backdrop.setAttribute("data-visible", "true");
}

function hideElement(id: string): void {
	const entry = registry.get(id);
	if (!entry) return;
	entry.element.setAttribute("data-visible", "false");
	if (entry.backdrop) entry.backdrop.setAttribute("data-visible", "false");
}

export function requestShow(id: string): void {
	if (activeId || isAnyOverlayBlocking()) {
		if (!queue.includes(id)) queue.push(id);
		return;
	}
	activeId = id;
	showElement(id);
}

export function dismiss(id: string): void {
	const entry = registry.get(id);
	if (entry) {
		dismissOverlay(id, entry.campaignId);
	}
	hideElement(id);
	if (activeId === id) {
		activeId = null;
		const next = queue.shift();
		if (next) {
			const t = setTimeout(() => requestShow(next), QUEUE_STAGGER_MS);
			timers.add(t);
		}
	}
}

function attachScrollOnce(id: string, threshold = 300): void {
	if (!scrollController) {
		scrollController = new AbortController();
	}
	const onScroll = () => {
		if (window.scrollY >= threshold) {
			requestShow(id);
			scrollController?.abort();
			scrollController = null;
		}
	};
	window.addEventListener("scroll", onScroll, {
		passive: true,
		signal: scrollController.signal,
	});
}

export function register(
	id: string,
	element: HTMLElement,
	campaignId: string,
	trigger: "immediate" | "delay" | "scroll",
	delayMs?: number,
	scrollThreshold?: number,
	backdrop?: HTMLElement | null,
): void {
	if (isOverlayDismissed(id, campaignId)) return;

	registry.set(id, {
		element,
		backdrop: backdrop || null,
		campaignId,
		trigger,
		delayMs,
		scrollThreshold,
	});

	if (trigger === "immediate") {
		requestShow(id);
	} else if (trigger === "delay" && delayMs) {
		const t = setTimeout(() => requestShow(id), delayMs);
		timers.add(t);
	} else if (trigger === "scroll") {
		attachScrollOnce(id, scrollThreshold);
	}
}

export function resetOverlays(): void {
	// Hide all registered overlays.
	registry.forEach((_, id) => hideElement(id));
	activeId = null;
	queue.length = 0;

	// Clear timers.
	timers.forEach(clearTimeout);
	timers.clear();

	// Abort scroll listener.
	scrollController?.abort();
	scrollController = null;
}

// Manual ephemeral toast: bypasses queue, replaces existing toast, auto-dismiss.
export function showToast(
	id: string,
	content: string,
	durationMs = 3000,
	position: "bottom-left" | "bottom-right" = "bottom-left",
): void {
	const existing = document.getElementById(id);
	if (existing) {
		existing.innerHTML = content;
		existing.setAttribute("data-visible", "true");
	} else {
		const el = document.createElement("div");
		el.id = id;
		el.className = `overlay-toast overlay-toast--${position}`;
		el.setAttribute("role", "status");
		el.setAttribute("data-visible", "true");
		el.innerHTML = content;
		document.body.appendChild(el);
	}

	const t = setTimeout(() => {
		const el = document.getElementById(id);
		if (el) el.setAttribute("data-visible", "false");
	}, durationMs);
	timers.add(t);
}

// Close overlays on navigation (Astro View Transitions).
if (typeof document !== "undefined") {
	document.addEventListener("astro:before-swap", () => {
		resetOverlays();
	});
}
