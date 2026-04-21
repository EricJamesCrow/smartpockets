import { v } from "convex/values";
import { agentMutation } from "../../functions";

/**
 * STUB for W2; W5 ships the real body.
 * Runtime calls this from the `confirm` mutation's scheduler trigger.
 */
export const executeConfirmedProposal = agentMutation({
  args: {
    
    threadId: v.id("agentThreads"),
    proposalId: v.id("agentProposals"),
  },
  returns: v.any(),
  handler: async () => {
    throw new Error(
      "not_yet_implemented: W5 ships execute_confirmed_proposal body",
    );
  },
});
