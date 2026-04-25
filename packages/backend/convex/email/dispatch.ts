import { v } from "convex/values";
import type { FunctionReference } from "convex/server";
import type { GenericActionCtx } from "convex/server";
import { internal } from "../_generated/api";
import type { DataModel, Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import { idempotencyKey } from "../notifications/hashing";
import { workflow } from "./workflow";

type DispatchCtx = GenericActionCtx<DataModel>;

// Workflow.define produces an internal mutation reference; dispatch
// actions hand a reference to workflow.start. The args are wrapped by
// @convex-dev/workflow (WorkflowArgs<T>) so we accept any such ref
// rather than spelling out the wrapper type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EmailWorkflowRef = FunctionReference<"mutation", "internal", any, any, string | undefined>;

const DispatchResult = v.object({
  status: v.union(v.literal("queued"), v.literal("skipped_duplicate")),
  emailEventId: v.id("emailEvents"),
});

/**
 * Explicit return type for every dispatch handler. Breaks the circular
 * inference between internal.email.dispatch.* (this file's exports)
 * and internal.email.workflows.* (referenced in the handler body).
 */
type DispatchReturn = Promise<{
  status: "queued" | "skipped_duplicate";
  emailEventId: Id<"emailEvents">;
}>;

function utcDateBucket(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function isUniqueConstraintError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return /unique/i.test(err.message);
}

async function queueOrSkip(
  ctx: DispatchCtx,
  params: {
    idempotencyKey: string;
    userId: Id<"users">;
    templateKey: string;
    cadence?: number;
    payload: Record<string, unknown>;
    workflowRef: EmailWorkflowRef;
  },
): Promise<{
  status: "queued" | "skipped_duplicate";
  emailEventId: Id<"emailEvents">;
}> {
  // Fast path: short-circuit on a committed duplicate. The unique
  // constraint is the correctness boundary for concurrent dispatches.
  const existing = (await ctx.runQuery(
    internal.email.queries.getByIdempotencyKey,
    { idempotencyKey: params.idempotencyKey },
  )) as Id<"emailEvents"> | null;

  if (existing) {
    return { status: "skipped_duplicate", emailEventId: existing };
  }

  const email = (await ctx.runQuery(internal.email.internal.getUserEmail, {
    userId: params.userId,
  })) as string;

  // Correctness path: insert-and-catch. If a concurrent dispatch
  // committed the row between the get above and this insert, the
  // unique constraint on idempotencyKey throws; we re-resolve and
  // return skipped_duplicate so retrying crons/webhooks do not surface
  // false failures (contracts §10.2).
  let emailEventId: Id<"emailEvents">;
  try {
    emailEventId = (await ctx.runMutation(
      internal.email.mutations.insertPending,
      {
        idempotencyKey: params.idempotencyKey,
        userId: params.userId,
        email,
        templateKey: params.templateKey,
        cadence: params.cadence,
        payloadJson: params.payload,
      },
    )) as Id<"emailEvents">;
  } catch (err) {
    if (!isUniqueConstraintError(err)) throw err;
    const raced = (await ctx.runQuery(
      internal.email.queries.getByIdempotencyKey,
      { idempotencyKey: params.idempotencyKey },
    )) as Id<"emailEvents"> | null;
    if (!raced) throw err;
    return { status: "skipped_duplicate", emailEventId: raced };
  }

  const workflowId = await workflow.start(
    ctx,
    params.workflowRef,
    { emailEventId },
  );

  await ctx.runMutation(internal.email.mutations.patchWorkflowId, {
    emailEventId,
    workflowId,
  });

  return { status: "queued", emailEventId };
}

// ============================================================================
// Welcome onboarding (essential tier; class-level lifetime dedup)
// ============================================================================

export const dispatchWelcomeOnboarding = internalAction({
  args: {
    userId: v.id("users"),
    variant: v.union(v.literal("signup-only"), v.literal("plaid-linked")),
    firstLinkedInstitutionName: v.optional(v.string()),
  },
  returns: DispatchResult,
  handler: async (ctx, args): DispatchReturn => {
    const key = await idempotencyKey({
      userId: args.userId,
      scope: "welcome-class",
    });
    return await queueOrSkip(ctx, {
      idempotencyKey: key,
      userId: args.userId,
      templateKey: "welcome-onboarding",
      payload: {
        variant: args.variant,
        firstLinkedInstitutionName: args.firstLinkedInstitutionName,
      },
      workflowRef: internal.email.workflows.sendWelcomeOnboarding,
    });
  },
});

// ============================================================================
// Weekly digest (W7 Sunday cron)
// ============================================================================

const WeeklyDigestArgs = v.object({
  userId: v.id("users"),
  weekStart: v.number(),
  topSpendByCategory: v.array(
    v.object({
      category: v.string(),
      amountCents: v.number(),
      changeVsPriorWeekPct: v.number(),
    }),
  ),
  upcomingStatements: v.array(
    v.object({
      cardName: v.string(),
      closingDate: v.string(),
      projectedBalanceCents: v.number(),
    }),
  ),
  activeAnomalies: v.array(
    v.object({
      anomalyId: v.string(),
      merchantName: v.string(),
      amountCents: v.number(),
    }),
  ),
  expiringPromos: v.array(
    v.object({
      promoId: v.string(),
      cardName: v.string(),
      expirationDate: v.string(),
      balanceCents: v.number(),
    }),
  ),
  expiringTrials: v.array(
    v.object({
      merchantName: v.string(),
      renewsOn: v.string(),
    }),
  ),
});

export const dispatchWeeklyDigest = internalAction({
  args: WeeklyDigestArgs.fields,
  returns: DispatchResult,
  handler: async (ctx, args): DispatchReturn => {
    const dateBucket = utcDateBucket(new Date(args.weekStart));
    const key = await idempotencyKey({
      userId: args.userId,
      scope: "weekly-digest",
      dateBucket,
    });
    return await queueOrSkip(ctx, {
      idempotencyKey: key,
      userId: args.userId,
      templateKey: "weekly-digest",
      payload: { ...args, dateBucket },
      workflowRef: internal.email.workflows.sendWeeklyDigest,
    });
  },
});

// ============================================================================
// Promo warning (W6 daily countdown cron)
// ============================================================================

export const dispatchPromoWarning = internalAction({
  args: {
    userId: v.id("users"),
    cadence: v.union(
      v.literal(30),
      v.literal(14),
      v.literal(7),
      v.literal(1),
    ),
    promos: v.array(
      v.object({
        promoId: v.string(),
        cardName: v.string(),
        expirationDate: v.string(),
        balanceCents: v.number(),
        daysRemaining: v.number(),
      }),
    ),
  },
  returns: DispatchResult,
  handler: async (ctx, args): DispatchReturn => {
    const dateBucket = utcDateBucket();
    const key = await idempotencyKey({
      userId: args.userId,
      scope: "promo-warning",
      cadence: args.cadence,
      ids: args.promos.map((p) => p.promoId),
      dateBucket,
    });
    return await queueOrSkip(ctx, {
      idempotencyKey: key,
      userId: args.userId,
      templateKey: "promo-warning",
      cadence: args.cadence,
      payload: { ...args, dateBucket },
      workflowRef: internal.email.workflows.sendPromoWarning,
    });
  },
});

// ============================================================================
// Statement reminder (W6 statement scan)
// ============================================================================

export const dispatchStatementReminder = internalAction({
  args: {
    userId: v.id("users"),
    cadence: v.union(v.literal(3), v.literal(1)),
    statements: v.array(
      v.object({
        cardId: v.string(),
        cardName: v.string(),
        closingDate: v.string(),
        projectedBalanceCents: v.number(),
        minimumDueCents: v.number(),
        dueDate: v.string(),
      }),
    ),
  },
  returns: DispatchResult,
  handler: async (ctx, args): DispatchReturn => {
    const dateBucket = utcDateBucket();
    const key = await idempotencyKey({
      userId: args.userId,
      scope: "statement-closing",
      cadence: args.cadence,
      ids: args.statements.map((s) => s.cardId),
      dateBucket,
    });
    return await queueOrSkip(ctx, {
      idempotencyKey: key,
      userId: args.userId,
      templateKey: "statement-closing",
      cadence: args.cadence,
      payload: { ...args, dateBucket },
      workflowRef: internal.email.workflows.sendStatementReminder,
    });
  },
});

// ============================================================================
// Anomaly alert (W6 per-event; workflow coalesces 15-min batch)
// ============================================================================

export const dispatchAnomalyAlert = internalAction({
  args: {
    userId: v.id("users"),
    anomalyId: v.string(),
  },
  returns: DispatchResult,
  handler: async (ctx, args): DispatchReturn => {
    const key = await idempotencyKey({
      userId: args.userId,
      scope: "anomaly-alert",
      ids: [args.anomalyId],
    });
    return await queueOrSkip(ctx, {
      idempotencyKey: key,
      userId: args.userId,
      templateKey: "anomaly-alert",
      payload: { anomalyId: args.anomalyId },
      workflowRef: internal.email.workflows.sendAnomalyAlert,
    });
  },
});

// ============================================================================
// Subscription digest (W6 catch-up scan; per-user-per-day batch)
// ============================================================================

export const dispatchSubscriptionDigest = internalAction({
  args: {
    userId: v.id("users"),
    batchDate: v.string(),
    detected: v.array(
      v.object({
        subscriptionId: v.string(),
        normalizedMerchant: v.string(),
        averageAmount: v.number(),
        frequency: v.union(
          v.literal("weekly"),
          v.literal("biweekly"),
          v.literal("monthly"),
          v.literal("quarterly"),
          v.literal("annual"),
        ),
      }),
    ),
  },
  returns: DispatchResult,
  handler: async (ctx, args): DispatchReturn => {
    const key = await idempotencyKey({
      userId: args.userId,
      scope: "subscription-detected",
      ids: args.detected.map((d) => d.subscriptionId),
      dateBucket: args.batchDate,
    });
    return await queueOrSkip(ctx, {
      idempotencyKey: key,
      userId: args.userId,
      templateKey: "subscription-detected",
      payload: args,
      workflowRef: internal.email.workflows.sendSubscriptionDigest,
    });
  },
});

// ============================================================================
// Reconsent required (W4 Plaid webhook; essential; 24h dedup per item)
// ============================================================================

export const dispatchReconsentRequired = internalAction({
  args: {
    userId: v.id("users"),
    plaidItemId: v.string(),
    institutionName: v.string(),
    reason: v.union(
      v.literal("ITEM_LOGIN_REQUIRED"),
      v.literal("PENDING_EXPIRATION"),
    ),
  },
  returns: DispatchResult,
  handler: async (ctx, args): DispatchReturn => {
    const dateBucket = utcDateBucket();
    const key = await idempotencyKey({
      userId: args.userId,
      scope: "reconsent-required",
      ids: [args.plaidItemId],
      dateBucket,
    });
    return await queueOrSkip(ctx, {
      idempotencyKey: key,
      userId: args.userId,
      templateKey: "reconsent-required",
      payload: args,
      workflowRef: internal.email.workflows.sendReconsentRequired,
    });
  },
});

// ============================================================================
// Item error persistent (W4 24h cron; essential)
// ============================================================================

export const dispatchItemErrorPersistent = internalAction({
  args: {
    userId: v.id("users"),
    plaidItemId: v.string(),
    institutionName: v.string(),
    firstErrorAt: v.number(),
    lastSeenErrorAt: v.number(),
    errorCode: v.string(),
  },
  returns: DispatchResult,
  handler: async (ctx, args): DispatchReturn => {
    const dateBucket = utcDateBucket();
    const key = await idempotencyKey({
      userId: args.userId,
      scope: "item-error-persistent",
      ids: [args.plaidItemId],
      dateBucket,
    });
    return await queueOrSkip(ctx, {
      idempotencyKey: key,
      userId: args.userId,
      templateKey: "item-error-persistent",
      payload: args,
      workflowRef: internal.email.workflows.sendItemErrorPersistent,
    });
  },
});
