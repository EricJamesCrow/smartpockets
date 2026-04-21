/**
 * Workflow manager for W7 email sends.
 *
 * Backed by @convex-dev/workflow (installed by W2 per
 * packages/backend/convex/convex.config.ts). workflow.start returns
 * a durable WorkflowId; steps are journaled, so restarts resume from
 * the last completed step (exactly-once for mutation steps,
 * at-least-once for action steps).
 */
import { WorkflowManager } from "@convex-dev/workflow";
import { components } from "../_generated/api";

// `components.workflow` exists at runtime (W2's install lives in
// convex.config.ts) and in the fully-regenerated api.d.ts. The
// committed skeleton api.d.ts is intentionally smaller than the live
// generated surface, so we widen the cast here; the next real
// convex deploy regenerates the skeleton to include workflow.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const workflow = new WorkflowManager((components as any).workflow);
