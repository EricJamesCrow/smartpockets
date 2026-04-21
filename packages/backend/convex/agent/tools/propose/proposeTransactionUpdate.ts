import { v } from "convex/values";
import { agentMutation } from "../../functions";

/**
 * STUB for W2; W5 fills the real body.
 * Registry references this handler so `AGENT_TOOLS` compiles.
 */
export const proposeTransactionUpdate = agentMutation({
  args: {
    
    threadId: v.id("agentThreads"),
    plaidTransactionId: v.string(),
    overlay: v.any(),
  },
  returns: v.any(),
  handler: async () => {
    throw new Error(
      "not_yet_implemented: W5 ships propose_transaction_update body",
    );
  },
});
