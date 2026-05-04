import { milliunitsToDollarsOrNull } from "../../../money";

/**
 * CROWDEV-368: sign convention notes for the model previews emitted by
 * this module.
 *
 * Per-row transaction `amount` (in `listTransactions` /
 * `getTransactionDetail` / `searchMerchants` rows) and `searchMerchants`
 * merchant aggregations (`totalAmount`) follow Plaid convention (positive
 * = outflow), so they each carry a parallel `displayAmount` /
 * `displayTotalAmount` field in human convention for user-facing text.
 *
 * The previews this module emits are different — they expose **balance**,
 * **principal**, **payment**, and **interest charge** fields where
 * positive is already the user-intuitive value and no sign flip is
 * needed:
 *
 * - **Account balances** (`balances.{current,available,limit}`): for
 *   deposit accounts (checking/savings), positive = money in account; for
 *   credit accounts, positive = amount owed. The user expects to read
 *   "balance: $1,234" as money they have or money they owe — sign flips
 *   would invert this.
 * - **Credit card fields** (`currentBalance`, `availableCredit`,
 *   `creditLimit`, `lastPaymentAmount`, `lastStatementBalance`,
 *   `minimumPaymentAmount`, `aprs[].balanceSubjectToApr`,
 *   `aprs[].interestChargeAmount`): all positive = amount owed / paid /
 *   charged. User-intuitive as-is.
 * - **Promo balances** (`originalBalance`, `remainingBalance`,
 *   `accruedDeferredInterest`, `monthlyMinimumPayment`): positive =
 *   amount owed / accrued. User-intuitive as-is.
 * - **Installment plan fields** (`originalPrincipal`, `remainingPrincipal`,
 *   `monthlyPrincipal`, `monthlyFee`): positive = amount owed / paid.
 *   User-intuitive as-is.
 *
 * If you add a new field here whose semantics are NOT "positive = amount
 * the user has/owes/paid", consider whether it needs a parallel
 * `display*` field in human convention. See
 * `packages/backend/convex/agent/system.ts` rule #10 for the model-side
 * convention rules.
 */
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
