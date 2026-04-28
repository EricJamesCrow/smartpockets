import fs from "node:fs";
import path from "node:path";
import { render } from "@react-email/render";
import { StatementClosing } from "@repo/email/templates/statement-closing";
import React from "react";
import { describe, expect, it } from "vitest";
import { accountPreviewForModel, creditCardPreviewForModel } from "../agent/tools/read/moneyPreview";
import {
    dollarsToMilliunits,
    formatMoneyFromDollars,
    formatMoneyFromMilliunits,
    optionalMoneyMilliunits,
    plaidComponentMoneyToCreditCardDollars,
} from "../money";

type MoneyUnitSmokeFixture = {
    plaidAccount: {
        accountId: string;
        name: string;
        officialName: string;
        mask: string;
        type: "credit";
        subtype: "credit card";
        balances: {
            current: number;
            available: number;
            limit: number;
            isoCurrencyCode: "USD";
        };
    };
    plaidTransaction: {
        transactionId: string;
        accountId: string;
        amount: number;
        date: string;
        merchantName: string;
    };
    plaidCreditCardLiability: {
        accountId: string;
        lastPaymentAmount: number;
        lastStatementBalance: number;
        minimumPaymentAmount: number;
        nextPaymentDueDate: string;
        aprs: Array<{
            aprPercentage: number;
            aprType: string;
            balanceSubjectToApr: number;
            interestChargeAmount: number;
        }>;
    };
    statementEmailPayload: {
        firstName: string;
        cadence: 3 | 1;
        cadenceLabel: string;
        statements: Array<{
            cardId: string;
            cardName: string;
            closingDate: string;
            projectedBalanceCents: number;
            minimumDueCents: number;
            dueDate: string;
            cardDetailUrl: string;
        }>;
    };
};

const fixturePath = path.join(__dirname, "fixtures/money-unit-contract/demo-smoke.json");

function loadFixture(): MoneyUnitSmokeFixture {
    return JSON.parse(fs.readFileSync(fixturePath, "utf8")) as MoneyUnitSmokeFixture;
}

function buildNativeCreditCardFromPlaidFixture(fixture: MoneyUnitSmokeFixture) {
    const { plaidAccount, plaidCreditCardLiability } = fixture;

    return {
        accountId: plaidAccount.accountId,
        accountName: plaidAccount.name,
        officialName: plaidAccount.officialName,
        mask: plaidAccount.mask,
        accountType: plaidAccount.type,
        accountSubtype: plaidAccount.subtype,
        currentBalance: plaidComponentMoneyToCreditCardDollars(plaidAccount.balances.current),
        availableCredit: plaidComponentMoneyToCreditCardDollars(plaidAccount.balances.available),
        creditLimit: plaidComponentMoneyToCreditCardDollars(plaidAccount.balances.limit),
        isoCurrencyCode: plaidAccount.balances.isoCurrencyCode,
        aprs: plaidCreditCardLiability.aprs.map((apr) => ({
            ...apr,
            balanceSubjectToApr: optionalMoneyMilliunits(apr.balanceSubjectToApr),
            interestChargeAmount: optionalMoneyMilliunits(apr.interestChargeAmount),
        })),
        lastPaymentAmount: plaidComponentMoneyToCreditCardDollars(plaidCreditCardLiability.lastPaymentAmount),
        lastStatementBalance: plaidComponentMoneyToCreditCardDollars(plaidCreditCardLiability.lastStatementBalance),
        minimumPaymentAmount: plaidComponentMoneyToCreditCardDollars(plaidCreditCardLiability.minimumPaymentAmount),
        nextPaymentDueDate: plaidCreditCardLiability.nextPaymentDueDate,
        displayName: plaidAccount.officialName,
    };
}

