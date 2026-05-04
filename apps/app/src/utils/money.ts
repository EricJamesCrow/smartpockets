export {
    MONEY_CENTS_PER_DOLLAR,
    MONEY_MILLIUNITS_PER_CENT,
    MONEY_MILLIUNITS_PER_DOLLAR,
    centsToDollars,
    centsToMilliunits,
    dollarsToMilliunits,
    formatMoneyFromCents,
    formatMoneyFromDollars,
    formatMoneyFromMilliunits,
    milliunitsToDollars,
    milliunitsToDollarsOrNull,
    milliunitsToDollarsOrUndefined,
    optionalMoneyMilliunits,
    plaidComponentMoneyToCreditCardDollars,
} from "@convex/money";

/**
 * Flip Plaid sign convention to human banking-app convention for display.
 *
 * Plaid `transactions.amount` convention:
 *   positive → money OUT (debit / spend)
 *   negative → money IN (credit / refund / income)
 *
 * Human banking-app convention (Monarch, Copilot, every consumer app):
 *   positive → money IN
 *   negative → money OUT
 *
 * Use this at the display boundary ONLY. Stored amounts must remain in the
 * Plaid convention so other parts of the system (charts, aggregations,
 * sync) keep their existing semantics.
 *
 * Accepts and returns whatever unit the caller is using (milliunits, cents,
 * or dollars) — the function only flips the sign.
 *
 * @example
 * // eBay sale (received money): Plaid stores -550_470 milliunits
 * displayAmount(-550_470) === 550_470  // → "+$550.47" (money in, green)
 *
 * @example
 * // Apple Card payment (paid money): Plaid stores +117_870 milliunits
 * displayAmount(117_870) === -117_870  // → "-$117.87" (money out, default)
 */
export function displayAmount(plaidAmount: number): number {
    return -plaidAmount;
}
