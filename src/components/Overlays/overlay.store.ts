import { persistentMap } from "@nanostores/persistent";

export interface OverlayConfig {
	active: boolean;
	campaignId: string;
	trigger: "immediate" | "delay" | "scroll";
	delayMs?: number;
	scrollThreshold?: number;
}

// Config-driven overlay settings.
export const overlayConfig: Record<string, OverlayConfig> = {
	announcementBanner: {
		active: true,
		campaignId: "announcement-1",
		trigger: "immediate" as const,
	},
	promoModal: {
		active: false,
		campaignId: "promo-1",
		trigger: "scroll" as const,
		// delayMs: 1000,
    scrollThreshold: 1000,
	},
	cookieToast: {
		active: false,
		campaignId: "cookie-1",
		trigger: "delay" as const,
		delayMs: 2000,
	},
};

// Persistent dismissal map: { [overlayId]: campaignId }
export const $overlayDismissals = persistentMap<Record<string, string>>(
	"overlay-dismissals:v1:",
	{},
);

export function dismissOverlay(overlayId: string, campaignId: string): void {
	$overlayDismissals.setKey(overlayId, campaignId);
}

export function isOverlayDismissed(
	overlayId: string,
	campaignId: string,
): boolean {
	return $overlayDismissals.get()[overlayId] === campaignId;
}

export function clearCookieConsent(): void {
	if (typeof window !== "undefined") {
		localStorage.removeItem("cookie-consent");
	}
}

export function setCookieConsent(level: "all" | "essential"): void {
	if (typeof window !== "undefined") {
		localStorage.setItem("cookie-consent", level);
	}
}

export function getCookieConsent(): "all" | "essential" | null {
	if (typeof window === "undefined") return null;
	const value = localStorage.getItem("cookie-consent");
	if (value === "all" || value === "essential") return value;
	return null;
}
