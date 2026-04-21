/**
 * Workflow manager wrapper.
 *
 * `@convex-dev/workflow` is installed by W2 (`packages/backend/convex/convex.config.ts`).
 * Until that PR lands, the `workflow.start` contract is stubbed via
 * the Convex scheduler so dispatch actions compile. When W2's workflow
 * component merges, replace this file with:
 *
 *   import { WorkflowManager } from "@convex-dev/workflow";
 *   import { components } from "../_generated/api";
 *   export const workflow = new WorkflowManager(components.workflow);
 *
 * The shape below matches the public surface used by W7 dispatch +
 * workflow bodies: `workflow.start(ctx, ref, args)` returns a string
 * instance id that the row's `workflowId` field records.
 */

type StartableCtx = {
  scheduler: { runAfter: (ms: number, ref: unknown, args: Record<string, unknown>) => Promise<string> };
};

export const workflow = {
  async start(
    ctx: StartableCtx,
    ref: unknown,
    args: Record<string, unknown>,
  ): Promise<string> {
    // Fallback: schedule the workflow body as a scheduled action so the
    // chain executes end-to-end during development. The real workflow
    // component provides exactly-once, resumable semantics; the scheduler
    // is at-least-once but bodies are idempotent by design (Strategy
    // C-prime + preCheck re-reads the row).
    const id = await ctx.scheduler.runAfter(0, ref as never, args as never);
    return String(id);
  },
  async status(
    _ctx: unknown,
    _workflowId: string,
  ): Promise<{ type: "inProgress" } | { type: "completed"; result: unknown }> {
    // Real component exposes status; scheduler stand-in always claims
    // inProgress so reconcileStuckWorkflows cron takes no action.
    return { type: "inProgress" };
  },
};
