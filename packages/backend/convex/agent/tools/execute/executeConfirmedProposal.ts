import { v } from "convex/values";
import { agentMutation } from "../../functions";
import { executeWriteTool } from "../../writeTool";

/**
 * W5 executor: dispatches to the per-tool executor registered via
 * `registerToolExecutor`, writes an `auditLog` row, transitions the
 * proposal to `executed`, and returns an opaque `rev_<base32>` token.
 *
 * Per-tool executors are imported by the tool registry at module-load
 * time and register themselves into the writeTool registry; when a
 * proposal's `toolName` has no registered executor the wrapper throws
 * `no_executor_registered` (expected until W5.5/W5.7/W5.8/W5.9 land).
 */
export const executeConfirmedProposal = agentMutation({
  args: {
    threadId: v.id("agentThreads"),
    proposalId: v.id("agentProposals"),
  },
  returns: v.union(
    v.object({
      reversalToken: v.string(),
      summary: v.string(),
      state: v.literal("executed"),
      executedAt: v.number(),
      undoExpiresAt: v.number(),
      alreadyExecuted: v.optional(v.boolean()),
    }),
    v.object({
      summary: v.string(),
      state: v.literal("failed"),
      error: v.string(),
    }),
  ),
  handler: async (ctx, { threadId, proposalId }) => {
    const result = await executeWriteTool(ctx, {
      proposalId,
      threadId,
    });
    if (result.state === "failed") {
      return result;
    }
    return {
      reversalToken: result.reversalToken,
      summary: result.summary,
      state: result.state,
      executedAt: result.executedAt,
      undoExpiresAt: result.undoExpiresAt,
      alreadyExecuted: result.alreadyExecuted,
    };
  },
});
