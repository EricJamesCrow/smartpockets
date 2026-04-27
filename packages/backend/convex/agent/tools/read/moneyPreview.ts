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
        currentBalance: milliunitsToDollarsOrNull(plain.currentBalance),
        availableCredit: milliunitsToDollarsOrNull(plain.availableCredit),
        creditLimit: milliunitsToDollarsOrNull(plain.creditLimit),
        lastPaymentAmount: milliunitsToDollarsOrNull(plain.lastPaymentAmount),
        lastStatementBalance: milliunitsToDollarsOrNull(plain.lastStatementBalance),
        minimumPaymentAmount: milliunitsToDollarsOrNull(plain.minimumPaymentAmount),
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
        originalBalance: milliunitsToDollarsOrNull(plain.originalBalance),
        remainingBalance: milliunitsToDollarsOrNull(plain.remainingBalance),
        accruedDeferredInterest: milliunitsToDollarsOrNull(plain.accruedDeferredInterest),
        monthlyMinimumPayment: milliunitsToDollarsOrNull(plain.monthlyMinimumPayment),
        moneyUnit: "dollars",
    };
}

export function installmentPreviewForModel(plan: any): any {
    const plain = toPlain(plan);
    return {
        ...plain,
        originalPrincipal: milliunitsToDollarsOrNull(plain.originalPrincipal),
        remainingPrincipal: milliunitsToDollarsOrNull(plain.remainingPrincipal),
        monthlyPrincipal: milliunitsToDollarsOrNull(plain.monthlyPrincipal),
        monthlyFee: milliunitsToDollarsOrNull(plain.monthlyFee),
        moneyUnit: "dollars",
    };
}
