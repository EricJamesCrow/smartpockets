import { v } from "convex/values";
import { internalMutation, internalQuery } from "../functions";
import { PROMPT_VERSION, SYSTEM_PROMPT_MD } from "../agent/system";
import {
  AGENT_CLASSIFIER_MODEL,
  AGENT_DEFAULT_MODEL,
} from "../agent/config";

/**
 * Run once: `npx convex run migrations.seedPromptVersion:seed`.
 * Idempotent by version string; second run is a no-op.
 */
export const seed = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const rows = await ctx.table("promptVersions", "by_version", (q) =>
      q.eq("version", PROMPT_VERSION),
    );
    if (rows.length > 0) return null;
    await ctx.table("promptVersions").insert({
      version: PROMPT_VERSION,
      systemPromptMd: SYSTEM_PROMPT_MD,
      modelDefault: AGENT_DEFAULT_MODEL,
      modelClassifier: AGENT_CLASSIFIER_MODEL,
      activatedAt: Date.now(),
      notes: "Initial W2 prompt.",
    });
    return null;
  },
});

/**
 * Used by the prompt-drift lint (W2.09). Returns the most recently activated
 * promptVersions row; undefined if none seeded.
 */
export const dumpCurrent = internalQuery({
  args: {},
  returns: v.optional(v.any()),
  handler: async (ctx) => {
    const rows = await ctx
      .table("promptVersions", "by_activatedAt")
      .order("desc");
    return rows[0] ?? undefined;
  },
});
