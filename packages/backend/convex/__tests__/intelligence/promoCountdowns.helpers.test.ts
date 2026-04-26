import { describe, it, expect } from "vitest";
import {
    computeEffectiveDate,
    daysBetween,
    todayUtcYmd,
} from "../../intelligence/promoCountdowns/helpers";

describe("promoCountdowns helpers", () => {
    describe("daysBetween", () => {
        it("returns 0 for the same day", () => {
            expect(daysBetween("2026-04-21", "2026-04-21")).toBe(0);
        });

        it("returns positive for forward dates", () => {
            expect(daysBetween("2026-04-21", "2026-04-28")).toBe(7);
        });

        it("returns negative for past dates", () => {
            expect(daysBetween("2026-04-21", "2026-04-14")).toBe(-7);
        });

        it("handles month and year rollovers", () => {
            expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
            expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2); // leap year
            expect(daysBetween("2025-02-28", "2025-03-01")).toBe(1); // non-leap
        });
    });

    describe("todayUtcYmd", () => {
        it("formats an epoch to YYYY-MM-DD", () => {
            // 2026-04-21T12:34:56Z
            const t = Date.UTC(2026, 3, 21, 12, 34, 56);
            expect(todayUtcYmd(t)).toBe("2026-04-21");
        });

        it("is stable across time-of-day for the same UTC day", () => {
            const midnight = Date.UTC(2026, 3, 21, 0, 0, 0);
            const late = Date.UTC(2026, 3, 21, 23, 59, 59);
            expect(todayUtcYmd(midnight)).toBe(todayUtcYmd(late));
        });
    });

    describe("computeEffectiveDate", () => {
        it("returns plaid source for Plaid-synced promo with no override", () => {
            const result = computeEffectiveDate({
                expirationDate: "2026-08-01",
            });
            expect(result).toEqual({
                effectiveDate: "2026-08-01",
                sourceField: "plaid",
                originalExpirationDate: "2026-08-01",
            });
        });

        it("returns manual source for manually-entered promo", () => {
            const result = computeEffectiveDate({
                expirationDate: "2026-08-01",
                isManual: true,
            });
            expect(result.sourceField).toBe("manual");
            expect(result.effectiveDate).toBe("2026-08-01");
        });

        it("returns override source when userOverrides.expirationDate is set", () => {
            const result = computeEffectiveDate({
                expirationDate: "2026-08-01",
                userOverrides: { expirationDate: "2026-09-15" },
            });
            expect(result).toEqual({
                effectiveDate: "2026-09-15",
                sourceField: "override",
                originalExpirationDate: "2026-08-01",
            });
        });

        it("prefers override even when isManual is also set", () => {
            const result = computeEffectiveDate({
                expirationDate: "2026-08-01",
                isManual: true,
                userOverrides: { expirationDate: "2026-09-15" },
            });
            expect(result.sourceField).toBe("override");
            expect(result.effectiveDate).toBe("2026-09-15");
        });
    });
});
