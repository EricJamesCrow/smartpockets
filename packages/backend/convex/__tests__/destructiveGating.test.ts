/**
 * W5.11 destructive-action gating: the confirmation signal must come from
 * the trusted proposal row (set by the user-triggered `confirm` mutation),
 * never from LLM tool args. These tests pin that behavior against the
 * executeWriteTool implementation.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { agentLimiter } from "../agent/rateLimits";
import {
  DESTRUCTIVE_TOOLS,
  executeWriteTool,
  markDestructive,
  registerToolExecutor,
  unregisterToolExecutor,
} from "../agent/writeTool";

const TOOL = "propose_plaid_item_remove";

function makeCtx(opts: { proposal: any }) {
  const updates: Array<Record<string, unknown>> = [];
  const writableProposal = {
    ...opts.proposal,
    patch: async (patch: Record<string, unknown>) => {
      updates.push(patch);
      Object.assign(writableProposal, patch);
    },
  };
  return {
    ctx: {
      viewerX: () => ({ _id: opts.proposal.userId }),
      runMutation: async () => ({ ok: true }),
      table: (name: string) => {
        if (name === "agentProposals") {
          return { getX: async () => writableProposal };
        }
        if (name === "auditLog") {
          return {
            insert: async () => "audit_new",
          };
        }
        throw new Error(`unexpected table ${name}`);
      },
    },
    writableProposal,
    updates,
  };
}

describe("destructive-action gating", () => {
  const viewerId = "user_1";
  const threadId = "thread_1";
  const proposalId = "prop_1";
  let originalRateLimiterComponent: unknown;

  beforeEach(() => {
    originalRateLimiterComponent = (agentLimiter as any).component;
    (agentLimiter as any).component = { lib: { rateLimit: "rateLimit" } };
    markDestructive(TOOL);
    registerToolExecutor(TOOL, async () => ({
      reversalPayload: {},
      affectedIds: ["x"],
      summary: "Removed.",
    }));
  });

  afterEach(() => {
    (agentLimiter as any).component = originalRateLimiterComponent;
    (DESTRUCTIVE_TOOLS as Set<string>).delete(TOOL);
    unregisterToolExecutor(TOOL);
  });

  it("marks failed when proposal lacks the trusted flag", async () => {
    const { ctx, updates } = makeCtx({
      proposal: {
        _id: proposalId,
        userId: viewerId,
        agentThreadId: threadId,
        state: "confirmed",
        toolName: TOOL,
        argsJson: "{}",
        summaryText: "x",
        // NOTE: userConfirmedDestructive not set.
      },
    });

    const result = await executeWriteTool(ctx as any, {
      proposalId: proposalId as any,
      threadId: threadId as any,
    });

    expect(result).toEqual({
      summary: "x",
      state: "failed",
      error: "destructive_unconfirmed",
    });
    expect(updates).toContainEqual({
      state: "failed",
      errorJson: JSON.stringify({ message: "destructive_unconfirmed" }),
    });
  });

  it("proceeds when proposal.userConfirmedDestructive is true", async () => {
    const { ctx } = makeCtx({
      proposal: {
        _id: proposalId,
        userId: viewerId,
        agentThreadId: threadId,
        state: "confirmed",
        toolName: TOOL,
        argsJson: "{}",
        summaryText: "x",
        userConfirmedDestructive: true,
      },
    });

    const result = await executeWriteTool(ctx as any, {
      proposalId: proposalId as any,
      threadId: threadId as any,
    });
    expect(result.state).toBe("executed");
    expect(result.summary).toBe("Removed.");
  });

  it("an extra args flag has no effect on gating; trust comes from proposal row", async () => {
    const { ctx } = makeCtx({
      proposal: {
        _id: proposalId,
        userId: viewerId,
        agentThreadId: threadId,
        state: "confirmed",
        toolName: TOOL,
        argsJson: "{}",
        summaryText: "x",
      },
    });
    // Cast through unknown so the caller can't get past TS by sneaking in
    // a flag; runtime must still fail because the proposal row is missing
    // `userConfirmedDestructive`.
    const argsWithExtra = {
      proposalId,
      threadId,
      confirmDestructive: true,
    } as unknown as Parameters<typeof executeWriteTool>[1];

    await expect(executeWriteTool(ctx as any, argsWithExtra)).resolves.toMatchObject({
      state: "failed",
      error: "destructive_unconfirmed",
    });
  });
});
