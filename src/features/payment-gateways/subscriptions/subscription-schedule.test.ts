import { describe, it, expect } from "vitest";
import type { SubscriptionInterval } from "@cart/cart.model.ts";
import { resolveSubscriptionSchedule } from "./subscription-schedule.ts";
import type { ScheduleOptions } from "./subscription-schedule.ts";

// Factory: mock a specific purchase date
function mockDate(year: number, monthIndex: number, day: number): Date {
	return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0));
}

// Factory: run resolver with mocked now
function resolveAt(
	scheduleSuffix: SubscriptionInterval,
	options: ScheduleOptions,
	purchaseDate: Date,
) {
	// Override Date constructor within this call
	const OriginalDate = globalThis.Date;
	(globalThis as unknown as { Date: typeof Date }).Date = class extends OriginalDate {
		constructor(...args: unknown[]) {
			if (args.length === 0) {
				super(purchaseDate);
			} else {
				super(...(args as [number, number, number]));
			}
		}
	} as typeof Date;
	const result = resolveSubscriptionSchedule(scheduleSuffix, options);
	(globalThis as unknown as { Date: typeof Date }).Date = OriginalDate;
	return result;
}

describe("resolveSubscriptionSchedule — anchored", () => {
	it("MTH: delivery next month, billing 1st of month after delivery", () => {
		const result = resolveAt("MTH", { billingAlignment: "anchored", hasDeliverySchedule: true }, mockDate(2026, 5, 15));

		expect(result.nextDeliveryDate).toBe("1 - 5 Jul 2026");
		expect(result.nextBillingDate).toBe("1 Aug 2026");
		expect(result.nextBillingTimestamp).toBe(Math.floor(new Date(Date.UTC(2026, 7, 1, 12, 0, 0)).getTime() / 1000));
	});

	it("BIWK: same as MTH for anchored billing date", () => {
		const result = resolveAt("BIWK", { billingAlignment: "anchored", hasDeliverySchedule: true }, mockDate(2026, 5, 15));

		expect(result.nextDeliveryDate).toBe("1 - 5 Jul 2026");
		expect(result.nextBillingDate).toBe("1 Aug 2026");
	});

	it("BIMTH: delivery next month, billing 1st of delivery month + 2", () => {
		const result = resolveAt("BIMTH", { billingAlignment: "anchored", hasDeliverySchedule: true }, mockDate(2026, 5, 15));

		expect(result.nextDeliveryDate).toBe("1 - 5 Jul 2026");
		expect(result.nextBillingDate).toBe("1 Sep 2026");
	});

	it("YR: delivery next month, billing 1st of 12 months later (Jul 2026 → Jul 2027)", () => {
		const result = resolveAt("YR", { billingAlignment: "anchored", hasDeliverySchedule: true }, mockDate(2026, 5, 15));

		expect(result.nextDeliveryDate).toBe("1 - 5 Jul 2026");
		expect(result.nextBillingDate).toBe("1 Jul 2027");
		expect(result.nextBillingTimestamp).toBe(Math.floor(new Date(Date.UTC(2027, 6, 1, 12, 0, 0)).getTime() / 1000));
	});

	it("YR Jan purchase: delivery Feb, billing 1st Feb next year", () => {
		const result = resolveAt("YR", { billingAlignment: "anchored", hasDeliverySchedule: true }, mockDate(2026, 0, 15));

		expect(result.nextDeliveryDate).toBe("1 - 5 Feb 2026");
		expect(result.nextBillingDate).toBe("1 Feb 2027");
	});

	it("YR Dec purchase: delivery Jan, billing 1st Jan next year (negative month wrap)", () => {
		const result = resolveAt("YR", { billingAlignment: "anchored", hasDeliverySchedule: true }, mockDate(2026, 11, 15));

		expect(result.nextDeliveryDate).toBe("1 - 5 Jan 2027");
		expect(result.nextBillingDate).toBe("1 Jan 2028");
	});

	it("omits nextDeliveryDate when hasDeliverySchedule is false", () => {
		const result = resolveAt("MTH", { billingAlignment: "anchored", hasDeliverySchedule: false }, mockDate(2026, 5, 15));

		expect(result.nextDeliveryDate).toBeUndefined();
		expect(result.nextBillingDate).toBe("1 Jul 2026");
	});

	it("MTH year rollover: Dec purchase → Jan delivery, Feb billing", () => {
		const result = resolveAt("MTH", { billingAlignment: "anchored", hasDeliverySchedule: true }, mockDate(2026, 11, 15));

		expect(result.nextDeliveryDate).toBe("1 - 5 Jan 2027");
		expect(result.nextBillingDate).toBe("1 Feb 2027");
	});
});

