import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../functions";
import { internal } from "../_generated/api";

// Public query: used by W1 to render `ProposalConfirmCard` inline in the stream.
export const listOpenProposals = query({
  args: { threadId: v.id("agentThreads") },
  returns: v.array(v.any()),
  handler: async (ctx, { threadId }) => {
    const viewer = ctx.viewerX();
    const thread = await ctx.table("agentThreads").getX(threadId);
    if (thread.userId !== viewer._id) throw new Error("Not authorized");
    return await ctx.table("agentProposals", "by_thread_state", (q) =>
      q.eq("agentThreadId", threadId).eq("state", "awaiting_confirmation"),
    );
  },
});

// Public query: single-proposal subscription.
export const get = query({
  args: { proposalId: v.id("agentProposals") },
  returns: v.any(),
  handler: async (ctx, { proposalId }) => {
    const viewer = ctx.viewerX();
    const proposal = await ctx.table("agentProposals").getX(proposalId);
    if (proposal.userId !== viewer._id) throw new Error("Not authorized");
    return proposal;
  },
});

// Public mutation: user clicks Confirm. CAS-safe (idempotent on non-awaiting states).
export const confirm = mutation({
  args: { proposalId: v.id("agentProposals") },
  returns: v.any(),
  handler: async (ctx, { proposalId }) => {
    const viewer = ctx.viewerX();
    const proposal = await ctx.table("agentProposals").getX(proposalId);
    if (proposal.userId !== viewer._id) throw new Error("Not authorized");
    if (proposal.state !== "awaiting_confirmation") {
      return proposal;
    }
    if (Date.now() > proposal.awaitingExpiresAt) {
      await proposal.patch({ state: "timed_out" });
      throw new Error("proposal_timed_out");
    }
    await proposal.patch({ state: "confirmed" });
    // W2.11 stubs the executor; W5 fills the body.
    await ctx.scheduler.runAfter(
      0,
      (internal as any).agent.tools.execute.executeConfirmedProposal
        .executeConfirmedProposal,
      {
        userId: viewer._id,
        proposalId,
        threadId: proposal.agentThreadId,
      },
    );
    return { ...proposal, state: "confirmed" };
  },
});

// Public mutation: user clicks Cancel. CAS-safe.
export const cancel = mutation({
  args: { proposalId: v.id("agentProposals") },
  returns: v.any(),
  handler: async (ctx, { proposalId }) => {
    const viewer = ctx.viewerX();
    const proposal = await ctx.table("agentProposals").getX(proposalId);
    if (proposal.userId !== viewer._id) throw new Error("Not authorized");
    if (proposal.state !== "awaiting_confirmation") return proposal;
    await proposal.patch({ state: "cancelled" });
    return { ...proposal, state: "cancelled" };
  },
});

// Internal: used by W5 write-tool wrapper to enforce first-turn-read-before-write.
export const checkFirstTurnGuard = internalQuery({
  args: { threadId: v.id("agentThreads") },
  returns: v.object({ ok: v.boolean(), reason: v.string() }),
  handler: async (ctx, { threadId }) => {
    const thread = await ctx.table("agentThreads").getX(threadId);
    if (thread.readCallCount < 1) {
      return {
        ok: false,
        reason: "Make a read call before proposing a write.",
      };
    }
    return { ok: true, reason: "" };
  },
});

// Internal: used by context composer.
export const countOpenForThreadInternal = internalQuery({
  args: { threadId: v.id("agentThreads") },
  returns: v.number(),
  handler: async (ctx, { threadId }) => {
    const rows = await ctx.table("agentProposals", "by_thread_state", (q) =>
      q.eq("agentThreadId", threadId).eq("state", "awaiting_confirmation"),
    );
    return rows.length;
  },
});

// TTL cron handler. Scans all awaiting proposals; at MVP volumes (< 1k rows)
// the full-table scan is acceptable. Post-M3 follow-up: add
// `by_state_awaitingExpiresAt` index and switch to range query.
export const expireStaleInternal = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const allProposals = await ctx.table("agentProposals");
    const expired = allProposals.filter(
      (p: { state: string; awaitingExpiresAt: number }) =>
        p.state === "awaiting_confirmation" && p.awaitingExpiresAt < now,
    );
    for (const p of expired) {
      const writable = await ctx.table("agentProposals").getX(p._id);
      await writable.patch({ state: "timed_out" });
      await ctx.table("agentMessages").insert({
        agentThreadId: p.agentThreadId,
        role: "system",
        text: `Proposal timed out (${p.toolName}).`,
        createdAt: now,
        isStreaming: false,
      });
    }
    return null;
  },
});
