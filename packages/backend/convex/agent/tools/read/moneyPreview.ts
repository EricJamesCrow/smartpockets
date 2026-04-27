import { milliunitsToDollarsOrNull } from "../../../money";

function toPlain(row: any): any {
    return typeof row?.doc === "function" ? row.doc() : row;
}

export function accountPreviewForModel(account: any): any {
    const plain = toPlain(account);
    return {
        ...plain,
        balances: {
            ...plain.balances,
            current: milliunitsToDollarsOrNull(plain.balances?.current),
            available: milliunitsToDollarsOrNull(plain.balances?.available),
            limit: milliunitsToDollarsOrNull(plain.balances?.limit),
        },
        moneyUnit: "dollars",
    };
}

export function creditCardPreviewForModel(card: any): any {
    const plain = toPlain(card);
    return {
        ...plain,
        currentBalance: plain.currentBalance ?? null,
        availableCredit: plain.availableCredit ?? null,
        creditLimit: plain.creditLimit ?? null,
        lastPaymentAmount: plain.lastPaymentAmount ?? null,
        lastStatementBalance: plain.lastStatementBalance ?? null,
        minimumPaymentAmount: plain.minimumPaymentAmount ?? null,
        aprs: (plain.aprs ?? []).map((apr: any) => ({
            ...apr,
            balanceSubjectToApr: milliunitsToDollarsOrNull(apr.balanceSubjectToApr),
            interestChargeAmount: milliunitsToDollarsOrNull(apr.interestChargeAmount),
        })),
        moneyUnit: "dollars",
    };
}

export function promoPreviewForModel(promo: any): any {
    const plain = toPlain(promo);
    return {
        ...plain,
        originalBalance: plain.originalBalance ?? null,
        remainingBalance: plain.remainingBalance ?? null,
        accruedDeferredInterest: plain.accruedDeferredInterest ?? null,
        monthlyMinimumPayment: plain.monthlyMinimumPayment ?? null,
        moneyUnit: "dollars",
    };
}

export function installmentPreviewForModel(plan: any): any {
    const plain = toPlain(plan);
    return {
        ...plain,
        originalPrincipal: plain.originalPrincipal ?? null,
        remainingPrincipal: plain.remainingPrincipal ?? null,
        monthlyPrincipal: plain.monthlyPrincipal ?? null,
        monthlyFee: plain.monthlyFee ?? null,
        moneyUnit: "dollars",
    };
}
