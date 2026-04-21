import { v } from "convex/values";
import { agentMutation } from "../../functions";

export const proposeReminderCreate = agentMutation({
  args: {
    
    threadId: v.id("agentThreads"),
    reminder: v.any(),
  },
  returns: v.any(),
  handler: async () => {
    throw new Error(
      "not_yet_implemented: W5 ships propose_reminder_create body",
    );
  },
});
