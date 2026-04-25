import { describe, it, expect } from "vitest";
import { nextOccurrenceOfDayInMonth } from "../../intelligence/statementReminders/helpers";

describe("nextOccurrenceOfDayInMonth", () => {
    it("returns today when the closing day matches today", () => {
        expect(nextOccurrenceOfDayInMonth(15, "2026-04-15")).toBe("2026-04-15");
    });

    it("returns a later day in the same month when still ahead", () => {
        expect(nextOccurrenceOfDayInMonth(20, "2026-04-10")).toBe("2026-04-20");
    });

    it("rolls into the next month when the day has passed", () => {
        expect(nextOccurrenceOfDayInMonth(5, "2026-04-10")).toBe("2026-05-05");
    });

    it("snaps day 31 to 28 in a non-leap February", () => {
        expect(nextOccurrenceOfDayInMonth(31, "2025-02-01")).toBe("2025-02-28");
    });

    it("snaps day 31 to 29 in a leap February", () => {
        expect(nextOccurrenceOfDayInMonth(31, "2024-02-01")).toBe("2024-02-29");
    });

    it("snaps day 30 to 28 in a non-leap February", () => {
        expect(nextOccurrenceOfDayInMonth(30, "2025-02-15")).toBe("2025-02-28");
    });

    it("rolls Feb 29 into March when already past end of Feb", () => {
        // 2025 is not a leap year; last day is Feb 28. From 2025-03-01 the
        // next occurrence should be 2025-03-31 (which snaps to 31 in March).
        expect(nextOccurrenceOfDayInMonth(31, "2025-03-01")).toBe("2025-03-31");
    });

    it("rolls from December into January across year boundary", () => {
        expect(nextOccurrenceOfDayInMonth(5, "2026-12-10")).toBe("2027-01-05");
    });

    it("snaps day 31 to 30 for April", () => {
        expect(nextOccurrenceOfDayInMonth(31, "2026-04-01")).toBe("2026-04-30");
    });

    it("handles day 1 when today is not day 1", () => {
        expect(nextOccurrenceOfDayInMonth(1, "2026-04-15")).toBe("2026-05-01");
    });

    it("handles last-day-of-month boundary: day 31 from Jan 31", () => {
        expect(nextOccurrenceOfDayInMonth(31, "2026-01-31")).toBe("2026-01-31");
    });

    it("rolls across year when December has passed the day", () => {
        expect(nextOccurrenceOfDayInMonth(15, "2026-12-20")).toBe("2027-01-15");
    });
});
