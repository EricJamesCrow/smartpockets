import { v } from "convex/values";
import { agentMutation } from "../../functions";

export const proposeBulkTransactionUpdate = agentMutation({
  args: {
    
    threadId: v.id("agentThreads"),
    filter: v.any(),
    overlay: v.any(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async () => {
    throw new Error(
      "not_yet_implemented: W5 ships propose_bulk_transaction_update body",
    );
  },
});
