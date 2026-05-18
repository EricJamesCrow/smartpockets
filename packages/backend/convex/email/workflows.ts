/**
 * Send workflows (workflow.define backed by @convex-dev/workflow).
 *
 * Each template is a journaled workflow: load the pending emailEvents
 * row, run preCheck (suppression + preference), render the template,
 * build List-Unsubscribe headers, dispatch via sendResendRaw, and
 * patch status.
 *
 * All step mutations re-read state so the at-least-once retry semantics
 * of action steps stay safe.
 */
import type { WorkflowCtx } from "@convex-dev/workflow";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { workflow } from "./workflow";

type TemplateKey = "welcome-onboarding" | "reconsent-required" | "item-error-persistent";

async function runStandardWorkflow(
    step: WorkflowCtx,
    emailEventId: Id<"emailEvents">,
    templateKey: TemplateKey,
    subjectFn: (payload: Record<string, unknown>) => string,
    shouldSendFn?: (payload: Record<string, unknown>) => boolean,
): Promise<void> {
    const row = (await step.runQuery(internal.email.queries.getEventInternal, { emailEventId })) as {
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

    const html = await step.runAction(internal.email.templates.renderTemplate, { template: templateKey, props: { ...row.payloadJson, theme: "light" } });

    await step.runMutation(internal.email.mutations.patchRunning, {
        emailEventId,
        attemptCount: 1,
    });

    let headers: Array<{ name: string; value: string }> = [];
    if (row.userId) {
        headers = await step.runMutation(internal.email.middleware.buildUnsubscribeHeaders, { userId: row.userId, templateKey });
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
