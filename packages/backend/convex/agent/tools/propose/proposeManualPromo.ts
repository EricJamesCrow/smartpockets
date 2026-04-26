import { v } from "convex/values";
import { agentMutation } from "../../functions";
import { type ExecutorResult, createProposal, registerReversal, registerToolExecutor } from "../../writeTool";

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
    "description" | "aprPercentage" | "originalBalance" | "remainingBalance" | "startDate" | "expirationDate" | "isDeferredInterest"
> & { isActive?: boolean };

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DESCRIPTION_LENGTH = 160;

function isIsoDate(value: string): boolean {
    if (!ISO_DATE_RE.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function numberField(src: Record<string, unknown>, field: keyof Pick<PromoInput, "aprPercentage" | "originalBalance" | "remainingBalance">): number {
    const value = src[field];
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`invalid_args: ${field} must be a finite number`);
    }
    return value;
}

export function coercePromo(input: unknown): PromoInput {
    if (input == null || typeof input !== "object") {
        throw new Error("invalid_args: promo payload missing");
    }
    const src = input as Record<string, unknown>;
    const description = typeof src.description === "string" ? src.description.trim() : "";
    if (description.length === 0 || description.length > MAX_DESCRIPTION_LENGTH) {
        throw new Error("invalid_args: description is required");
    }

    const aprPercentage = numberField(src, "aprPercentage");
    if (aprPercentage < 0 || aprPercentage > 100) {
        throw new Error("invalid_args: aprPercentage must be between 0 and 100");
    }

    const originalBalance = numberField(src, "originalBalance");
    if (originalBalance <= 0) {
        throw new Error("invalid_args: originalBalance must be positive");
    }

    const remainingBalance = numberField(src, "remainingBalance");
    if (remainingBalance < 0 || remainingBalance > originalBalance) {
        throw new Error("invalid_args: remainingBalance must be between 0 and originalBalance");
    }

    const startDate = typeof src.startDate === "string" ? src.startDate : "";
    const expirationDate = typeof src.expirationDate === "string" ? src.expirationDate : "";
    if (!isIsoDate(startDate)) {
        throw new Error("invalid_args: startDate must be YYYY-MM-DD");
    }
    if (!isIsoDate(expirationDate)) {
        throw new Error("invalid_args: expirationDate must be YYYY-MM-DD");
    }
    if (expirationDate < startDate) {
        throw new Error("invalid_args: expirationDate must be on or after startDate");
    }

    if (typeof src.isDeferredInterest !== "boolean") {
        throw new Error("invalid_args: isDeferredInterest must be boolean");
    }

    return {
        description,
        aprPercentage,
        originalBalance,
        remainingBalance,
        startDate,
        expirationDate,
        isDeferredInterest: src.isDeferredInterest,
        promoRateId: typeof src.promoRateId === "string" && src.promoRateId.length > 0 ? src.promoRateId : undefined,
    };
}

export function buildPromoAffectedIds(cardId: string, promo: PromoInput): string[] {
    if (promo.promoRateId) return [promo.promoRateId];
    return [["new", cardId, promo.startDate, promo.expirationDate, promo.description.trim().toLowerCase()].join(":")];
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
            const existing = await ctx.table("promoRates").get(promo.promoRateId as any);
            if (!existing) throw new Error("promo_not_found");
            if (existing.userId !== viewer._id) throw new Error("not_authorized");
            if (existing.creditCardId !== args.cardId) throw new Error("not_authorized");
            if (existing.isManual !== true) {
                throw new Error("not_authorized: cannot modify Plaid-synced promo");
            }
        }

        const isUpdate = promo.promoRateId != null;
        const summaryText = isUpdate ? `Update manual promo ${promo.description}` : `Add manual promo ${promo.description}`;

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
    const raw = JSON.parse(proposal.argsJson) as {
        cardId: string;
        promo: unknown;
    };
    const parsed = {
        cardId: raw.cardId,
        promo: coercePromo(raw.promo),
    };

    const card = await ctx.table("creditCards").getX(parsed.cardId);
    if (card.userId !== viewer._id) throw new Error("not_authorized");

    if (parsed.promo.promoRateId) {
        const row = await ctx.table("promoRates").getX(parsed.promo.promoRateId as any);
        if (row.userId !== viewer._id) throw new Error("not_authorized");
        if (row.creditCardId !== parsed.cardId) throw new Error("not_authorized");
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
