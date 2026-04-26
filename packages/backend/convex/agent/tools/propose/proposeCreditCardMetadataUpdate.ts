import { v } from "convex/values";
import { agentMutation } from "../../functions";
import {
  createProposal,
  registerReversal,
  registerToolExecutor,
  type ExecutorResult,
} from "../../writeTool";

const TOOL_NAME = "propose_credit_card_metadata_update";

// isPrimary is deferred per spec §2.2, §4.3 and is intentionally absent.
interface CardMetadataPatch {
  displayName?: string;
  company?: string;
  userOverrides?: Record<string, unknown>;
}

function pickPatch(input: unknown): CardMetadataPatch {
  if (input == null || typeof input !== "object") return {};
  const src = input as Record<string, unknown>;
  const out: CardMetadataPatch = {};
  if (typeof src.displayName === "string") out.displayName = src.displayName;
  if (typeof src.company === "string") out.company = src.company;
  if (src.userOverrides && typeof src.userOverrides === "object") {
    out.userOverrides = src.userOverrides as Record<string, unknown>;
  }
  return out;
}

export const proposeCreditCardMetadataUpdate = agentMutation({
  args: {
    threadId: v.id("agentThreads"),
    cardId: v.id("creditCards"),
    update: v.any(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const patch = pickPatch(args.update);
    if (Object.keys(patch).length === 0) {
      throw new Error("invalid_args: update has no patchable fields");
    }

    const card = await ctx.table("creditCards").getX(args.cardId);
    if (card.userId !== viewer._id) throw new Error("not_authorized");

    const summaryText = `Update card ${card.displayName} (${Object.keys(patch).join(", ")})`;

    return await createProposal(ctx, {
      toolName: TOOL_NAME,
      argsJson: JSON.stringify({ cardId: args.cardId, patch }),
      summaryText,
      affectedCount: 1,
      affectedIds: [String(args.cardId)],
      sampleJson: JSON.stringify({ cardId: args.cardId, patch }),
      scope: "single",
      threadId: args.threadId,
      awaitingExpiresAt: Date.now() + 5 * 60 * 1000,
    });
  },
});

registerToolExecutor(TOOL_NAME, async (ctx, proposal): Promise<ExecutorResult> => {
  const viewer = ctx.viewerX();
  const parsed = JSON.parse(proposal.argsJson) as {
    cardId: string;
    patch: CardMetadataPatch;
  };

  const card = await ctx.table("creditCards").getX(parsed.cardId);
  if (card.userId !== viewer._id) throw new Error("not_authorized");

  // Whole-object snapshot for userOverrides per spec §6.2 row 3: avoid
  // per-APR indexed patches (deferred). priorDisplayName captures the
  // scalar before the patch.
  const priorDisplayName =
    parsed.patch.displayName !== undefined ? card.displayName : undefined;
  const priorCompany =
    parsed.patch.company !== undefined ? card.company : undefined;
  const priorUserOverrides =
    parsed.patch.userOverrides !== undefined ? card.userOverrides : undefined;
  const companyTouched = parsed.patch.company !== undefined;
  const userOverridesTouched = parsed.patch.userOverrides !== undefined;

  await card.patch(parsed.patch as any);

  return {
    reversalPayload: {
      kind: "card_patch",
      cardId: parsed.cardId,
      priorDisplayName,
      priorCompany,
      companyTouched,
      companyWasPresent: companyTouched ? card.company !== undefined : undefined,
      priorUserOverrides,
      userOverridesTouched,
      userOverridesWasPresent: userOverridesTouched
        ? card.userOverrides !== undefined
        : undefined,
    },
    affectedIds: [parsed.cardId],
    summary: `Updated card ${card.displayName}.`,
  };
});

registerReversal(TOOL_NAME, async (ctx, audit) => {
  const viewer = ctx.viewerX();
  const payload = JSON.parse(audit.reversalPayloadJson) as {
    cardId: string;
    priorDisplayName?: string;
    priorCompany?: string;
    companyTouched?: boolean;
    companyWasPresent?: boolean;
    priorUserOverrides?: Record<string, unknown>;
    userOverridesTouched?: boolean;
    userOverridesWasPresent?: boolean;
  };

  const card = await ctx.table("creditCards").getX(payload.cardId);
  if (card.userId !== viewer._id) throw new Error("not_authorized");

  const restore: Record<string, unknown> = {};
  if (payload.priorDisplayName !== undefined) {
    restore.displayName = payload.priorDisplayName;
  }
  if (payload.companyTouched) {
    restore.company = payload.companyWasPresent ? payload.priorCompany : undefined;
  } else if (payload.priorCompany !== undefined) {
    restore.company = payload.priorCompany;
  }
  if (payload.userOverridesTouched) {
    restore.userOverrides = payload.userOverridesWasPresent
      ? payload.priorUserOverrides
      : undefined;
  } else if (payload.priorUserOverrides !== undefined) {
    restore.userOverrides = payload.priorUserOverrides;
  }
  await card.patch(restore as any);

  return { summary: `Reverted card metadata.` };
});
