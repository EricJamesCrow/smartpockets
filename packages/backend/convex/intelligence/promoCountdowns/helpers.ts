// Pure date math helpers. No Convex context; safe to import anywhere.

export function daysBetween(fromYmd: string, toYmd: string): number {
    const from = new Date(`${fromYmd}T00:00:00Z`);
    const to = new Date(`${toYmd}T00:00:00Z`);
    return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function todayUtcYmd(now: number = Date.now()): string {
    return new Date(now).toISOString().slice(0, 10);
}

export type EffectiveDateResult = {
    effectiveDate: string;
    sourceField: "override" | "plaid" | "manual";
    originalExpirationDate: string;
};

export function computeEffectiveDate(promo: {
    expirationDate: string;
    userOverrides?: { expirationDate?: string };
    isManual?: boolean;
}): EffectiveDateResult {
    const original = promo.expirationDate;
    const override = promo.userOverrides?.expirationDate;
    if (override) {
        return {
            effectiveDate: override,
            sourceField: "override",
            originalExpirationDate: original,
        };
    }
    if (promo.isManual) {
        return {
            effectiveDate: original,
            sourceField: "manual",
            originalExpirationDate: original,
        };
    }
    return {
        effectiveDate: original,
        sourceField: "plaid",
        originalExpirationDate: original,
    };
}
