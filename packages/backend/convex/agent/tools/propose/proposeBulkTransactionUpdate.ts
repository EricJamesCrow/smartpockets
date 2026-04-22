import { v } from "convex/values";
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

interface BulkFilter {
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

function hasText(value: string | undefined): boolean {
  return value != null && value.trim().length > 0;
}

function hasArray(value: unknown[] | undefined): boolean {
  return Array.isArray(value) && value.length > 0;
}

export function validateBulkFilter(filter: BulkFilter) {
  if (hasArray(filter.accountIds)) {
    throw new Error("unsupported_filter: accountIds requires raw transaction resolver");
  }
  if (filter.minAmount !== undefined || filter.maxAmount !== undefined) {
    throw new Error("unsupported_filter: amount requires raw transaction resolver");
  }
  if (filter.pending !== undefined) {
    throw new Error("unsupported_filter: pending requires raw transaction resolver");
  }
  const hasSupportedFilter =
    hasText(filter.dateFrom) ||
    hasText(filter.dateTo) ||
    hasText(filter.merchantName) ||
    hasArray(filter.categoryDetailed) ||
    filter.isHidden !== undefined;
  if (!hasSupportedFilter) {
    throw new Error("invalid_args: bulk filter has no fields");
  }
}

function pickOverlayPatch(input: unknown): OverlayPatch {
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

function matchesFilter(
  overlay: {
    userDate?: string;
    userMerchantName?: string;
    userCategoryDetailed?: string;
    isHidden?: boolean;
  },
  f: BulkFilter,
): boolean {
  if (f.dateFrom && (overlay.userDate ?? "") < f.dateFrom) return false;
  if (f.dateTo && (overlay.userDate ?? "") > f.dateTo) return false;
  if (
    f.merchantName &&
    !(overlay.userMerchantName ?? "")
      .toLowerCase()
      .includes(f.merchantName.toLowerCase())
  ) {
    return false;
  }
  if (
    f.categoryDetailed &&
    f.categoryDetailed.length > 0 &&
    !f.categoryDetailed.includes(overlay.userCategoryDetailed ?? "")
  ) {
    return false;
  }
  if (f.isHidden !== undefined && overlay.isHidden !== f.isHidden) {
    return false;
  }
  return true;
}

export const proposeBulkTransactionUpdate = agentMutation({
  args: {
    threadId: v.id("agentThreads"),
    filter: v.any(),
    overlay: v.any(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const patch = pickOverlayPatch(args.overlay);
    if (Object.keys(patch).length === 0) {
      throw new Error("invalid_args: overlay has no patchable fields");
    }
    const filter = (args.filter ?? {}) as BulkFilter;
    validateBulkFilter(filter);
    const limit = Math.min(Math.max(args.limit ?? 500, 1), 5000);

    // Scope: viewer-owned transactionOverlays matching the filter subset.
    // Cross-table filter resolution against raw Plaid transactions is
    // deferred; this path covers the dominant bulk re-categorization
    // workflow where prior overlays (even minimal) are already present.
    const rows = (await ctx
      .table("transactionOverlays", "by_user_and_transaction", (q: any) =>
        q.eq("userId", viewer._id),
      ))
      .filter((r: any) => matchesFilter(r, filter))
      .slice(0, limit);

    const plaidTransactionIds = rows.map((r: any) => r.plaidTransactionId);
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
    priorFields: OverlayPatch;
  }> = [];

  for (const txId of parsed.plaidTransactionIds) {
    const existing = (
      await ctx.table("transactionOverlays", "by_user_and_transaction", (q: any) =>
        q.eq("userId", viewer._id).eq("plaidTransactionId", txId),
      )
    )[0];

    const priorFields: OverlayPatch = {};
    for (const key of Object.keys(parsed.patch) as OverlayField[]) {
      priorFields[key] = existing ? (existing[key] ?? undefined) : undefined;
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
    updates.push({ plaidTransactionId: txId, priorFields });
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
    updates: Array<{ plaidTransactionId: string; priorFields: OverlayPatch }>;
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
    const restore: Record<string, unknown> = {};
    for (const key of Object.keys(u.priorFields) as OverlayField[]) {
      restore[key] = u.priorFields[key];
    }
    await row.patch(restore as any);
  }

  return { summary: `Reverted ${payload.updates.length} transaction overlays.` };
});
