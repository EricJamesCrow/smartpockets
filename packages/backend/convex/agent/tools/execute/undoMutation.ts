import { v } from "convex/values";
import { agentMutation } from "../../functions";

/**
 * STUB for W2. W5 ships the body that decodes `reversalToken`,
 * verifies ownership, checks `undoExpiresAt`, and applies the reversal.
 */
export const undoMutation = agentMutation({
  args: {
    
    threadId: v.id("agentThreads"),
    reversalToken: v.string(),
  },
  returns: v.any(),
  handler: async () => {
    throw new Error(
      "not_yet_implemented: W5 ships undo_mutation body",
    );
  },
});
