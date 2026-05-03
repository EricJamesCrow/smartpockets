/**
 * CROWDEV-351: automatic thread titling after the first turn.
 *
 * After the first user/assistant exchange in a thread, the runtime schedules
 * `generateThreadTitle({ threadId })` (this file). The action:
 *
 *   1. Reads the thread row. Bails out if a title is already set so we never
 *      stomp a manual rename or a previously-generated title.
 *   2. Loads the first user message + first assistant text response.
 *   3. Calls Haiku via `generateText` with a tight system prompt asking for a
 *      3-5 word title. Falls back silently on any error so a titling failure
 *      cannot break the rest of the agent flow.
 *   4. Patches `agentThreads.title` via `setTitleIfUnset` (this file). The
 *      mutation re-checks the skip-if-set guard atomically to handle the
 *      race where a manual rename lands between the action's read and write.
 *
 * Uses the default agent model (`AGENT_MODEL_DEFAULT`, set to Haiku on dev)
 * — titling does not need Sonnet quality and we want it cheap + fast.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { internalMutation } from "../functions";
import { AGENT_DEFAULT_MODEL, getAnthropicModel } from "./config";

const MAX_TITLE_CHARS = 60;
const TITLE_INPUT_CHAR_CAP = 2_000;

function sanitizeTitle(raw: string): string {
  // Models sometimes return wrapped quotes, leading "Title:" prefixes, or
  // trailing punctuation. Strip those defensively before saving.
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^title\s*[:\-]\s*/i, "");
  cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, "");
  cleaned = cleaned.replace(/[\r\n]+/g, " ").trim();
  // Strip a trailing period only — preserve question marks and exclamation
  // marks since they can be part of the title intent.
  cleaned = cleaned.replace(/\.+$/, "");
  return cleaned.slice(0, MAX_TITLE_CHARS).trim();
}

/**
 * Internal: patch the thread title only when none is set. Re-checks the
 * skip-if-set guard atomically inside the mutation so a manual rename that
 * lands between the action's read and the action's write cannot be stomped.
 */
export const setTitleIfUnset = internalMutation({
  args: {
    threadId: v.id("agentThreads"),
    title: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, { threadId, title }) => {
    const trimmed = title.trim();
    if (!trimmed) return false;
    const thread = await ctx.table("agentThreads").get(threadId);
    if (!thread) return false;
    if (thread.title && thread.title.length > 0) return false;
    await thread.patch({ title: trimmed.slice(0, MAX_TITLE_CHARS) });
    return true;
  },
});

/**
 * Internal action: generate a 3-5 word title for a thread from its first
 * user/assistant exchange. No-ops if the title is already set.
 *
 * Scheduled by `runAgentTurn` after the first assistant response completes.
 * Errors are swallowed and logged — titling is best-effort polish, never a
 * hard requirement for the chat flow to succeed.
 */
export const generateThreadTitle = internalAction({
  args: { threadId: v.id("agentThreads") },
  returns: v.null(),
  handler: async (ctx, { threadId }) => {
    try {
      const thread: { title?: string } = await ctx.runQuery(
        internal.agent.threads.getForRun,
        { threadId },
      );
      if (thread.title && thread.title.length > 0) return null;

      const messages: Array<{ role: string; text?: string }> = await ctx.runQuery(
        internal.agent.threads.listMessagesInternal,
        { threadId },
      );

      const firstUser = messages.find(
        (m) => m.role === "user" && typeof m.text === "string" && m.text.trim().length > 0,
      );
      const firstAssistant = messages.find(
        (m) => m.role === "assistant" && typeof m.text === "string" && m.text.trim().length > 0,
      );

      // Need at least the user prompt to title from. If the assistant
      // response is missing (e.g., scheduled too eagerly, run aborted),
      // skip — we'll get another shot on the next turn.
      if (!firstUser || !firstUser.text) return null;

      const userText = firstUser.text.slice(0, TITLE_INPUT_CHAR_CAP);
      const assistantText = (firstAssistant?.text ?? "").slice(0, TITLE_INPUT_CHAR_CAP);

      const { generateText } = await import("ai");
      const modelId = process.env.AGENT_MODEL_DEFAULT ?? AGENT_DEFAULT_MODEL;

      const result = await generateText({
        model: getAnthropicModel(modelId) as any,
        system:
          "Generate a concise 3-5 word title for this conversation. " +
          "Return only the title text — no quotes, no prefix, no punctuation at the end. " +
          "Use title case. Focus on the user's intent or topic.",
        messages: [
          {
            role: "user",
            content:
              `User message:\n${userText}\n\n` +
              (assistantText
                ? `Assistant response:\n${assistantText}\n\n`
                : "") +
              `Title:`,
          },
        ],
      } as any);

      const rawTitle = (result as any).text ?? "";
      const cleaned = sanitizeTitle(String(rawTitle));
      if (!cleaned) return null;

      await ctx.runMutation(internal.agent.titling.setTitleIfUnset, {
        threadId,
        title: cleaned,
      });
    } catch (err) {
      console.warn("[agent.titling] generateThreadTitle skipped:", err);
    }
    return null;
  },
});