describe("money unit contract", () => {
    it("treats Plaid component account, transaction, and liability money as milliunits", () => {
        const fixture = loadFixture();

        expect(dollarsToMilliunits(8005.64)).toBe(fixture.plaidAccount.balances.current);
        expect(formatMoneyFromMilliunits(fixture.plaidAccount.balances.current)).toBe("$8,005.64");
        expect(formatMoneyFromMilliunits(fixture.plaidTransaction.amount)).toBe("$7.25");
        expect(formatMoneyFromMilliunits(fixture.plaidCreditCardLiability.minimumPaymentAmount)).toBe("$35.00");
        expect(formatMoneyFromMilliunits(fixture.plaidCreditCardLiability.aprs[0]!.balanceSubjectToApr)).toBe("$8,005.64");
        expect(formatMoneyFromMilliunits(fixture.plaidCreditCardLiability.aprs[0]!.interestChargeAmount)).toBe("$95.12");
    });

    it("denormalizes native credit-card top-level balance and payment fields to display dollars", () => {
        const nativeCard = buildNativeCreditCardFromPlaidFixture(loadFixture());

        expect(nativeCard.currentBalance).toBe(8005.64);
        expect(nativeCard.availableCredit).toBe(1994.36);
        expect(nativeCard.creditLimit).toBe(10000);
        expect(nativeCard.lastPaymentAmount).toBe(200);
        expect(nativeCard.lastStatementBalance).toBe(8005.64);
        expect(nativeCard.minimumPaymentAmount).toBe(35);
    });

    it("keeps native credit-card nested APR money in milliunits until the audited migration", () => {
        const nativeCard = buildNativeCreditCardFromPlaidFixture(loadFixture());

        expect(nativeCard.aprs[0]).toMatchObject({
            aprPercentage: 27.49,
            aprType: "purchase_apr",
            balanceSubjectToApr: 8_005_640,
            interestChargeAmount: 95_120,
        });
    });

    it("formats account tool previews in dollars without leaking milliunits", () => {
        const preview = accountPreviewForModel(loadFixture().plaidAccount);

        expect(preview.moneyUnit).toBe("dollars");
        expect(preview.balances.current).toBe(8005.64);
        expect(preview.balances.available).toBe(1994.36);
        expect(preview.balances.limit).toBe(10000);
        expect(formatMoneyFromDollars(preview.balances.current)).toBe("$8,005.64");
        expect(formatMoneyFromDollars(preview.balances.current)).not.toBe("$8,005,640.00");
    });

    it("formats credit-card tool previews from mixed native dollar and nested APR milliunit fields", () => {
        const nativeCard = buildNativeCreditCardFromPlaidFixture(loadFixture());
        const preview = creditCardPreviewForModel({ doc: () => nativeCard });

        expect(preview.moneyUnit).toBe("dollars");
        expect(preview.currentBalance).toBe(8005.64);
        expect(preview.lastPaymentAmount).toBe(200);
        expect(preview.lastStatementBalance).toBe(8005.64);
        expect(preview.minimumPaymentAmount).toBe(35);
        expect(preview.aprs[0]).toMatchObject({
            aprPercentage: 27.49,
            balanceSubjectToApr: 8005.64,
            interestChargeAmount: 95.12,
        });
        expect(formatMoneyFromDollars(preview.aprs[0]!.balanceSubjectToApr)).toBe("$8,005.64");
    });

    it("renders statement reminder emails from cents-suffixed payload fields", async () => {
        const { statementEmailPayload } = loadFixture();
        const statement = statementEmailPayload.statements[0]!;

        expect(statement).toHaveProperty("projectedBalanceCents", 800_564);
        expect(statement).toHaveProperty("minimumDueCents", 3_500);
        expect(statement).not.toHaveProperty("projectedBalance");
        expect(statement).not.toHaveProperty("minimumDue");

        const html = await render(React.createElement(StatementClosing, statementEmailPayload));

        expect(html).toContain("$8,005.64");
        expect(html).toContain("$35.00");
        expect(html).not.toContain("$8,005,640.00");
        expect(html).not.toContain("$800,564.00");
    });
});
