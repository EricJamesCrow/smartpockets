/**
 * W7 send workflows (workflow.define backed by @convex-dev/workflow).
 *
 * Each template is a journaled workflow: load the pending emailEvents
 * row, run preCheck (suppression + preference), render the template,
 * build List-Unsubscribe headers, dispatch via sendResendRaw, and
 * patch status. sendAnomalyAlert additionally coalesces sibling
 * pending rows within a 15-minute window (leadership check + runAfter
 * 15 min coalesce step + patch siblings on send).
 *
 * Step ordering and middleware contracts match contracts §9.2 and
 * specs/W7-email.md §7-9. All step mutations re-read state so the
 * at-least-once retry semantics of action steps stay safe.
 */
import type { WorkflowCtx } from "@convex-dev/workflow";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { workflow } from "./workflow";

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
  step: WorkflowCtx,
  emailEventId: Id<"emailEvents">,
  templateKey: TemplateKey,
  subjectFn: (payload: Record<string, unknown>) => string,
  shouldSendFn?: (payload: Record<string, unknown>) => boolean,
): Promise<void> {
  const row = (await step.runQuery(
    internal.email.queries.getEventInternal,
    { emailEventId },
  )) as {
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
    // Zero-signal skip: short-circuit without sending.
    await step.runMutation(internal.email.mutations.patchFailed, {
      emailEventId,
      errorMessage: "zero-signal",
    });
    return;
  }

  const pre = await step.runMutation(internal.email.middleware.preCheck, {
    emailEventId,
  });
  if (pre.skipped) return;

  const html = await step.runAction(
    internal.email.templates.renderTemplate,
    { template: templateKey, props: { ...row.payloadJson, theme: "light" } },
  );

  await step.runMutation(internal.email.mutations.patchRunning, {
    emailEventId,
    attemptCount: 1,
  });

  let headers: Array<{ name: string; value: string }> = [];
  if (row.userId) {
    headers = await step.runMutation(
      internal.email.middleware.buildUnsubscribeHeaders,
      { userId: row.userId, templateKey },
    );
  }

  try {
    const result = await step.runAction(internal.email.send.sendResendRaw, {
      to: row.email,
      subject: subjectFn(row.payloadJson),
      html,
      headers,
    });
    await step.runMutation(internal.email.mutations.patchSent, {
      emailEventId,
      resendEmailId: result.emailId,
      mode: result.mode,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await step.runMutation(internal.email.mutations.patchFailed, {
      emailEventId,
      errorMessage: message,
    });
    throw err;
  }
}

// ============================================================================
// welcome-onboarding
// ============================================================================

export const sendWelcomeOnboarding = workflow.define({
  args: { emailEventId: v.id("emailEvents") },
  handler: async (step, { emailEventId }) => {
    await runStandardWorkflow(step, emailEventId, "welcome-onboarding", (p) =>
      (p as { variant?: string }).variant === "plaid-linked"
        ? "You're set up. Here is what SmartPockets can do."
        : "Welcome to SmartPockets. Connect a bank to get started.",
    );
  },
});

// ============================================================================
// weekly-digest (with zero-signal skip)
// ============================================================================

export const sendWeeklyDigest = workflow.define({
  args: { emailEventId: v.id("emailEvents") },
  handler: async (step, { emailEventId }) => {
    await runStandardWorkflow(
      step,
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
  },
});

// ============================================================================
// promo-warning
// ============================================================================

export const sendPromoWarning = workflow.define({
  args: { emailEventId: v.id("emailEvents") },
  handler: async (step, { emailEventId }) => {
    await runStandardWorkflow(step, emailEventId, "promo-warning", (p) => {
      const promos = (p as { promos?: Array<{ cardName: string }> }).promos ?? [];
      const cadence = (p as { cadence?: number }).cadence ?? 30;
      const n = promos.length;
      const firstCard = promos[0]?.cardName ?? "your card";
      if (n === 1) {
        if (cadence === 1) {
          return `Tomorrow: pay ${firstCard} to avoid retroactive interest`;
        }
        return `Your ${firstCard} deferred interest promo expires in ${cadence} days`;
      }
      if (cadence === 1) return `Tomorrow: ${n} deferred interest promos expire`;
      if (cadence === 7) return `Final week: ${firstCard} (plus ${n - 1} more)`;
      if (cadence === 14) return `14 days left: ${firstCard} (plus ${n - 1} more)`;
      return `${n} of your deferred interest promos expire within 30 days`;
    });
  },
});

// ============================================================================
// statement-closing
// ============================================================================

export const sendStatementReminder = workflow.define({
  args: { emailEventId: v.id("emailEvents") },
  handler: async (step, { emailEventId }) => {
    await runStandardWorkflow(step, emailEventId, "statement-closing", (p) => {
      const statements = (p as { statements?: Array<{ cardName: string }> })
        .statements ?? [];
      const cadence = (p as { cadence?: number }).cadence ?? 3;
      const n = statements.length;
      const firstCard = statements[0]?.cardName ?? "your card";
      if (n === 1) {
        return cadence === 1
          ? `${firstCard} statement closes tomorrow`
          : `${firstCard} statement closes in ${cadence} days`;
      }
      return cadence === 1
        ? `${n} statements close tomorrow`
        : `${n} statements close in the next ${cadence} days`;
    });
  },
});

// ============================================================================
// anomaly-alert (leadership + journaled 15-min coalesce)
// ============================================================================
//
// One workflow, two step phases:
//   1. anomalyLeadershipCheck: only the oldest pending row proceeds.
//   2. anomalyCoalesce scheduled `{ runAfter: 15 min }`: the step is
//      journaled; the workflow yields for 15 minutes and Convex
//      re-enters the handler on the scheduled time. Platform runtime
//      limits do not apply to the intervening wall time.
//   3. preCheck + render + send + patch coalesced siblings.

const ANOMALY_WINDOW_MS = 15 * 60 * 1000;

export const sendAnomalyAlert = workflow.define({
  args: { emailEventId: v.id("emailEvents") },
  handler: async (step, { emailEventId }) => {
    const leadership = await step.runMutation(
      internal.email.middleware.anomalyLeadershipCheck,
      { emailEventId },
    );
    if (!leadership.isLeader) return;

    // Journaled 15-minute wait: anomalyCoalesce runs on the workflow
    // engine's scheduled-step surface, not in a held-open action.
    const coalesced = await step.runMutation(
      internal.email.middleware.anomalyCoalesce,
      { leaderId: emailEventId, windowMs: ANOMALY_WINDOW_MS },
      { runAfter: ANOMALY_WINDOW_MS },
    );

    const pre = await step.runMutation(
      internal.email.middleware.preCheck,
      { emailEventId },
    );
    if (pre.skipped) {
      await step.runMutation(
        internal.email.middleware.patchSiblingsSkipped,
        {
          siblingIds: coalesced.siblingIds,
          reason: pre.reason ?? "preference",
        },
      );
      return;
    }

    const row = (await step.runQuery(
      internal.email.queries.getEventInternal,
      { emailEventId },
    )) as { email: string; payloadJson: Record<string, unknown> } | null;
    if (!row) return;

    const html = await step.runAction(
      internal.email.templates.renderTemplate,
      {
        template: "anomaly-alert",
        props: { anomalies: coalesced.anomalies, theme: "light" },
      },
    );

    await step.runMutation(
      internal.email.middleware.patchCoalescedRunning,
      {
        leaderId: emailEventId,
        siblingIds: coalesced.siblingIds,
      },
    );

    const headers = await step.runMutation(
      internal.email.middleware.buildUnsubscribeHeaders,
      { userId: coalesced.userId, templateKey: "anomaly-alert" },
    );

    const count = coalesced.anomalies.length;
    const subject =
      count === 1
        ? "Unusual transaction detected"
        : `${count} unusual transactions detected`;

    const result = await step.runAction(internal.email.send.sendResendRaw, {
      to: row.email,
      subject,
      html,
      headers,
    });

    await step.runMutation(
      internal.email.middleware.patchCoalescedSent,
      {
        leaderId: emailEventId,
        siblingIds: coalesced.siblingIds,
        resendEmailId: result.emailId,
        mode: result.mode,
      },
    );
  },
});

// ============================================================================
// subscription-detected
// ============================================================================

export const sendSubscriptionDigest = workflow.define({
  args: { emailEventId: v.id("emailEvents") },
  handler: async (step, { emailEventId }) => {
    await runStandardWorkflow(step, emailEventId, "subscription-detected", (p) => {
      const detected = (p as { detected?: Array<{ normalizedMerchant: string }> })
        .detected ?? [];
      const firstMerchant = detected[0]?.normalizedMerchant ?? "a merchant";
      return detected.length === 1
        ? `We found a possible subscription: ${firstMerchant}`
        : `${detected.length} possible subscriptions detected`;
    });
  },
});

// ============================================================================
// reconsent-required (essential)
// ============================================================================

export const sendReconsentRequired = workflow.define({
  args: { emailEventId: v.id("emailEvents") },
  handler: async (step, { emailEventId }) => {
    await runStandardWorkflow(step, emailEventId, "reconsent-required", (p) => {
      const r = p as { institutionName?: string; reason?: string };
      return r.reason === "PENDING_EXPIRATION"
        ? `${r.institutionName ?? "Your bank"} will disconnect soon`
        : `Action needed: reconnect your ${r.institutionName ?? "bank"} account`;
    });
  },
});

// ============================================================================
// item-error-persistent (essential)
// ============================================================================

export const sendItemErrorPersistent = workflow.define({
  args: { emailEventId: v.id("emailEvents") },
  handler: async (step, { emailEventId }) => {
    await runStandardWorkflow(step, emailEventId, "item-error-persistent", (p) => {
      const r = p as { institutionName?: string };
      return `We cannot reach your ${r.institutionName ?? "bank"} account`;
    });
  },
});
