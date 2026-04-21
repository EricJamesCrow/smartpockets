import { v } from "convex/values";
import { internalMutation } from "../functions";

/**
 * SCAFFOLD ONLY at M3: `search_transactions` is deferred per
 * specs/00-contracts.md §2.4 and specs/W2-agent-backend.md §3.5.
 * These handlers log and no-op. Post-M3, a follow-up PR wires them to
 * `components.rag.add(...)` / `components.rag.delete(...)`.
 */

export const embedTransactionForRag = internalMutation({
  args: {
    userId: v.id("users"),
    plaidTransactionId: v.string(),
    text: v.string(),
    pendingDate: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    console.debug("[rag-scaffold] embedTransactionForRag called; ignored at MVP", {
      plaidTransactionId: args.plaidTransactionId,
      textLength: args.text.length,
    });
    return null;
  },
});

export const deleteTransactionFromRag = internalMutation({
  args: {
    userId: v.id("users"),
    plaidTransactionId: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    console.debug("[rag-scaffold] deleteTransactionFromRag called; ignored at MVP", args);
    return null;
  },
});
