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

export const workflow = new WorkflowManager(components.workflow);
