import { v } from "convex/values";
import { agentQuery } from "../../functions";

// Real body. W3's ProposalConfirmCard subscribes via this endpoint.
export const getProposal = agentQuery({
  args: {
    
    proposalId: v.id("agentProposals"),
  },
  returns: v.any(),
  handler: async (ctx, { proposalId }) => {
    const viewer = ctx.viewerX();
    const proposal = await ctx.table("agentProposals").getX(proposalId);
    if (proposal.userId !== viewer._id) throw new Error("Not authorized");
    return {
      ids: [proposal._id],
      preview: {
        proposal,
        live: true,
        capturedAt: new Date().toISOString(),
      },
      window: undefined,
    };
  },
});
