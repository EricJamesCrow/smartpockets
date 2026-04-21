import { v } from "convex/values";
import { internalAction } from "../_generated/server";

/**
 * STUB for W2.06. Replaced by the real implementation in W2.10 once the
 * tool registry and @convex-dev/agent streamText wiring land.
 */
export const runAgentTurn = internalAction({
  args: {
    userId: v.id("users"),
    threadId: v.id("agentThreads"),
    userMessageId: v.id("agentMessages"),
  },
  returns: v.null(),
  handler: async () => {
    console.log("runAgentTurn stub; replaced by W2.10");
    return null;
  },
});
