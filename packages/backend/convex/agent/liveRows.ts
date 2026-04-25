import { v } from "convex/values";
import { api, components } from "../_generated/api";
import { query } from "../functions";

type TransactionOverlayLike = {
    plaidTransactionId: string;
    userDate?: string;
    userMerchantName?: string;
    userCategory?: string;
    userCategoryDetailed?: string;
    isHidden?: boolean;
};

function normalizeTransactionId(id: string): string {
    const parts = id.split(":");
    return parts[parts.length - 1] ?? id;
}

function planEndDate(startDate: string, totalPayments: number): string {
    const date = new Date(`${startDate}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return startDate;
    date.setUTCMonth(date.getUTCMonth() + Math.max(0, totalPayments - 1));
    return date.toISOString().slice(0, 10);
}

function applyOverlay<T extends { transactionId: string }>(tx: T, overlay: TransactionOverlayLike | undefined) {
    if (!overlay) {
        return {
            ...tx,
            _id: tx.transactionId,
        };
    }
    return {
        ...tx,
        _id: tx.transactionId,
        date: overlay.userDate ?? (tx as any).date,
        merchantName: overlay.userMerchantName ?? (tx as any).merchantName,
        categoryPrimary: overlay.userCategory ?? (tx as any).categoryPrimary,
        categoryDetailed: overlay.userCategoryDetailed ?? (tx as any).categoryDetailed,
        isHidden: overlay.isHidden ?? false,
    };
}

export const getTransactions = query({
    args: { ids: v.array(v.string()) },
    returns: v.any(),
    handler: async (ctx, { ids }) => {
        const viewer = ctx.viewerX();
        const wanted = new Set(ids.map(normalizeTransactionId));
        if (wanted.size === 0) return [];

        const [transactions, overlays] = await Promise.all([
            ctx.runQuery(components.plaid.public.getTransactionsByUser, {
                userId: viewer.externalId,
                limit: 2000,
            }),
            ctx.table("transactionOverlays", "by_user_and_transaction", (q) => q.eq("userId", viewer._id)),
        ]);

        const overlayByTransactionId = new Map(
            (overlays as TransactionOverlayLike[]).map((overlay) => [normalizeTransactionId(overlay.plaidTransactionId), overlay]),
        );

        return (transactions as Array<{ transactionId: string }>)
            .filter((tx) => wanted.has(normalizeTransactionId(tx.transactionId)))
            .map((tx) => applyOverlay(tx, overlayByTransactionId.get(normalizeTransactionId(tx.transactionId))));
    },
});

export const getCreditCards = query({
    args: { ids: v.array(v.id("creditCards")) },
    returns: v.any(),
    handler: async (ctx, { ids }) => {
        const viewer = ctx.viewerX();
        const rows = [];
        for (const id of ids) {
            const row = await ctx.table("creditCards").get(id);
            if (row && row.userId === viewer._id) rows.push(row.doc());
        }
        return rows;
    },
});

export const getPlaidAccounts = query({
    args: { ids: v.array(v.string()) },
    returns: v.any(),
    handler: async (ctx, { ids }) => {
        const viewer = ctx.viewerX();
        const wanted = new Set(ids);
        if (wanted.size === 0) return [];

        const accounts = (await ctx.runQuery(api.plaidComponent.getAccountsByUserId, {
            userId: viewer.externalId,
        })) as Array<{
            _id: string;
            accountId: string;
            plaidItemId: string;
        }>;

        const healthRows = (await ctx.runQuery(components.plaid.public.getItemHealthByUser, { userId: viewer.externalId })) as Array<{
            plaidItemId: string;
            institutionName?: string;
        }>;
        const institutionByItem = new Map(healthRows.map((row) => [row.plaidItemId, row.institutionName]));

        return accounts
            .filter((account) => wanted.has(account.accountId) || wanted.has(account._id))
            .map((account) => ({
                ...account,
                _id: account.accountId,
                institutionName: institutionByItem.get(account.plaidItemId),
            }));
    },
});

export const getPromoRates = query({
    args: { ids: v.array(v.string()) },
    returns: v.any(),
    handler: async (ctx, { ids }) => {
        const viewer = ctx.viewerX();
        const rows = [];
        for (const rawId of ids) {
            const id = normalizeTransactionId(rawId);
            const row = await ctx.table("promoRates").get(id as any);
            if (!row || row.userId !== viewer._id) continue;
            rows.push({
                _id: row._id,
                creditCardId: row.creditCardId,
                kind: row.description,
                apr: row.aprPercentage,
                startDate: row.startDate,
                endDate: row.expirationDate,
                balance: row.remainingBalance,
                note: row.isManual ? "Manual promo" : undefined,
            });
        }
        return rows;
    },
});

export const getInstallmentPlans = query({
    args: { ids: v.array(v.string()) },
    returns: v.any(),
    handler: async (ctx, { ids }) => {
        const viewer = ctx.viewerX();
        const rows = [];
        for (const rawId of ids) {
            const id = normalizeTransactionId(rawId);
            const row = await ctx.table("installmentPlans").get(id as any);
            if (!row || row.userId !== viewer._id) continue;
            rows.push({
                _id: row._id,
                creditCardId: row.creditCardId,
                merchantName: row.description,
                totalAmount: row.originalPrincipal,
                monthlyPayment: row.monthlyPrincipal + row.monthlyFee,
                totalPayments: row.totalPayments,
                remainingPayments: row.remainingPayments,
                startDate: row.startDate,
                endDate: planEndDate(row.startDate, row.totalPayments),
            });
        }
        return rows;
    },
});

export const getReminders = query({
    args: { ids: v.array(v.string()) },
    returns: v.any(),
    handler: async (ctx, { ids }) => {
        const viewer = ctx.viewerX();
        const rows = [];
        for (const rawId of ids) {
            const id = normalizeTransactionId(rawId);
            const row = await ctx.table("reminders").get(id as any);
            if (row && row.userId === viewer._id) rows.push(row.doc());
        }
        return rows;
    },
});
