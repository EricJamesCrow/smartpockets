import { v } from "convex/values";
import { components } from "../../../_generated/api";
import { agentMutation } from "../../functions";
import {
  createProposal,
  registerReversal,
  registerToolExecutor,
  type ExecutorResult,
} from "../../writeTool";

const TOOL_NAME = "propose_bulk_transaction_update";

const OVERLAY_FIELDS = [
  "userCategory",
  "userCategoryDetailed",
  "notes",
  "isHidden",
  "isReviewed",
  "userMerchantName",
  "userDate",
  "userTime",
] as const;
type OverlayField = (typeof OVERLAY_FIELDS)[number];
type OverlayPatch = Partial<Record<OverlayField, string | boolean | undefined>>;
type OverlayPriorFields = Partial<Record<OverlayField, string | boolean>>;

export interface BulkFilter {
  dateFrom?: string;
  dateTo?: string;
  merchantName?: string;
  categoryDetailed?: string[];
  accountIds?: string[];
  minAmount?: number;
  maxAmount?: number;
  pending?: boolean;
  isHidden?: boolean;
}

type ViewerLike = {
  _id: string;
  externalId: string;
};

type TransactionOverlayLike = {
  plaidTransactionId: string;
  userDate?: string;
  userMerchantName?: string;
  userCategoryDetailed?: string;
  isHidden?: boolean;
};

type RawTransactionLike = {
  transactionId: string;
  accountId: string;
  amount: number;
  date: string;
  name: string;
  merchantName?: string;
  pending: boolean;
  categoryDetailed?: string;
  enrichmentData?: {
    counterpartyName?: string;
  };
};

const bulkFilterValidator = v.object({
  dateFrom: v.optional(v.string()),
  dateTo: v.optional(v.string()),
  merchantName: v.optional(v.string()),
  categoryDetailed: v.optional(v.array(v.string())),
  accountIds: v.optional(v.array(v.string())),
  minAmount: v.optional(v.number()),
  maxAmount: v.optional(v.number()),
  pending: v.optional(v.boolean()),
  isHidden: v.optional(v.boolean()),
});

const overlayPatchValidator = v.object({
  userCategory: v.optional(v.string()),
  userCategoryDetailed: v.optional(v.string()),
  notes: v.optional(v.string()),
  isHidden: v.optional(v.boolean()),
  isReviewed: v.optional(v.boolean()),
  userMerchantName: v.optional(v.string()),
  userDate: v.optional(v.string()),
  userTime: v.optional(v.string()),
});

function hasText(value: string | undefined): boolean {
  return value != null && value.trim().length > 0;
}

function hasArray(value: unknown[] | undefined): boolean {
  return Array.isArray(value) && value.length > 0;
}

export function validateBulkFilter(filter: BulkFilter) {
  const hasSupportedFilter =
    hasText(filter.dateFrom) ||
    hasText(filter.dateTo) ||
    hasText(filter.merchantName) ||
    hasArray(filter.categoryDetailed) ||
    hasArray(filter.accountIds) ||
    filter.minAmount !== undefined ||
    filter.maxAmount !== undefined ||
    filter.pending !== undefined ||
    filter.isHidden !== undefined;
  if (!hasSupportedFilter) {
    throw new Error("invalid_args: bulk filter has no fields");
  }
}

export function pickOverlayPatch(input: unknown): OverlayPatch {
  if (input == null || typeof input !== "object") return {};
  const src = input as Record<string, unknown>;
  const out: OverlayPatch = {};
  for (const key of OVERLAY_FIELDS) {
    if (key in src && src[key] !== undefined) {
      out[key] = src[key] as string | boolean;
    }
  }
  return out;
}

