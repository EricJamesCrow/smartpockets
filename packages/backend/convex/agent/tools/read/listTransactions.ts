import { v } from "convex/values";
import { components } from "../../../_generated/api";
import { agentQuery } from "../../functions";

// Default cap when the model doesn't pass `limit`. The user's "show me the
// last ten" intent maps to `limit=10`; if the model omits limit entirely we
// still don't want to dump hundreds of rows into the chat card.
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 500;

// Cap on the per-row snapshot embedded for the agent. The frontend ignores
// `rows` and re-hydrates from `ids` via agent.liveRows.getTransactions, so
// this only governs how much the model sees. Keeping it ≤ 50 avoids token
// bloat while still letting the agent reason about realistic windows
// ("show me the last 10/25 transactions"). Above this cap, rows are
// truncated but `ids` and `preview.totalCount` remain accurate so the
// agent knows how many were elided.
const MAX_AGENT_ROWS = 50;

type TransactionOverlayLike = {
    plaidTransactionId: string;
    userDate?: string;
    userMerchantName?: string;
    userCategory?: string;
    userCategoryDetailed?: string;
    isHidden?: boolean;
};

type RawTransaction = {
    transactionId: string;
    accountId: string;
    amount: number; // milliunits
    date: string;
    name: string;
    merchantName?: string;
    categoryPrimary?: string;
    categoryDetailed?: string;
    pending: boolean;
};

type RawAccount = {
    accountId: string;
    mask?: string;
};

/**
 * Compact per-row snapshot the model sees. Mirrors the columns the user
 * sees in the rendered TransactionsTable (merchant, amount, date, category,
 * pending status, account mask) so that follow-up questions like "give me
 * full details for the eBay row" can be answered without another tool
 * round-trip. Amount is in dollars (signed: positive = outflow per Plaid
 * convention) so the model doesn't reason about milliunits.
 */
export type AgentTransactionRow = {
    transactionId: string;
    date: string;
    merchantName: string;
    amount: number;
    category?: string;
    pending: boolean;
    accountMask?: string;
};

function buildSummary(count: number, dateFrom: string | undefined, dateTo: string | undefined): string {
    const noun = count === 1 ? "transaction" : "transactions";
    if (dateFrom && dateTo) {
        return `${count} ${noun} from ${dateFrom} to ${dateTo}`;
    }
    if (dateFrom) {
        return `${count} ${noun} since ${dateFrom}`;
    }
    if (dateTo) {
        return `${count} ${noun} through ${dateTo}`;
    }
    return `${count} most-recent ${noun}`;
}

export function transactionToAgentRow(
    tx: RawTransaction,
    overlay: TransactionOverlayLike | undefined,
    accountMaskById: Map<string, string | undefined>,
): AgentTransactionRow {
    const effectiveDate = overlay?.userDate ?? tx.date;
    const effectiveMerchant = overlay?.userMerchantName ?? tx.merchantName ?? tx.name;
    const effectiveCategory = overlay?.userCategoryDetailed ?? overlay?.userCategory ?? tx.categoryDetailed ?? tx.categoryPrimary;
    return {
        transactionId: tx.transactionId,
        date: effectiveDate,
        merchantName: effectiveMerchant,
        amount: tx.amount / 1000,
        category: effectiveCategory ?? undefined,
        pending: tx.pending,
        accountMask: accountMaskById.get(tx.accountId) ?? undefined,
    };
}

export const listTransactions = agentQuery({
    args: {
        accountId: v.optional(v.string()),
        dateFrom: v.optional(v.string()),
        dateTo: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    returns: v.any(),
    handler: async (ctx, { accountId, dateFrom, dateTo, limit }) => {
        const viewer = ctx.viewerX();
        const effectiveLimit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit ?? DEFAULT_LIMIT)));

        // Auth boundary: enumerate the viewer's accounts so we can scope
        // anything returned by the Plaid component to accounts they own.
        const viewerAccounts = (await ctx.runQuery(components.plaid.public.getAccountsByUser, {
            userId: viewer.externalId,
        })) as RawAccount[];
        const viewerAccountIds = new Set(viewerAccounts.map((a) => a.accountId));
        const accountMaskById = new Map(viewerAccounts.map((a) => [a.accountId, a.mask]));

        if (viewerAccountIds.size === 0) {
            return {
                ids: [],
                rows: [],
                preview: {
                    totalCount: 0,
                    summary: "No accounts linked yet",
                    live: true,
                    capturedAt: new Date().toISOString(),
                },
                window: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
            };
        }

        if (accountId && !viewerAccountIds.has(accountId)) {
            return {
                ids: [],
                rows: [],
                preview: {
                    totalCount: 0,
                    summary: "Account not found for this user",
                    live: true,
                    capturedAt: new Date().toISOString(),
                },
                window: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
            };
        }

        const allowedAccountIds = accountId ? new Set([accountId]) : viewerAccountIds;

        // Pull transactions for the viewer. The Plaid component accepts
        // optional startDate/endDate (ISO YYYY-MM-DD); when omitted we get
        // the full window the component has retained for this user, which
        // is what the model wants when it asks for "last N transactions".
        const [rawTransactions, overlays] = await Promise.all([
            ctx.runQuery(components.plaid.public.getTransactionsByUser, {
                userId: viewer.externalId,
                startDate: dateFrom,
                endDate: dateTo,
            }) as Promise<RawTransaction[]>,
            ctx.table("transactionOverlays", "by_user_and_transaction", (q) => q.eq("userId", viewer._id)),
        ]);

        const overlayByTxId = new Map(
            (overlays as TransactionOverlayLike[]).map((overlay) => [overlay.plaidTransactionId, overlay]),
        );

        const filtered = rawTransactions.filter((tx) => allowedAccountIds.has(tx.accountId));

        // Hidden transactions are intentionally hidden by the user; don't
        // surface them in agent listings.
        const visible = filtered.filter((tx) => !overlayByTxId.get(tx.transactionId)?.isHidden);

        // Newest first using effective (overlay-respecting) date so user
        // edits to userDate are honored.
        const sorted = visible
            .map((tx) => {
                const overlay = overlayByTxId.get(tx.transactionId);
                return { tx, effectiveDate: overlay?.userDate ?? tx.date };
            })
            .sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : a.effectiveDate > b.effectiveDate ? -1 : 0))
            .map(({ tx }) => tx);

        const totalCount = sorted.length;
        const truncated = sorted.slice(0, effectiveLimit);
        const ids = truncated.map((tx) => tx.transactionId);

        // Embed compact per-row snapshots so the model can answer follow-up
        // questions ("give me details for the eBay row") without another
        // tool call. Capped at MAX_AGENT_ROWS for token discipline; `ids`
        // and `preview.totalCount` still reflect the full window so the
        // agent knows what was elided.
        const rows: AgentTransactionRow[] = truncated
            .slice(0, MAX_AGENT_ROWS)
            .map((tx) => transactionToAgentRow(tx, overlayByTxId.get(tx.transactionId), accountMaskById));

        return {
            ids,
            rows,
            preview: {
                totalCount,
                summary: buildSummary(totalCount, dateFrom, dateTo),
                live: true,
                capturedAt: new Date().toISOString(),
            },
            window: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
        };
    },
});
