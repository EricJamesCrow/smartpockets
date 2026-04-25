import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../functions";
import { internal } from "../_generated/api";
import { DESTRUCTIVE_TOOLS } from "./writeTool";

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
  args: {
    proposalId: v.id("agentProposals"),
    // Trusted signal from W3's destructive second-click modal. This arg is
    // reachable only through the user-triggered confirm mutation; the LLM
    // cannot set it via tool args. executeWriteTool reads the persisted
    // proposal field, not a tool-args flag.
    confirmDestructive: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, { proposalId, confirmDestructive }) => {
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
    if (
      DESTRUCTIVE_TOOLS.has(proposal.toolName) &&
      confirmDestructive !== true
    ) {
      throw new Error("destructive_unconfirmed");
    }
    await proposal.patch({
      state: "confirmed",
      userConfirmedDestructive: confirmDestructive === true ? true : undefined,
    });
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

// Internal: look up a proposal by its content hash. Used by Strategy C-prime
// dedup in the write-tool wrapper after a unique-constraint throw.
export const getByContentHash = internalQuery({
  args: { contentHash: v.string() },
  returns: v.any(),
  handler: async (ctx, { contentHash }) => {
    const rows = await ctx.table("agentProposals");
    return rows.find((p: { contentHash: string }) => p.contentHash === contentHash) ?? null;
  },
});

// Internal: fetch a proposal by id (no viewer scoping, used by workflow steps).
export const getById = internalQuery({
  args: { proposalId: v.id("agentProposals") },
  returns: v.any(),
  handler: async (ctx, { proposalId }) => {
    return await ctx.table("agentProposals").get(proposalId);
  },
});

// Internal state transitions used by the W5 write-tool wrapper and later by
// the bulk-execute workflow. CAS-safe: callers must read current state and
// only invoke the matching transition.

export const markExecuting = internalMutation({
  args: { proposalId: v.id("agentProposals") },
  returns: v.null(),
  handler: async (ctx, { proposalId }) => {
    const p = await ctx.table("agentProposals").getX(proposalId);
    if (p.state !== "confirmed") {
      throw new Error(`proposal_invalid_state: expected confirmed, got ${p.state}`);
    }
    await p.patch({ state: "executing" });
    return null;
  },
});

export const markExecuted = internalMutation({
  args: {
    proposalId: v.id("agentProposals"),
    undoExpiresAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { proposalId, undoExpiresAt }) => {
    const p = await ctx.table("agentProposals").getX(proposalId);
    if (p.state !== "executing") {
      throw new Error(`proposal_invalid_state: expected executing, got ${p.state}`);
    }
    await p.patch({
      state: "executed",
      executedAt: Date.now(),
      undoExpiresAt,
    });
    return null;
  },
});

export const markFailed = internalMutation({
  args: {
    proposalId: v.id("agentProposals"),
    errorJson: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { proposalId, errorJson }) => {
    const p = await ctx.table("agentProposals").getX(proposalId);
    if (p.state !== "executing" && p.state !== "confirmed") {
      throw new Error(`proposal_invalid_state: expected executing|confirmed, got ${p.state}`);
    }
    await p.patch({ state: "failed", errorJson });
    return null;
  },
});

export const markReverted = internalMutation({
  args: { proposalId: v.id("agentProposals") },
  returns: v.null(),
  handler: async (ctx, { proposalId }) => {
    const p = await ctx.table("agentProposals").getX(proposalId);
    if (p.state !== "executed") {
      throw new Error(`proposal_invalid_state: expected executed, got ${p.state}`);
    }
    await p.patch({ state: "reverted", revertedAt: Date.now() });
    return null;
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
