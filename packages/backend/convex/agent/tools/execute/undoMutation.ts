import { v } from "convex/values";
import { agentMutation } from "../../functions";
import { undoByToken } from "../../writeTool";

/**
 * W5 undo_mutation: decodes the opaque `rev_<base32>` token, verifies
 * ownership and the 10-minute window, dispatches to the reversal
 * handler registered for the audit row's toolName, writes a mirrored
 * `auditLog` row with `reversalOfAuditId` set, and transitions the
 * proposal to `reverted`. Per-tool reversal handlers register via
 * `registerReversal` at import time (populated as propose tools land).
 */
export const undoMutation = agentMutation({
  args: {
    threadId: v.id("agentThreads"),
    reversalToken: v.string(),
  },
  returns: v.object({
    summary: v.string(),
    state: v.literal("reverted"),
    revertedAt: v.number(),
    alreadyReverted: v.optional(v.boolean()),
  }),
  handler: async (ctx, { threadId, reversalToken }) => {
    const result = await undoByToken(ctx, { reversalToken, threadId });
    return {
      summary: result.summary,
      state: result.state,
      revertedAt: result.revertedAt,
      alreadyReverted: result.alreadyReverted,
    };
  },
});
