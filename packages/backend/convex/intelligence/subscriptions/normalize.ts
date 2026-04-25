// Pure merchant-name normalizer. Used to group Plaid transactions into
// subscription candidates when enrichment (counterpartyEntityId) is absent.
// Spec: specs/W6-intelligence.brainstorm.md §4.4.4.

const PROCESSOR_PREFIXES: RegExp[] = [
    /^tst\*/i,
    /^sq\s*\*/i,
    /^pp\*/i,
    /^sp\s*\*/i,
    /^apl\*/i,
    /^payp\*/i,
    /^stripe\*/i,
];

// Trailing transaction-id suffix like "*M22A1QH3" (4+ alnum chars after `*`).
const TRAILING_TXN_ID = /\*[a-z0-9]{4,}\b/gi;

// "#1234" style location markers.
const LOCATION_MARKER = /#\d{3,}\b/g;

// Standalone numeric tokens of 3+ digits (word-boundary anchored).
const STANDALONE_DIGITS = /\b\d{3,}\b/g;

// Trailing two-letter state code preceded by whitespace.
const TRAILING_STATE_CODE = /\s+[a-z]{2}\s*$/;

const MAX_PASSES = 3;

export function normalizeMerchantName(input: string): string {
    let s = input.toLowerCase().trim();
    let prev = "";
    let pass = 0;
    while (s !== prev && pass < MAX_PASSES) {
        prev = s;
        pass++;
        for (const re of PROCESSOR_PREFIXES) {
            s = s.replace(re, "");
        }
        s = s.replace(TRAILING_TXN_ID, "");
        s = s.replace(LOCATION_MARKER, "");
        s = s.replace(STANDALONE_DIGITS, "");
        s = s.replace(TRAILING_STATE_CODE, "");
        s = s.replace(/\s+/g, " ").trim();
    }
    return s;
}

// Derive a $0.50-granularity bucket from a dollar amount, used as the
// secondary grouping key for catchup subscription detection.
export function roundToHalfDollar(amountDollars: number): number {
    return Math.round(amountDollars * 2) / 2;
}

export type Frequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "annual";

// Map a median-interval in days to a frequency bucket with tolerance bands
// per specs/W6-intelligence.research.md §1.3.
export function intervalToFrequency(medianDays: number): Frequency | null {
    if (medianDays >= 5 && medianDays <= 10) return "weekly";
    if (medianDays >= 11 && medianDays <= 18) return "biweekly";
    if (medianDays >= 27 && medianDays <= 35) return "monthly";
    if (medianDays >= 80 && medianDays <= 100) return "quarterly";
    if (medianDays >= 330 && medianDays <= 400) return "annual";
    return null;
}

export function medianInterval(datesYmd: string[]): number | null {
    if (datesYmd.length < 2) return null;
    const sorted = [...datesYmd].sort();
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
        const a = new Date(`${sorted[i - 1]}T00:00:00Z`).getTime();
        const b = new Date(`${sorted[i]}T00:00:00Z`).getTime();
        intervals.push(Math.round((b - a) / (1000 * 60 * 60 * 24)));
    }
    intervals.sort((a, b) => a - b);
    const mid = Math.floor(intervals.length / 2);
    if (intervals.length % 2 === 0) {
        return (intervals[mid - 1]! + intervals[mid]!) / 2;
    }
    return intervals[mid]!;
}

export function addDays(ymd: string, days: number): string {
    const d = new Date(`${ymd}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

export function frequencyToIntervalDays(f: Frequency): number {
    switch (f) {
        case "weekly":
            return 7;
        case "biweekly":
            return 14;
        case "monthly":
            return 30;
        case "quarterly":
            return 91;
        case "annual":
            return 365;
    }
}

// Map Plaid's string frequencies to our canonical vocabulary.
export function mapPlaidFrequency(plaid: string): Frequency | null {
    switch (plaid) {
        case "WEEKLY":
            return "weekly";
        case "BIWEEKLY":
            return "biweekly";
        case "SEMI_MONTHLY":
        case "MONTHLY":
            return "monthly";
        case "ANNUALLY":
            return "annual";
        default:
            return null;
    }
}
