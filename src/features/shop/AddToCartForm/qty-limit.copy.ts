// Single source of truth for quantity-limit copy (SSR + client runtime).
const CONTACT_HREF = "/#contact";

export interface QtyLimitRule {
	min: number; // applies when maxQuantity >= min (highest match wins)
	headline: string; // supports {qty}; rendered bold
	contactTail?: string; // text after "Contact us"; omit = no contact line
	alwaysVisible: boolean; // true = show regardless of selected quantity
}

// Edit copy here only. Order-independent (matched by highest min).
export const qtyLimitRules: QtyLimitRule[] = [
	{
		min: 4,
		headline: "Max Quantity for this product is {qty}",
		contactTail: "for bulk orders.",
		alwaysVisible: false,
	},
	{
		min: 2,
		headline: "{qty} Units Left",
		contactTail: "for larger quantities.",
		alwaysVisible: false,
	},
	{
		min: 1,
		headline: "Last Unit Left!",
		contactTail: "for larger quantities.",
		alwaysVisible: true,
	},
];

export interface QtyLimitCopy {
	html: string;
	alwaysVisible: boolean;
}

export function getQtyLimitCopy(maxQuantity: number): QtyLimitCopy | null {
	if (!Number.isFinite(maxQuantity) || maxQuantity < 1) return null;
	const rule = [...qtyLimitRules]
		.sort((a, b) => b.min - a.min)
		.find((r) => maxQuantity >= r.min);
	if (!rule) return null;

	let html = `<b>${rule.headline.replaceAll("{qty}", String(maxQuantity))}</b><br>`;
	if (rule.contactTail) {
		html += ` <a href="${CONTACT_HREF}">Contact us</a> ${rule.contactTail}`;
	}
	return { html, alwaysVisible: rule.alwaysVisible };
}

export function isQtyLimitVisible(
	maxQuantity: number,
	selectedQty: number,
): boolean {
	const copy = getQtyLimitCopy(maxQuantity);
	return copy ? copy.alwaysVisible || selectedQty >= maxQuantity : false;
}
