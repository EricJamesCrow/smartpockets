import { v } from "convex/values";
import { agentMutation } from "../../functions";
import {
  createProposal,
  registerReversal,
  registerToolExecutor,
  type ExecutorResult,
} from "../../writeTool";

const TOOL_NAME = "propose_transaction_update";

// Fields the agent may overlay-patch on a transaction (spec §5.1 row 1).
// Kept as a flat record so the executor can iterate deterministically.
const OVERLAY_FIELDS = [
  "userCategory",
  "userCategoryDetailed",
  "notes",
  "isHidden",
  "userMerchantName",
  "userDate",
  "userTime",
  "isReviewed",
] as const;
type OverlayField = (typeof OVERLAY_FIELDS)[number];

type OverlayPatch = Partial<Record<OverlayField, string | boolean | undefined>>;
type OverlayPriorFields = Partial<Record<OverlayField, string | boolean>>;

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

export const proposeTransactionUpdate = agentMutation({
  args: {
    threadId: v.id("agentThreads"),
    plaidTransactionId: v.string(),
    overlay: v.any(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const patch = pickOverlayPatch(args.overlay);
    if (Object.keys(patch).length === 0) {
      throw new Error("invalid_args: overlay has no patchable fields");
    }

    // Ownership: if a transactionOverlay already exists for this
    // plaidTransactionId, it must belong to the viewer. New overlays are
    // scoped to viewer._id at execute time. Cross-table ownership against
    // a plaidTransactions table is deferred (the Plaid component owns it).
    const existingByTx = await ctx.table(
      "transactionOverlays",
      "by_user_and_transaction",
      (q: any) =>
        q
          .eq("userId", viewer._id)
          .eq("plaidTransactionId", args.plaidTransactionId),
    );
    const existing = existingByTx[0] ?? null;

    const summaryParts = Object.keys(patch).map((k) => k);
    const summaryText =
      existing == null
        ? `Create transaction overlay (${summaryParts.join(", ")})`
        : `Update transaction overlay (${summaryParts.join(", ")})`;

    const result = await createProposal(ctx, {
      toolName: TOOL_NAME,
      argsJson: JSON.stringify({
        plaidTransactionId: args.plaidTransactionId,
        patch,
      }),
      summaryText,
      affectedCount: 1,
      affectedIds: [args.plaidTransactionId],
      sampleJson: JSON.stringify({
        plaidTransactionId: args.plaidTransactionId,
        patch,
      }),
      scope: "single",
      threadId: args.threadId,
      awaitingExpiresAt: Date.now() + 5 * 60 * 1000,
    });

    return result;
  },
});

// ---- Executor -------------------------------------------------------------

registerToolExecutor(TOOL_NAME, async (ctx, proposal): Promise<ExecutorResult> => {
  const viewer = ctx.viewerX();
  const parsed = JSON.parse(proposal.argsJson) as {
    plaidTransactionId: string;
    patch: OverlayPatch;
  };

  const existing = (
    await ctx.table("transactionOverlays", "by_user_and_transaction", (q: any) =>
      q
        .eq("userId", viewer._id)
        .eq("plaidTransactionId", parsed.plaidTransactionId),
    )
  )[0];

  // Capture prior values of whichever fields the patch touches.
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
    const row = await ctx.table("transactionOverlays").getX(existing._id);
    if (row.userId !== viewer._id) throw new Error("not_authorized");
    await row.patch(parsed.patch as any);
  } else {
    await ctx.table("transactionOverlays").insert({
      plaidTransactionId: parsed.plaidTransactionId,
      userId: viewer._id,
      ...(parsed.patch as any),
    });
  }

  return {
    reversalPayload: {
      kind: "overlay_patch",
      plaidTransactionId: parsed.plaidTransactionId,
      priorFields,
      priorUnset,
      created: existing == null,
    },
    affectedIds: [parsed.plaidTransactionId],
    summary: `Updated 1 transaction.`,
  };
});

// ---- Reversal -------------------------------------------------------------

registerReversal(TOOL_NAME, async (ctx, audit) => {
  const viewer = ctx.viewerX();
  const payload = JSON.parse(audit.reversalPayloadJson) as {
    plaidTransactionId: string;
    priorFields: OverlayPriorFields;
    priorUnset?: OverlayField[];
    created: boolean;
  };

  const existing = (
    await ctx.table("transactionOverlays", "by_user_and_transaction", (q: any) =>
      q
        .eq("userId", viewer._id)
        .eq("plaidTransactionId", payload.plaidTransactionId),
    )
  )[0];
  if (!existing) return { summary: "Overlay already gone." };
  if (existing.userId !== viewer._id) throw new Error("not_authorized");

  const row = await ctx.table("transactionOverlays").getX(existing._id);
  if (payload.created) {
    await row.delete();
    return { summary: "Reverted transaction overlay." };
  }

  const restore: Record<string, unknown> = {};
  for (const key of Object.keys(payload.priorFields) as OverlayField[]) {
    restore[key] = payload.priorFields[key];
  }
  for (const key of payload.priorUnset ?? []) {
    restore[key] = undefined;
  }
  await row.patch(restore as any);

  return { summary: "Reverted transaction overlay." };
});
