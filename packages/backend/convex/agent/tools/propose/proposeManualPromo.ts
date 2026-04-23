import { v } from "convex/values";
import { agentMutation } from "../../functions";
import {
  createProposal,
  registerReversal,
  registerToolExecutor,
  type ExecutorResult,
} from "../../writeTool";

const TOOL_NAME = "propose_manual_promo";

interface PromoInput {
  description: string;
  aprPercentage: number;
  originalBalance: number;
  remainingBalance: number;
  startDate: string;
  expirationDate: string;
  isDeferredInterest: boolean;
  // When supplied, update the target row instead of inserting a new one.
  promoRateId?: string;
}

type PromoPriorFields = Pick<
  PromoInput,
  | "description"
  | "aprPercentage"
  | "originalBalance"
  | "remainingBalance"
  | "startDate"
  | "expirationDate"
  | "isDeferredInterest"
> & { isActive?: boolean };

function coercePromo(input: unknown): PromoInput {
  if (input == null || typeof input !== "object") {
    throw new Error("invalid_args: promo payload missing");
  }
  const src = input as Record<string, unknown>;
  return {
    description: String(src.description ?? ""),
    aprPercentage: Number(src.aprPercentage ?? 0),
    originalBalance: Number(src.originalBalance ?? 0),
    remainingBalance: Number(src.remainingBalance ?? 0),
    startDate: String(src.startDate ?? ""),
    expirationDate: String(src.expirationDate ?? ""),
    isDeferredInterest: Boolean(src.isDeferredInterest),
    promoRateId: typeof src.promoRateId === "string" ? src.promoRateId : undefined,
  };
}

export function buildPromoAffectedIds(cardId: string, promo: PromoInput): string[] {
  if (promo.promoRateId) return [promo.promoRateId];
  return [
    [
      "new",
      cardId,
      promo.startDate,
      promo.expirationDate,
      promo.description.trim().toLowerCase(),
    ].join(":"),
  ];
}

export const proposeManualPromo = agentMutation({
  args: {
    threadId: v.id("agentThreads"),
    cardId: v.id("creditCards"),
    promo: v.any(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const promo = coercePromo(args.promo);

    const card = await ctx.table("creditCards").getX(args.cardId);
    if (card.userId !== viewer._id) throw new Error("not_authorized");

    if (promo.promoRateId) {
      const existing = await ctx
        .table("promoRates")
        .get(promo.promoRateId as any);
      if (!existing) throw new Error("promo_not_found");
      if (existing.userId !== viewer._id) throw new Error("not_authorized");
      if (existing.isManual !== true) {
        throw new Error("not_authorized: cannot modify Plaid-synced promo");
      }
    }

    const isUpdate = promo.promoRateId != null;
    const summaryText = isUpdate
      ? `Update manual promo ${promo.description}`
      : `Add manual promo ${promo.description}`;

    const affectedIds = buildPromoAffectedIds(String(args.cardId), promo);

    return await createProposal(ctx, {
      toolName: TOOL_NAME,
      argsJson: JSON.stringify({
        cardId: args.cardId,
        promo,
      }),
      summaryText,
      affectedCount: 1,
      affectedIds,
      sampleJson: JSON.stringify({ cardId: args.cardId, promo }),
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
    promo: PromoInput;
  };

  const card = await ctx.table("creditCards").getX(parsed.cardId);
  if (card.userId !== viewer._id) throw new Error("not_authorized");

  if (parsed.promo.promoRateId) {
    const row = await ctx
      .table("promoRates")
      .getX(parsed.promo.promoRateId as any);
    if (row.userId !== viewer._id) throw new Error("not_authorized");
    if (row.isManual !== true) throw new Error("not_authorized");

    const priorFields: PromoPriorFields = {
      description: row.description,
      aprPercentage: row.aprPercentage,
      originalBalance: row.originalBalance,
      remainingBalance: row.remainingBalance,
      startDate: row.startDate,
      expirationDate: row.expirationDate,
      isDeferredInterest: row.isDeferredInterest,
      isActive: row.isActive,
    };

    await row.patch({
      description: parsed.promo.description,
      aprPercentage: parsed.promo.aprPercentage,
      originalBalance: parsed.promo.originalBalance,
      remainingBalance: parsed.promo.remainingBalance,
      startDate: parsed.promo.startDate,
      expirationDate: parsed.promo.expirationDate,
      isDeferredInterest: parsed.promo.isDeferredInterest,
      isActive: true,
    } as any);

    return {
      reversalPayload: {
        kind: "promo_restore",
        promoRateId: parsed.promo.promoRateId,
        priorFields,
      },
      affectedIds: [parsed.promo.promoRateId],
      summary: `Updated manual promo ${parsed.promo.description}.`,
    };
  }

  const newId = (await ctx.table("promoRates").insert({
    description: parsed.promo.description,
    aprPercentage: parsed.promo.aprPercentage,
    originalBalance: parsed.promo.originalBalance,
    remainingBalance: parsed.promo.remainingBalance,
    startDate: parsed.promo.startDate,
    expirationDate: parsed.promo.expirationDate,
    isDeferredInterest: parsed.promo.isDeferredInterest,
    isActive: true,
    isManual: true,
    userId: viewer._id,
    creditCardId: parsed.cardId,
  } as any)) as string;

  return {
    reversalPayload: {
      kind: "promo_soft_delete",
      promoRateId: newId,
    },
    affectedIds: [newId],
    summary: `Added manual promo ${parsed.promo.description}.`,
  };
});

registerReversal(TOOL_NAME, async (ctx, audit) => {
  const viewer = ctx.viewerX();
  const payload = JSON.parse(audit.reversalPayloadJson) as
    | { kind: "promo_soft_delete"; promoRateId: string }
    | {
        kind: "promo_restore";
        promoRateId: string;
        priorFields: PromoPriorFields;
      };

  const row = await ctx.table("promoRates").getX(payload.promoRateId as any);
  if (row.userId !== viewer._id) throw new Error("not_authorized");
  if (row.isManual !== true) throw new Error("not_authorized");

  if (payload.kind === "promo_soft_delete") {
    await row.patch({ isActive: false } as any);
    return { summary: "Deactivated manual promo." };
  }

  await row.patch(payload.priorFields as any);
  return { summary: "Restored manual promo." };
});
