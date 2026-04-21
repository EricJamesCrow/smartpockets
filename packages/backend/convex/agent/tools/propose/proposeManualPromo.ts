import { v } from "convex/values";
import { agentMutation } from "../../functions";

export const proposeManualPromo = agentMutation({
  args: {
    
    threadId: v.id("agentThreads"),
    cardId: v.id("creditCards"),
    promo: v.any(),
  },
  returns: v.any(),
  handler: async () => {
    throw new Error(
      "not_yet_implemented: W5 ships propose_manual_promo body",
    );
  },
});