describe("resolveSubscriptionSchedule — rolling", () => {
	it("MTH: delivery current month, billing +1 month same date", () => {
		const result = resolveAt("MTH", { billingAlignment: "rolling", hasDeliverySchedule: true }, mockDate(2026, 5, 15));

		expect(result.nextDeliveryDate).toBe("1 - 5 Jun 2026");
		expect(result.nextBillingDate).toBe("15 Jul 2026");
	});

	it("BIWK: same as MTH for rolling billing date", () => {
		const result = resolveAt("BIWK", { billingAlignment: "rolling", hasDeliverySchedule: true }, mockDate(2026, 5, 15));

		expect(result.nextDeliveryDate).toBe("1 - 5 Jun 2026");
		expect(result.nextBillingDate).toBe("15 Jul 2026");
	});

	it("BIMTH: billing +2 months from purchase", () => {
		const result = resolveAt("BIMTH", { billingAlignment: "rolling", hasDeliverySchedule: true }, mockDate(2026, 5, 15));

		expect(result.nextDeliveryDate).toBe("1 - 5 Jun 2026");
		expect(result.nextBillingDate).toBe("15 Aug 2026");
	});

	it("YR: delivery current month, billing +1 year same date", () => {
		const result = resolveAt("YR", { billingAlignment: "rolling", hasDeliverySchedule: true }, mockDate(2026, 5, 15));

		expect(result.nextDeliveryDate).toBe("1 - 5 Jun 2026");
		expect(result.nextBillingDate).toBe("15 Jun 2027");
	});

	it("YR Dec purchase: billing Dec next year", () => {
		const result = resolveAt("YR", { billingAlignment: "rolling", hasDeliverySchedule: true }, mockDate(2026, 11, 15));

		expect(result.nextDeliveryDate).toBe("1 - 5 Dec 2026");
		expect(result.nextBillingDate).toBe("15 Dec 2027");
	});

	it("omits nextDeliveryDate when hasDeliverySchedule is false", () => {
		const result = resolveAt("MTH", { billingAlignment: "rolling", hasDeliverySchedule: false }, mockDate(2026, 5, 15));

		expect(result.nextDeliveryDate).toBeUndefined();
		expect(result.nextBillingDate).toBe("15 Jul 2026");
	});
});

