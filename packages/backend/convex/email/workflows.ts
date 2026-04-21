/**
 * W7 send workflows.
 *
 * Each template gets a workflow that loads the pending emailEvents row,
 * runs preCheck (suppression + preference), renders the template, builds
 * List-Unsubscribe headers, dispatches via sendResendRaw, and patches
 * status. Anomaly workflow additionally coalesces sibling pending rows
 * within a 15-minute window (leadership check + wait + patch siblings).
 *
 * Today these are implemented as internalActions invoked through the
 * workflow shim (../workflow.ts). When W2 lands @convex-dev/workflow,
 * migrate each body to `workflow.define({ handler: async (step, ...) })`
 * with the same step ordering. The step ordering and mutation contracts
 * are stable across the migration.
 */
import { v } from "convex/values";
import type { GenericActionCtx } from "convex/server";
import { internal } from "../_generated/api";
import type { DataModel, Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";

type WorkflowCtx = GenericActionCtx<DataModel>;

type TemplateKey =
  | "welcome-onboarding"
  | "weekly-digest"
  | "promo-warning"
  | "statement-closing"
  | "anomaly-alert"
  | "subscription-detected"
  | "reconsent-required"
  | "item-error-persistent";

async function runStandardWorkflow(
  ctx: WorkflowCtx,
  emailEventId: Id<"emailEvents">,
  templateKey: TemplateKey,
  subjectFn: (payload: Record<string, unknown>) => string,
  shouldSendFn?: (payload: Record<string, unknown>) => boolean,
): Promise<void> {
  const row = (await ctx.runQuery(internal.email.queries.getEventInternal, {
    emailEventId,
  })) as {
    _id: Id<"emailEvents">;
    email: string;
    templateKey: string;
    status: string;
    userId: Id<"users"> | null;
    payloadJson: Record<string, unknown>;
    cadence?: number;
  } | null;

  if (!row || row.status !== "pending") return;
  if (shouldSendFn && !shouldSendFn(row.payloadJson)) {
    // Zero-signal skip: patch as sent with synthetic id to close
    // the lifecycle; caller can filter by source if needed.
    await ctx.runMutation(internal.email.mutations.patchFailed, {
      emailEventId,
      errorMessage: "zero-signal",
    });
    return;
  }

  const pre = await ctx.runMutation(internal.email.middleware.preCheck, {
    emailEventId,
  });
  if (pre.skipped) return;

  const html: string = await ctx.runAction(
    internal.email.templates.renderTemplate,
    { template: templateKey, props: { ...row.payloadJson, theme: "light" } },
  );

  await ctx.runMutation(internal.email.mutations.patchRunning, {
    emailEventId,
    attemptCount: 1,
  });

  let headers: Array<{ name: string; value: string }> = [];
  if (row.userId) {
    headers = await ctx.runMutation(
      internal.email.middleware.buildUnsubscribeHeaders,
      { userId: row.userId, templateKey },
    );
  }

  try {
    const result = await ctx.runAction(internal.email.send.sendResendRaw, {
      to: row.email,
      subject: subjectFn(row.payloadJson),
      html,
      headers,
    });
    await ctx.runMutation(internal.email.mutations.patchSent, {
      emailEventId,
      resendEmailId: result.emailId,
      mode: result.mode,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ctx.runMutation(internal.email.mutations.patchFailed, {
      emailEventId,
      errorMessage: message,
    });
    throw err;
  }
}

// ============================================================================
// welcome-onboarding
// ============================================================================

export const sendWelcomeOnboarding = internalAction({
  args: { emailEventId: v.id("emailEvents") },
  returns: v.null(),
  handler: async (ctx, { emailEventId }) => {
    await runStandardWorkflow(ctx, emailEventId, "welcome-onboarding", (p) =>
      (p as { variant?: string }).variant === "plaid-linked"
        ? "You're set up. Here is what SmartPockets can do."
        : "Welcome to SmartPockets. Connect a bank to get started.",
    );
    return null;
  },
});

// ============================================================================
// weekly-digest (with zero-signal skip)
// ============================================================================

export const sendWeeklyDigest = internalAction({
  args: { emailEventId: v.id("emailEvents") },
  returns: v.null(),
  handler: async (ctx, { emailEventId }) => {
    await runStandardWorkflow(
      ctx,
      emailEventId,
      "weekly-digest",
      (p) => {
        const label = (p as { weekEndingLabel?: string }).weekEndingLabel ?? "this week";
        return `Your SmartPockets week, ${label}`;
      },
      (p) => {
        const r = p as {
          topSpendByCategory?: unknown[];
          upcomingStatements?: unknown[];
          activeAnomalies?: unknown[];
          expiringPromos?: unknown[];
          expiringTrials?: unknown[];
        };
        return (
          (r.topSpendByCategory?.length ?? 0) +
            (r.upcomingStatements?.length ?? 0) +
            (r.activeAnomalies?.length ?? 0) +
            (r.expiringPromos?.length ?? 0) +
            (r.expiringTrials?.length ?? 0) >
          0
        );
      },
    );
    return null;
  },
});

// ============================================================================
// promo-warning
// ============================================================================

export const sendPromoWarning = internalAction({
  args: { emailEventId: v.id("emailEvents") },
  returns: v.null(),
  handler: async (ctx, { emailEventId }) => {
    await runStandardWorkflow(ctx, emailEventId, "promo-warning", (p) => {
      const promos = (p as { promos?: Array<{ cardName: string }> }).promos ?? [];
      const cadence = (p as { cadence?: number }).cadence ?? 30;
      const n = promos.length;
      if (n === 1) {
        if (cadence === 1) {
          return `Tomorrow: pay ${promos[0].cardName} to avoid retroactive interest`;
        }
        return `Your ${promos[0].cardName} deferred interest promo expires in ${cadence} days`;
      }
      if (cadence === 1) return `Tomorrow: ${n} deferred interest promos expire`;
      if (cadence === 7) return `Final week: ${promos[0].cardName} (plus ${n - 1} more)`;
      if (cadence === 14) return `14 days left: ${promos[0].cardName} (plus ${n - 1} more)`;
      return `${n} of your deferred interest promos expire within 30 days`;
    });
    return null;
  },
});

// ============================================================================
// statement-closing
// ============================================================================

export const sendStatementReminder = internalAction({
  args: { emailEventId: v.id("emailEvents") },
  returns: v.null(),
  handler: async (ctx, { emailEventId }) => {
    await runStandardWorkflow(ctx, emailEventId, "statement-closing", (p) => {
      const statements = (p as { statements?: Array<{ cardName: string }> })
        .statements ?? [];
      const cadence = (p as { cadence?: number }).cadence ?? 3;
      const n = statements.length;
      if (n === 1) {
        return cadence === 1
          ? `${statements[0].cardName} statement closes tomorrow`
          : `${statements[0].cardName} statement closes in ${cadence} days`;
      }
      return cadence === 1
        ? `${n} statements close tomorrow`
        : `${n} statements close in the next ${cadence} days`;
    });
    return null;
  },
});

// ============================================================================
// anomaly-alert (coalesce path; 15-min window)
// ============================================================================
//
// Split into two actions so the 15-minute wait runs as a scheduled
// step instead of blocking a live action. This mirrors the real
// workflow component's journaled waitForMoreAnomaliesStep (contracts
// §9.2): step 0 is the leadership check + schedule, step 1
// (runAfter 15 min) is the coalesce + send.

const ANOMALY_WINDOW_MS = 15 * 60 * 1000;

export const sendAnomalyAlert = internalAction({
  args: { emailEventId: v.id("emailEvents") },
  returns: v.null(),
  handler: async (ctx, { emailEventId }) => {
    const leadership = await ctx.runMutation(
      internal.email.middleware.anomalyLeadershipCheck,
      { emailEventId },
    );
    if (!leadership.isLeader) return null;

    // Defer the coalesce body to a scheduled step after the window.
    // Running on the scheduler lets the action return immediately
    // and stays within Convex action runtime limits; on restart the
    // scheduler redelivers at-least-once and runAnomalyCoalesce is
    // idempotent by design (re-reads row status, leadership respects
    // completed peers).
    await ctx.scheduler.runAfter(
      ANOMALY_WINDOW_MS,
      internal.email.workflows.runAnomalyCoalesce,
      { emailEventId },
    );
    return null;
  },
});

export const runAnomalyCoalesce = internalAction({
  args: { emailEventId: v.id("emailEvents") },
  returns: v.null(),
  handler: async (ctx, { emailEventId }) => {
    const coalesced = await ctx.runMutation(
      internal.email.middleware.anomalyCoalesce,
      { leaderId: emailEventId, windowMs: ANOMALY_WINDOW_MS },
    );

    const pre = await ctx.runMutation(internal.email.middleware.preCheck, {
      emailEventId,
    });
    if (pre.skipped) {
      await ctx.runMutation(
        internal.email.middleware.patchSiblingsSkipped,
        {
          siblingIds: coalesced.siblingIds,
          reason: pre.reason ?? "preference",
        },
      );
      return null;
    }

    const row = (await ctx.runQuery(internal.email.queries.getEventInternal, {
      emailEventId,
    })) as { email: string; payloadJson: Record<string, unknown> } | null;
    if (!row) return null;

    const html: string = await ctx.runAction(
      internal.email.templates.renderTemplate,
      {
        template: "anomaly-alert",
        props: { anomalies: coalesced.anomalies, theme: "light" },
      },
    );

    await ctx.runMutation(internal.email.middleware.patchCoalescedRunning, {
      leaderId: emailEventId,
      siblingIds: coalesced.siblingIds,
    });

    const headers = await ctx.runMutation(
      internal.email.middleware.buildUnsubscribeHeaders,
      { userId: coalesced.userId, templateKey: "anomaly-alert" },
    );

    const count = coalesced.anomalies.length;
    const subject =
      count === 1
        ? "Unusual transaction detected"
        : `${count} unusual transactions detected`;

    const result = await ctx.runAction(internal.email.send.sendResendRaw, {
      to: row.email,
      subject,
      html,
      headers,
    });

    await ctx.runMutation(internal.email.middleware.patchCoalescedSent, {
      leaderId: emailEventId,
      siblingIds: coalesced.siblingIds,
      resendEmailId: result.emailId,
      mode: result.mode,
    });
    return null;
  },
});

// ============================================================================
// subscription-detected
// ============================================================================

export const sendSubscriptionDigest = internalAction({
  args: { emailEventId: v.id("emailEvents") },
  returns: v.null(),
  handler: async (ctx, { emailEventId }) => {
    await runStandardWorkflow(ctx, emailEventId, "subscription-detected", (p) => {
      const detected = (p as { detected?: Array<{ normalizedMerchant: string }> })
        .detected ?? [];
      return detected.length === 1
        ? `We found a possible subscription: ${detected[0].normalizedMerchant}`
        : `${detected.length} possible subscriptions detected`;
    });
    return null;
  },
});

// ============================================================================
// reconsent-required (essential)
// ============================================================================

export const sendReconsentRequired = internalAction({
  args: { emailEventId: v.id("emailEvents") },
  returns: v.null(),
  handler: async (ctx, { emailEventId }) => {
    await runStandardWorkflow(ctx, emailEventId, "reconsent-required", (p) => {
      const r = p as { institutionName?: string; reason?: string };
      return r.reason === "PENDING_EXPIRATION"
        ? `${r.institutionName ?? "Your bank"} will disconnect soon`
        : `Action needed: reconnect your ${r.institutionName ?? "bank"} account`;
    });
    return null;
  },
});

// ============================================================================
// item-error-persistent (essential)
// ============================================================================

export const sendItemErrorPersistent = internalAction({
  args: { emailEventId: v.id("emailEvents") },
  returns: v.null(),
  handler: async (ctx, { emailEventId }) => {
    await runStandardWorkflow(ctx, emailEventId, "item-error-persistent", (p) => {
      const r = p as { institutionName?: string };
      return `We cannot reach your ${r.institutionName ?? "bank"} account`;
    });
    return null;
  },
});
