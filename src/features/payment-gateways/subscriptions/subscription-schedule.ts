import type { SubscriptionInterval } from "@cart/cart.model.ts";

export interface ScheduleOptions {
	billingAlignment?: "anchored" | "rolling";
	hasDeliverySchedule?: boolean;
}

const monthNames = [
	"Jan", "Feb", "Mar", "Apr", "May", "Jun",
	"Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const INTERVAL_MAP: Record<SubscriptionInterval, string> = {
	"BIWK": "Fortnightly",
	"MTH": "Monthly",
	"BIMTH": "Bi-Monthly",
	"YR": "Yearly",
};

const PER_INTERVAL_MAP: Record<SubscriptionInterval, string> = {
	"BIWK": "2x per Month",
	"MTH": "Month",
	"BIMTH": "2 Months",
	"YR": "Year",
};

const BILLING_INTERVAL_MAP: Record<SubscriptionInterval, string> = {
	"BIWK": "Month",
	"MTH": "Month",
	"BIMTH": "2 Months",
	"YR": "Year",
};

const ANCHOR_SCHEDULE_OFFSETS: Record<SubscriptionInterval, { monthOffset: number; yearOffset: number }> = {
	"BIWK": { monthOffset: 0, yearOffset: 0 },
	"MTH": { monthOffset: 0, yearOffset: 0 },
	"BIMTH": { monthOffset: 1, yearOffset: 0 },
	"YR": { monthOffset: -1, yearOffset: 1 },
};

const ROLLING_SCHEDULE_OFFSETS: Record<SubscriptionInterval, { monthOffset: number; yearOffset: number }> = {
	"BIWK": { monthOffset: 1, yearOffset: 0 },
	"MTH": { monthOffset: 1, yearOffset: 0 },
	"BIMTH": { monthOffset: 2, yearOffset: 0 },
	"YR": { monthOffset: 0, yearOffset: 1 },
};

function getLastDayOfMonth(year: number, month: number): number {
	return new Date(Date.UTC(year, month + 1, 0)).getDate();
}

function buildResult(
	scheduleSuffix: SubscriptionInterval,
	fields: {
		nextBillingTimestamp: number;
		nextBillingDate: string;
		nextDeliveryDate?: string;
	},
) {
	return {
		...fields,
		interval: INTERVAL_MAP[scheduleSuffix],
		perInterval: PER_INTERVAL_MAP[scheduleSuffix],
		billingInterval: BILLING_INTERVAL_MAP[scheduleSuffix],
	};
}

function resolveAnchored(
	scheduleSuffix: SubscriptionInterval,
	options: ScheduleOptions,
	now: Date,
) {
	const month = now.getUTCMonth();
	const year = now.getUTCFullYear();

	// Target delivery month: Next immediate month for physical goods
	const deliveryMonthOffset = options.hasDeliverySchedule ? 1 : 0;
	const deliveryDate = new Date(Date.UTC(year, month + deliveryMonthOffset, 1));
	const deliveryMonth = deliveryDate.getUTCMonth();
	const deliveryYear = deliveryDate.getUTCFullYear();

	// Billing = The 1st day of the month AFTER the target delivery (+ interval offsets)
	const offset = ANCHOR_SCHEDULE_OFFSETS[scheduleSuffix];
	
	const billingDate = new Date(Date.UTC(
		deliveryYear + offset.yearOffset,
		deliveryMonth + offset.monthOffset + 1, // +1 shifts it to the 1st of the subsequent month
		1,
		12, 0, 0 
	));

	const billingYear = billingDate.getUTCFullYear();
	const billingMonth = billingDate.getUTCMonth();

	return buildResult(scheduleSuffix, {
		nextBillingTimestamp: Math.floor(billingDate.getTime() / 1000),
		nextBillingDate: `1 ${monthNames[billingMonth]} ${billingYear}`,
		nextDeliveryDate: options.hasDeliverySchedule
			? `2 - 6 ${monthNames[deliveryMonth]} ${deliveryYear}`
			: undefined,
	});
}

function resolveRolling(
	scheduleSuffix: SubscriptionInterval,
	options: ScheduleOptions,
	now: Date,
) {
	const month = now.getUTCMonth();
	const year = now.getUTCFullYear();
	const date = now.getUTCDate();

	const offset = ROLLING_SCHEDULE_OFFSETS[scheduleSuffix];

	// Use 1st of the month temporarily just to extract the correct year/month integers.
	const targetMonthDate = new Date(Date.UTC(year + offset.yearOffset, month + offset.monthOffset, 1));
	const targetYear = targetMonthDate.getUTCFullYear();
	const targetMonth = targetMonthDate.getUTCMonth();

	// Snap to the last day if the target month is shorter than the purchase date (e.g., Jan 31 -> Feb 28)
	const lastDay = getLastDayOfMonth(targetYear, targetMonth);
	const billingDay = Math.min(date, lastDay);
	const billingDate = new Date(Date.UTC(targetYear, targetMonth, billingDay, 12, 0, 0));

	return buildResult(scheduleSuffix, {
		nextBillingTimestamp: Math.floor(billingDate.getTime() / 1000),
		nextBillingDate: `${billingDay} ${monthNames[targetMonth]} ${targetYear}`,
		nextDeliveryDate: options.hasDeliverySchedule
			? `1 - 5 ${monthNames[month]} ${year}`
			: undefined,
	});
}

export function resolveSubscriptionSchedule(
	scheduleSuffix: SubscriptionInterval = "MTH",
	options: ScheduleOptions = {},
) {
	const now = new Date();
	return options.billingAlignment === "anchored"
		? resolveAnchored(scheduleSuffix, options, now)
		: resolveRolling(scheduleSuffix, options, now);
}