describe("resolveSubscriptionSchedule — rolling month-end overflow", () => {
	it("MTH: Jan 31 → Feb 28 (non-leap year)", () => {
		const result = resolveAt("MTH", { billingAlignment: "rolling" }, mockDate(2026, 0, 31));
		expect(result.nextBillingDate).toBe("28 Feb 2026");
	});

	it("MTH: Mar 31 → Apr 30", () => {
		const result = resolveAt("MTH", { billingAlignment: "rolling" }, mockDate(2026, 2, 31));
		expect(result.nextBillingDate).toBe("30 Apr 2026");
	});

	it("MTH: May 31 → Jun 30", () => {
		const result = resolveAt("MTH", { billingAlignment: "rolling" }, mockDate(2026, 4, 31));
		expect(result.nextBillingDate).toBe("30 Jun 2026");
	});

	it("MTH: Jul 31 → Aug 31 (no overflow, Aug has 31 days)", () => {
		const result = resolveAt("MTH", { billingAlignment: "rolling" }, mockDate(2026, 6, 31));
		expect(result.nextBillingDate).toBe("31 Aug 2026");
	});

	it("MTH: Aug 31 → Sep 30", () => {
		const result = resolveAt("MTH", { billingAlignment: "rolling" }, mockDate(2026, 7, 31));
		expect(result.nextBillingDate).toBe("30 Sep 2026");
	});

	it("MTH: Oct 31 → Nov 30", () => {
		const result = resolveAt("MTH", { billingAlignment: "rolling" }, mockDate(2026, 9, 31));
		expect(result.nextBillingDate).toBe("30 Nov 2026");
	});

	it("MTH: Dec 31 → Jan 31 (year rollover)", () => {
		const result = resolveAt("MTH", { billingAlignment: "rolling" }, mockDate(2026, 11, 31));
		expect(result.nextBillingDate).toBe("31 Jan 2027");
	});

	it("MTH: Apr 30 → May 30 (no overflow)", () => {
		const result = resolveAt("MTH", { billingAlignment: "rolling" }, mockDate(2026, 3, 30));
		expect(result.nextBillingDate).toBe("30 May 2026");
	});

	it("MTH: Feb 28 → Mar 28", () => {
		const result = resolveAt("MTH", { billingAlignment: "rolling" }, mockDate(2026, 1, 28));
		expect(result.nextBillingDate).toBe("28 Mar 2026");
	});

	it("BIMTH: Jan 31 → Mar 31 (no overflow)", () => {
		const result = resolveAt("BIMTH", { billingAlignment: "rolling" }, mockDate(2026, 0, 31));
		expect(result.nextBillingDate).toBe("31 Mar 2026");
	});

	it("BIMTH: Mar 31 → May 31 (no overflow)", () => {
		const result = resolveAt("BIMTH", { billingAlignment: "rolling" }, mockDate(2026, 2, 31));
		expect(result.nextBillingDate).toBe("31 May 2026");
	});

	it("BIMTH: May 31 → Jul 31 (no overflow)", () => {
		const result = resolveAt("BIMTH", { billingAlignment: "rolling" }, mockDate(2026, 4, 31));
		expect(result.nextBillingDate).toBe("31 Jul 2026");
	});
});

describe("resolveSubscriptionSchedule — rolling YR leap year edge cases", () => {
	it("Feb 29 leap year → Feb 28 non-leap year", () => {
		const result = resolveAt("YR", { billingAlignment: "rolling" }, mockDate(2024, 1, 29));
		expect(result.nextBillingDate).toBe("28 Feb 2025");
	});

	it("Feb 28 non-leap → Feb 28 next year", () => {
		const result = resolveAt("YR", { billingAlignment: "rolling" }, mockDate(2026, 1, 28));
		expect(result.nextBillingDate).toBe("28 Feb 2027");
	});

	it("Mar 31 YR → Mar 31 next year (no overflow)", () => {
		const result = resolveAt("YR", { billingAlignment: "rolling" }, mockDate(2026, 2, 31));
		expect(result.nextBillingDate).toBe("31 Mar 2027");
	});
});

describe("resolveSubscriptionSchedule — metadata fields", () => {
	it("returns correct interval descriptors for MTH", () => {
		const result = resolveAt("MTH", { billingAlignment: "anchored" }, mockDate(2026, 5, 15));

		expect(result.interval).toBe("Monthly");
		expect(result.perInterval).toBe("Month");
		expect(result.billingInterval).toBe("Month");
	});

	it("returns correct interval descriptors for YR", () => {
		const result = resolveAt("YR", { billingAlignment: "anchored" }, mockDate(2026, 5, 15));

		expect(result.interval).toBe("Yearly");
		expect(result.perInterval).toBe("Year");
		expect(result.billingInterval).toBe("Year");
	});

	it("returns correct interval descriptors for BIWK", () => {
		const result = resolveAt("BIWK", { billingAlignment: "anchored" }, mockDate(2026, 5, 15));

		expect(result.interval).toBe("Fortnightly");
		expect(result.perInterval).toBe("2x per Month");
		expect(result.billingInterval).toBe("Month");
	});

	it("returns correct interval descriptors for BIMTH", () => {
		const result = resolveAt("BIMTH", { billingAlignment: "anchored" }, mockDate(2026, 5, 15));

		expect(result.interval).toBe("Bi-Monthly");
		expect(result.perInterval).toBe("2 Months");
		expect(result.billingInterval).toBe("2 Months");
	});
});

describe("resolveSubscriptionSchedule — defaults", () => {
	it("defaults to MTH interval and rolling alignment", () => {
		const result = resolveAt("MTH", {}, mockDate(2026, 5, 15));

		expect(result.nextBillingDate).toBe("15 Jul 2026");
		expect(result.interval).toBe("Monthly");
	});
});
