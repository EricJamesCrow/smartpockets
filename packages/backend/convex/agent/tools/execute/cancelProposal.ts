import { v } from "convex/values";
import { agentMutation } from "../../functions";

// W2.12 stub; real body in W2.12 mirrors the agent/proposals.ts cancel logic.
export const cancelProposal = agentMutation({
  args: {
    
    threadId: v.id("agentThreads"),
    proposalId: v.id("agentProposals"),
  },
  returns: v.any(),
  handler: async (ctx, { proposalId }) => {
    const viewer = ctx.viewerX();
    const proposal = await ctx.table("agentProposals").getX(proposalId);
    if (proposal.userId !== viewer._id) throw new Error("Not authorized");
    if (proposal.state !== "awaiting_confirmation") return proposal;
    await proposal.patch({ state: "cancelled" });
    return { ...proposal, state: "cancelled" };
  },
});
