import { v } from "convex/values";
import { api, components } from "../_generated/api";
import { query } from "../functions";
import { enrichTransactionWithMerchant, type MerchantEnrichmentResult } from "../transactions/helpers";

type TransactionOverlayLike = {
    plaidTransactionId: string;
    userDate?: string;
    userMerchantName?: string;
    userCategory?: string;
    userCategoryDetailed?: string;
    isHidden?: boolean;
};

type SourceInfo = {
    cardId: string;
    displayName: string;
    lastFour?: string;
    brand?: string;
    institutionName?: string;
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

        // Pull transactions + overlays in parallel. We also pull credit cards
        // (for sourceInfo) and item-health (for institutionName) so the chat
        // tool-result table can render the same merchant-logo / source-cell /
        // pending-badge layout the dedicated /transactions page shows.
        const [transactions, overlays, allCards] = await Promise.all([
            ctx.runQuery(components.plaid.public.getTransactionsByUser, {
                userId: viewer.externalId,
                limit: 2000,
            }),
            ctx.table("transactionOverlays", "by_user_and_transaction", (q) => q.eq("userId", viewer._id)),
            ctx.table("creditCards", "by_user_active", (q) => q.eq("userId", viewer._id).eq("isActive", true)).map((card) => card.doc()),
        ]);

        const healthRows = (await ctx.runQuery(components.plaid.public.getItemHealthByUser, {
            userId: viewer.externalId,
        })) as Array<{ plaidItemId: string; institutionName?: string }>;
        const institutionByItem = new Map(healthRows.map((row) => [row.plaidItemId, row.institutionName]));

        const overlayByTransactionId = new Map(
            (overlays as TransactionOverlayLike[]).map((overlay) => [normalizeTransactionId(overlay.plaidTransactionId), overlay]),
        );

        // accountId → sourceInfo (cardId, displayName, lastFour, brand, institutionName)
        const sourceByAccount = new Map<string, SourceInfo>();
        for (const card of allCards as Array<{
            _id: string;
            accountId: string;
            displayName: string;
            lastFour?: string;
            brand?: string;
            company?: string;
            plaidItemId?: string;
        }>) {
            sourceByAccount.set(card.accountId, {
                cardId: card._id,
                displayName: card.displayName,
                lastFour: card.lastFour,
                brand: card.brand,
                institutionName: card.plaidItemId ? institutionByItem.get(card.plaidItemId) ?? card.company : card.company,
            });
        }

        // Plaid transactions include the fields enrichTransactionWithMerchant needs
        // (transactionId, accountId, name, merchantId, enrichmentData, ...). We
        // accept the component's broader shape with `any` here; the function
        // returns a typed `merchantEnrichment` alongside the passed-through fields.
        type PlaidTxLike = {
            transactionId: string;
            accountId: string;
            name: string;
            merchantId?: string;
            merchantName?: string;
            categoryPrimary?: string;
            categoryDetailed?: string;
            // The Plaid component's transaction shape includes inline counterparty
            // enrichment under enrichmentData; we accept it loosely here and let
            // enrichTransactionWithMerchant pick the fields it cares about.
            enrichmentData?: Record<string, unknown>;
        };
        const filtered = (transactions as PlaidTxLike[]).filter((tx) =>
            wanted.has(normalizeTransactionId(tx.transactionId)),
        );

        // Enrich each transaction with merchant data (logoUrl + canonical merchant name).
        // Reuses the same cache + resolution logic the /transactions page uses
        // (`enrichTransactionWithMerchant` from `transactions/helpers.ts`).
        const merchantCache = new Map<string, MerchantEnrichmentResult>();
        const enriched = await Promise.all(filtered.map((tx) => enrichTransactionWithMerchant(ctx, tx, merchantCache)));

        return enriched.map((tx) => {
            const enrichedTx = tx as PlaidTxLike & { merchantEnrichment: MerchantEnrichmentResult };
            const overlaid = applyOverlay(enrichedTx, overlayByTransactionId.get(normalizeTransactionId(enrichedTx.transactionId)));
            return {
                ...overlaid,
                merchantEnrichment: enrichedTx.merchantEnrichment,
                sourceInfo: sourceByAccount.get(enrichedTx.accountId),
                logoUrl: enrichedTx.merchantEnrichment?.logoUrl ?? undefined,
            };
        });
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
