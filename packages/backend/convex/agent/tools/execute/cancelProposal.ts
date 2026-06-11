import { v } from "convex/values";
import { agentMutation } from "../../functions";
import { assertAgentSideEffectsAllowed } from "../../writeTool";

// Agent-callable cancel; mirrors the user-facing agent/proposals.ts cancel
// logic (ownership check, awaiting_confirmation guard, idempotent on
// already-resolved proposals).
export const cancelProposal = agentMutation({
  args: {
    threadId: v.id("agentThreads"),
    proposalId: v.id("agentProposals"),
  },
  returns: v.any(),
  handler: async (ctx, { proposalId }) => {
    assertAgentSideEffectsAllowed();
    const viewer = ctx.viewerX();
    const proposal = await ctx.table("agentProposals").getX(proposalId);
    if (proposal.userId !== viewer._id) throw new Error("Not authorized");
    if (proposal.state !== "awaiting_confirmation") return proposal;
    await proposal.patch({ state: "cancelled" });
    return { ...proposal, state: "cancelled" };
  },
});
