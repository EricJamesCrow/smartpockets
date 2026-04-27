import { describe, expect, it } from "vitest";
import {
    centsToMilliunits,
    dollarsToMilliunits,
    formatMoneyFromCents,
    formatMoneyFromDollars,
    formatMoneyFromMilliunits,
    milliunitsToDollarsOrUndefined,
    plaidComponentMoneyToCreditCardDollars,
} from "../money";

describe("money unit conversion and formatting", () => {
    it("formats Plaid dollar amounts after converting to internal milliunits", () => {
        const stored = dollarsToMilliunits(8005.64);

        expect(stored).toBe(8_005_640);
        expect(formatMoneyFromMilliunits(stored)).toBe("$8,005.64");
    });

    it("formats display-ready dollar amounts", () => {
        expect(formatMoneyFromDollars(8005.64)).toBe("$8,005.64");
        expect(formatMoneyFromDollars(8000)).toBe("$8,000.00");
    });

    it("converts Plaid component milliunits to native credit-card display dollars at sync boundaries", () => {
        expect(milliunitsToDollarsOrUndefined(8_005_640)).toBe(8005.64);
        expect(plaidComponentMoneyToCreditCardDollars(8_005_640)).toBe(8005.64);
    });

    it("formats cent amounts when an external API returns cents", () => {
        expect(centsToMilliunits(800_564)).toBe(8_005_640);
        expect(formatMoneyFromCents(800_564)).toBe("$8,005.64");
    });

    it("formats internal milliunit amounts", () => {
        expect(formatMoneyFromMilliunits(8_005_640)).toBe("$8,005.64");
    });

    it("formats negative transactions and payments with the correct sign", () => {
        expect(formatMoneyFromDollars(-7.25)).toBe("-$7.25");
        expect(formatMoneyFromMilliunits(-7_250)).toBe("-$7.25");
        expect(formatMoneyFromMilliunits(-8_005_640)).toBe("-$8,005.64");
    });
});