function normalizeText(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function matchesRawTransactionFilter(
  tx: RawTransactionLike,
  overlay: TransactionOverlayLike | undefined,
  f: BulkFilter,
): boolean {
  if (f.accountIds?.length && !f.accountIds.includes(tx.accountId)) {
    return false;
  }

  const effectiveDate = overlay?.userDate ?? tx.date;
  if (f.dateFrom && effectiveDate < f.dateFrom) return false;
  if (f.dateTo && effectiveDate > f.dateTo) return false;

  if (
    f.merchantName &&
    ![
      overlay?.userMerchantName,
      tx.merchantName,
      tx.enrichmentData?.counterpartyName,
      tx.name,
    ].some((value) => normalizeText(value).includes(normalizeText(f.merchantName)))
  ) {
    return false;
  }

  const effectiveCategory = overlay?.userCategoryDetailed ?? tx.categoryDetailed;
  if (
    f.categoryDetailed &&
    f.categoryDetailed.length > 0 &&
    !f.categoryDetailed.includes(effectiveCategory ?? "")
  ) {
    return false;
  }

  if (f.minAmount !== undefined && tx.amount < f.minAmount) return false;
  if (f.maxAmount !== undefined && tx.amount > f.maxAmount) return false;

  if (f.pending !== undefined && tx.pending !== f.pending) {
    return false;
  }

  const isHidden = overlay?.isHidden ?? false;
  if (f.isHidden !== undefined && isHidden !== f.isHidden) {
    return false;
  }

  return true;
}

function matchesOverlayOnlyFilter(
  overlay: TransactionOverlayLike,
  f: BulkFilter,
): boolean {
  if (f.accountIds?.length || f.minAmount !== undefined || f.maxAmount !== undefined) {
    return false;
  }
  if (f.pending !== undefined) return false;
  if (f.dateFrom && (overlay.userDate ?? "") < f.dateFrom) return false;
  if (f.dateTo && (overlay.userDate ?? "") > f.dateTo) return false;
  if (
    f.merchantName &&
    !normalizeText(overlay.userMerchantName).includes(normalizeText(f.merchantName))
  ) {
    return false;
  }
  if (
    f.categoryDetailed?.length &&
    !f.categoryDetailed.includes(overlay.userCategoryDetailed ?? "")
  ) {
    return false;
  }
  const isHidden = overlay.isHidden ?? false;
  if (f.isHidden !== undefined && isHidden !== f.isHidden) return false;
  return true;
}

export async function resolveBulkTransactionIds(
  ctx: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  viewer: ViewerLike,
  filter: BulkFilter,
  limit: number,
): Promise<string[]> {
  const cards = await ctx.table("creditCards", "by_user_active", (q: any) =>
    q.eq("userId", viewer._id).eq("isActive", true),
  );
  const viewerAccountIds = new Set<string>(
    cards.map((card: { accountId: string }) => card.accountId),
  );
  const overlays = (await ctx
    .table("transactionOverlays", "by_user_and_transaction", (q: any) =>
      q.eq("userId", viewer._id),
    )) as TransactionOverlayLike[];
  const overlayByTransactionId = new Map(
    overlays.map((overlay) => [overlay.plaidTransactionId, overlay]),
  );

  const matched = new Set<string>();

  const restrictedAccountIds =
    filter.accountIds && filter.accountIds.length > 0
      ? new Set(filter.accountIds.filter((accountId) => viewerAccountIds.has(accountId)))
      : viewerAccountIds;

  if (viewerAccountIds.size > 0 && restrictedAccountIds.size > 0) {
    const rawTransactions = (await ctx.runQuery(
      components.plaid.public.getTransactionsByUser,
      {
        userId: viewer.externalId,
      },
    )) as RawTransactionLike[];

    for (const tx of rawTransactions) {
      if (!restrictedAccountIds.has(tx.accountId)) continue;
      const overlay = overlayByTransactionId.get(tx.transactionId);
      if (matchesRawTransactionFilter(tx, overlay, filter)) {
        matched.add(tx.transactionId);
        if (matched.size >= limit) break;
      }
    }
  }

  if (matched.size < limit) {
    for (const overlay of overlays) {
      if (matched.has(overlay.plaidTransactionId)) continue;
      if (!matchesOverlayOnlyFilter(overlay, filter)) continue;
      matched.add(overlay.plaidTransactionId);
      if (matched.size >= limit) break;
    }
  }

  return [...matched].sort();
}

export const proposeBulkTransactionUpdate = agentMutation({
  args: {
    threadId: v.id("agentThreads"),
    filter: bulkFilterValidator,
    overlay: overlayPatchValidator,
    limit: v.optional(v.number()),
  },
  returns: v.object({
    proposalId: v.id("agentProposals"),
    preview: v.string(),
    deduped: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const patch = pickOverlayPatch(args.overlay);
    if (Object.keys(patch).length === 0) {
      throw new Error("invalid_args: overlay has no patchable fields");
    }
    const filter = args.filter as BulkFilter;
    validateBulkFilter(filter);
    const limit = Math.min(Math.max(args.limit ?? 500, 1), 1000);

    const plaidTransactionIds = await resolveBulkTransactionIds(
      ctx,
      viewer,
      filter,
      limit,
    );
    if (plaidTransactionIds.length === 0) {
      throw new Error("no_matches: filter returned 0 transactions");
    }

    const summaryText = `Bulk update ${plaidTransactionIds.length} transactions (${Object.keys(patch).join(", ")})`;

    return await createProposal(ctx, {
      toolName: TOOL_NAME,
      argsJson: JSON.stringify({ plaidTransactionIds, patch }),
      summaryText,
      affectedCount: plaidTransactionIds.length,
      affectedIds: plaidTransactionIds,
      sampleJson: JSON.stringify({
        plaidTransactionIds: plaidTransactionIds.slice(0, 10),
        patch,
      }),
      scope: "bulk",
      threadId: args.threadId,
      awaitingExpiresAt: Date.now() + 5 * 60 * 1000,
    });
  },
});

registerToolExecutor(TOOL_NAME, async (ctx, proposal): Promise<ExecutorResult> => {
  const viewer = ctx.viewerX();
  const parsed = JSON.parse(proposal.argsJson) as {
    plaidTransactionIds: string[];
    patch: OverlayPatch;
  };

  const updates: Array<{
    plaidTransactionId: string;
    priorFields: OverlayPriorFields;
    priorUnset: OverlayField[];
    created: boolean;
  }> = [];

  for (const txId of parsed.plaidTransactionIds) {
    const existing = (
      await ctx.table("transactionOverlays", "by_user_and_transaction", (q: any) =>
        q.eq("userId", viewer._id).eq("plaidTransactionId", txId),
      )
    )[0];

    const priorFields: OverlayPriorFields = {};
    const priorUnset: OverlayField[] = [];
    for (const key of Object.keys(parsed.patch) as OverlayField[]) {
      if (existing && existing[key] !== undefined) {
        priorFields[key] = existing[key] as string | boolean;
      } else {
        priorUnset.push(key);
      }
    }

    if (existing) {
      if (existing.userId !== viewer._id) throw new Error("not_authorized");
      const row = await ctx.table("transactionOverlays").getX(existing._id);
      await row.patch(parsed.patch as any);
    } else {
      await ctx.table("transactionOverlays").insert({
        plaidTransactionId: txId,
        userId: viewer._id,
        ...(parsed.patch as any),
      });
    }
    updates.push({
      plaidTransactionId: txId,
      priorFields,
      priorUnset,
      created: existing == null,
    });
  }

  return {
    reversalPayload: { kind: "overlay_patch_bulk", updates },
    affectedIds: parsed.plaidTransactionIds,
    summary: `Updated ${parsed.plaidTransactionIds.length} transactions.`,
  };
});

registerReversal(TOOL_NAME, async (ctx, audit) => {
  const viewer = ctx.viewerX();
  const payload = JSON.parse(audit.reversalPayloadJson) as {
    updates: Array<{
      plaidTransactionId: string;
      priorFields: OverlayPriorFields;
      priorUnset?: OverlayField[];
      created?: boolean;
    }>;
  };

  for (const u of payload.updates) {
    const existing = (
      await ctx.table("transactionOverlays", "by_user_and_transaction", (q: any) =>
        q.eq("userId", viewer._id).eq("plaidTransactionId", u.plaidTransactionId),
      )
    )[0];
    if (!existing) continue;
    if (existing.userId !== viewer._id) throw new Error("not_authorized");
    const row = await ctx.table("transactionOverlays").getX(existing._id);
    if (u.created) {
      await row.delete();
      continue;
    }

    const restore: Record<string, unknown> = {};
    for (const key of Object.keys(u.priorFields) as OverlayField[]) {
      restore[key] = u.priorFields[key];
    }
    for (const key of u.priorUnset ?? []) {
      restore[key] = undefined;
    }
    await row.patch(restore as any);
  }

  return { summary: `Reverted ${payload.updates.length} transaction overlays.` };
});
