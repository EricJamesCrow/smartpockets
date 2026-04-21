import { v } from "convex/values";
import { agentMutation } from "../../functions";

export const proposeReminderDelete = agentMutation({
  args: {
    
    threadId: v.id("agentThreads"),
    reminderId: v.id("reminders"),
  },
  returns: v.any(),
  handler: async () => {
    throw new Error(
      "not_yet_implemented: W5 ships propose_reminder_delete body",
    );
  },
});
