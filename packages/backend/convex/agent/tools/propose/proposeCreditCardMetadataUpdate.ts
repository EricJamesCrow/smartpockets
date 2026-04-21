import { v } from "convex/values";
import { agentMutation } from "../../functions";

export const proposeCreditCardMetadataUpdate = agentMutation({
  args: {
    
    threadId: v.id("agentThreads"),
    cardId: v.id("creditCards"),
    update: v.any(),
  },
  returns: v.any(),
  handler: async () => {
    throw new Error(
      "not_yet_implemented: W5 ships propose_credit_card_metadata_update body",
    );
  },
});
