/**
 * SmartPockets canonical money unit.
 *
 * Internal financial amounts from Plaid and native credit-card tables are stored
 * as integer milliunits: dollars * 1000. Convert only at IO boundaries such as
 * Plaid ingestion, user input, display formatting, and model/tool summaries.
 */
export const MONEY_MILLIUNITS_PER_DOLLAR = 1000;
export const MONEY_CENTS_PER_DOLLAR = 100;
export const MONEY_MILLIUNITS_PER_CENT = 10;

type FormatMoneyOptions = {
    currency?: string;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    nullDisplay?: string;
};

export function dollarsToMilliunits(dollars: number): number {
    return Math.round(dollars * MONEY_MILLIUNITS_PER_DOLLAR);
}

export function centsToMilliunits(cents: number): number {
    return Math.round(cents * MONEY_MILLIUNITS_PER_CENT);
}

export function milliunitsToDollars(milliunits: number): number {
    return milliunits / MONEY_MILLIUNITS_PER_DOLLAR;
}

export function centsToDollars(cents: number): number {
    return cents / MONEY_CENTS_PER_DOLLAR;
}

export function milliunitsToDollarsOrNull(milliunits: number | null | undefined): number | null {
    return milliunits == null ? null : milliunitsToDollars(milliunits);
}

export function milliunitsToDollarsOrUndefined(milliunits: number | null | undefined): number | undefined {
    return milliunits == null ? undefined : milliunitsToDollars(milliunits);
}

export function optionalMoneyMilliunits(milliunits: number | null | undefined): number | undefined {
    return milliunits ?? undefined;
}

function formatMoneyFromNumber(
    amount: number | null | undefined,
    { currency = "USD", locale = "en-US", minimumFractionDigits, maximumFractionDigits, nullDisplay = "--" }: FormatMoneyOptions = {},
): string {
    if (amount == null) return nullDisplay;

    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(amount);
}

export function formatMoneyFromDollars(dollars: number | null | undefined, options?: FormatMoneyOptions): string {
    return formatMoneyFromNumber(dollars, options);
}

export function formatMoneyFromCents(cents: number | null | undefined, options?: FormatMoneyOptions): string {
    return formatMoneyFromNumber(cents == null ? cents : centsToDollars(cents), options);
}

export function formatMoneyFromMilliunits(milliunits: number | null | undefined, options?: FormatMoneyOptions): string {
    return formatMoneyFromNumber(milliunits == null ? milliunits : milliunitsToDollars(milliunits), options);
}
