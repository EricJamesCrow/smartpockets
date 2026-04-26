import { v } from "convex/values";
import { agentMutation } from "../../functions";
import { executeWriteTool } from "../../writeTool";
import "../propose/proposeBulkTransactionUpdate";
import "../propose/proposeCreditCardMetadataUpdate";
import "../propose/proposeManualPromo";
import "../propose/proposeReminderCreate";
import "../propose/proposeReminderDelete";
import "../propose/proposeTransactionUpdate";

/**
 * W5 executor: dispatches to the per-tool executor registered via
 * `registerToolExecutor`, writes an `auditLog` row, transitions the
 * proposal to `executed`, and returns an opaque `rev_<base32>` token.
 *
 * Per-tool executors register themselves through import side effects. Convex
 * function modules load independently, so the execute entrypoint imports the
 * propose modules explicitly before dispatching.
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
