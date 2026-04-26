import { describe, it, expect } from "vitest";
import {
    frequencyToIntervalDays,
    intervalToFrequency,
    mapPlaidFrequency,
    medianInterval,
    normalizeMerchantName,
    roundToHalfDollar,
} from "../../intelligence/subscriptions/normalize";

describe("normalizeMerchantName - documented fixtures", () => {
    it('"NETFLIX.COM 12345 NETFLIX CA" -> "netflix.com netflix"', () => {
        expect(normalizeMerchantName("NETFLIX.COM 12345 NETFLIX CA")).toBe(
            "netflix.com netflix",
        );
    });

    it('"SP * GUMROAD INC" -> "gumroad inc"', () => {
        expect(normalizeMerchantName("SP * GUMROAD INC")).toBe("gumroad inc");
    });

    it('"AMAZON*M22A1QH3" -> "amazon"', () => {
        expect(normalizeMerchantName("AMAZON*M22A1QH3")).toBe("amazon");
    });

    it('"APL* APPLE.COM/BILL" -> "apple.com/bill"', () => {
        expect(normalizeMerchantName("APL* APPLE.COM/BILL")).toBe(
            "apple.com/bill",
        );
    });

    it('"DOORDASH*ABC123" -> "doordash"', () => {
        expect(normalizeMerchantName("DOORDASH*ABC123")).toBe("doordash");
    });

    it('"STARBUCKS STORE 04567 SEATTLE WA" -> "starbucks store seattle"', () => {
        expect(
            normalizeMerchantName("STARBUCKS STORE 04567 SEATTLE WA"),
        ).toBe("starbucks store seattle");
    });
});

describe("normalizeMerchantName - boundary cases", () => {
    it("empty string maps to empty string", () => {
        expect(normalizeMerchantName("")).toBe("");
    });

    it("already-normalized input is a no-op", () => {
        expect(normalizeMerchantName("netflix")).toBe("netflix");
    });

    it("is idempotent on repeated application", () => {
        const once = normalizeMerchantName("STARBUCKS STORE 04567 SEATTLE WA");
        expect(normalizeMerchantName(once)).toBe(once);
    });

    it("strips #location markers", () => {
        expect(normalizeMerchantName("CVS #12345 LOS ANGELES CA")).toBe(
            "cvs los angeles",
        );
    });

    it("handles case-insensitive processor prefixes with tight spacing", () => {
        expect(normalizeMerchantName("sq*coffee shop")).toBe("coffee shop");
        expect(normalizeMerchantName("TST*LocalEatery")).toBe("localeatery");
    });

    it("preserves short words (including 3-letter suffixes like 'INC')", () => {
        expect(normalizeMerchantName("ACME INC")).toBe("acme inc");
    });
});

describe("roundToHalfDollar", () => {
    it("rounds to nearest $0.50 bucket", () => {
        expect(roundToHalfDollar(9.99)).toBe(10);
        expect(roundToHalfDollar(10.25)).toBe(10.5);
        expect(roundToHalfDollar(10.24)).toBe(10);
        expect(roundToHalfDollar(0)).toBe(0);
    });
});

describe("intervalToFrequency", () => {
    it("maps 7 to weekly, 14 to biweekly, 30 to monthly, 90 to quarterly, 365 to annual", () => {
        expect(intervalToFrequency(7)).toBe("weekly");
        expect(intervalToFrequency(14)).toBe("biweekly");
        expect(intervalToFrequency(30)).toBe("monthly");
        expect(intervalToFrequency(90)).toBe("quarterly");
        expect(intervalToFrequency(365)).toBe("annual");
    });

    it("returns null outside tolerance bands", () => {
        expect(intervalToFrequency(3)).toBeNull();
        expect(intervalToFrequency(20)).toBeNull();
        expect(intervalToFrequency(60)).toBeNull();
    });

    it("accepts boundary days within tolerance", () => {
        expect(intervalToFrequency(5)).toBe("weekly");
        expect(intervalToFrequency(10)).toBe("weekly");
        expect(intervalToFrequency(11)).toBe("biweekly");
        expect(intervalToFrequency(18)).toBe("biweekly");
        expect(intervalToFrequency(27)).toBe("monthly");
        expect(intervalToFrequency(35)).toBe("monthly");
        expect(intervalToFrequency(80)).toBe("quarterly");
        expect(intervalToFrequency(100)).toBe("quarterly");
        expect(intervalToFrequency(330)).toBe("annual");
        expect(intervalToFrequency(400)).toBe("annual");
    });
});

describe("medianInterval", () => {
    it("returns null for fewer than 2 dates", () => {
        expect(medianInterval([])).toBeNull();
        expect(medianInterval(["2026-01-01"])).toBeNull();
    });

    it("returns the median day-gap for 3+ dates", () => {
        expect(
            medianInterval(["2026-01-01", "2026-01-08", "2026-01-15"]),
        ).toBe(7);
    });

    it("sorts input before computing intervals", () => {
        expect(
            medianInterval(["2026-01-15", "2026-01-01", "2026-01-08"]),
        ).toBe(7);
    });

    it("averages the two middle values for even-length interval lists", () => {
        // Dates 0, 7, 17, 24 → intervals [7, 10, 7] → sorted [7,7,10] → median 7
        expect(
            medianInterval([
                "2026-01-01",
                "2026-01-08",
                "2026-01-18",
                "2026-01-25",
            ]),
        ).toBe(7);
    });
});

describe("frequencyToIntervalDays", () => {
    it("returns canonical day counts", () => {
        expect(frequencyToIntervalDays("weekly")).toBe(7);
        expect(frequencyToIntervalDays("biweekly")).toBe(14);
        expect(frequencyToIntervalDays("monthly")).toBe(30);
        expect(frequencyToIntervalDays("quarterly")).toBe(91);
        expect(frequencyToIntervalDays("annual")).toBe(365);
    });
});

describe("mapPlaidFrequency", () => {
    it("maps known Plaid frequency strings", () => {
        expect(mapPlaidFrequency("WEEKLY")).toBe("weekly");
        expect(mapPlaidFrequency("BIWEEKLY")).toBe("biweekly");
        expect(mapPlaidFrequency("SEMI_MONTHLY")).toBe("monthly");
        expect(mapPlaidFrequency("MONTHLY")).toBe("monthly");
        expect(mapPlaidFrequency("ANNUALLY")).toBe("annual");
    });

    it("returns null for unknown strings", () => {
        expect(mapPlaidFrequency("UNKNOWN")).toBeNull();
        expect(mapPlaidFrequency("")).toBeNull();
    });
});
