/**
 * W5 executeWriteTool idempotency tests.
 *
 * Validates the retry branches added to writeTool.ts per W5 spec §7.2 / §15.6:
 *   - state === "executed" re-derives the reversal token from the existing
 *     auditLog row and returns `alreadyExecuted: true`.
 *   - state === "failed" returns the stored error message rather than
 *     re-running the executor.
 */

import { describe, expect, it } from "vitest";
import {
  encodeReversalToken,
  executeWriteTool,
  registerToolExecutor,
} from "../agent/writeTool";

type FakeAudit = {
  _id: string;
  executedAt: number;
  reversalOfAuditId?: string;
};

type FakeProposal = {
  _id: string;
  userId: string;
  agentThreadId: string;
  state: string;
  toolName: string;
  argsJson: string;
  summaryText: string;
  executedAt?: number;
  undoExpiresAt?: number;
  errorJson?: string;
  patch?: (fields: Partial<FakeProposal>) => Promise<void>;
};

function makeCtx(opts: {
  viewerId: string;
  proposal: FakeProposal;
  auditsByProposal: Map<string, FakeAudit[]>;
}) {
  return {
    viewerX: () => ({ _id: opts.viewerId }),
    table: (name: string, _indexName?: string, q?: (qb: any) => any) => {
      if (name === "agentProposals") {
        return {
          getX: async (_id: string) => opts.proposal,
        };
      }
      if (name === "auditLog") {
        const rows = opts.auditsByProposal.get(opts.proposal._id) ?? [];
        if (q) {
          let capturedProposalId: string | undefined;
          q({
            eq: (field: string, val: string) => {
              if (field === "proposalId") capturedProposalId = val;
              return {};
            },
          });
          return rows.filter((a) => a != null && capturedProposalId);
        }
        return rows;
      }
      throw new Error(`unexpected table ${name}`);
    },
  };
}

describe("executeWriteTool idempotency", () => {
  const viewerId = "user_abc";
  const proposalId = "prop_xyz";
  const threadId = "thread_123";
  const auditId = "audit_1";

  it("returns the original reversal token on retry when state is executed", async () => {
    const proposal: FakeProposal = {
      _id: proposalId,
      userId: viewerId,
      agentThreadId: threadId,
      state: "executed",
      toolName: "propose_transaction_update",
      argsJson: "{}",
      summaryText: "Updated 1 transaction",
      executedAt: 1_000_000,
      undoExpiresAt: 1_000_000 + 10 * 60 * 1000,
    };
    const audits = new Map<string, FakeAudit[]>([
      [proposalId, [{ _id: auditId, executedAt: 1_000_000 }]],
    ]);
    const ctx = makeCtx({ viewerId, proposal, auditsByProposal: audits });

    const result = await executeWriteTool(ctx as any, {
      proposalId: proposalId as any,
      threadId: threadId as any,
    });

    if (result.state !== "executed") throw new Error("expected executed");
    expect(result.alreadyExecuted).toBe(true);
    expect(result.reversalToken).toBe(encodeReversalToken(auditId));
    expect(result.executedAt).toBe(1_000_000);
    expect(result.undoExpiresAt).toBe(1_000_000 + 10 * 60 * 1000);
    expect(result.summary).toBe("Updated 1 transaction");
  });

  it("ignores undo mirror rows when finding the original audit", async () => {
    const proposal: FakeProposal = {
      _id: proposalId,
      userId: viewerId,
      agentThreadId: threadId,
      state: "executed",
      toolName: "propose_transaction_update",
      argsJson: "{}",
      summaryText: "x",
      executedAt: 1_000_000,
      undoExpiresAt: 1_000_000 + 10 * 60 * 1000,
    };
    const audits = new Map<string, FakeAudit[]>([
      [
        proposalId,
        [
          { _id: "audit_mirror", executedAt: 2_000_000, reversalOfAuditId: auditId },
          { _id: auditId, executedAt: 1_000_000 },
        ],
      ],
    ]);
    const ctx = makeCtx({ viewerId, proposal, auditsByProposal: audits });

    const result = await executeWriteTool(ctx as any, {
      proposalId: proposalId as any,
      threadId: threadId as any,
    });

    if (result.state !== "executed") throw new Error("expected executed");
    expect(result.reversalToken).toBe(encodeReversalToken(auditId));
  });

  it("returns stored error on retry when state is failed", async () => {
    const proposal: FakeProposal = {
      _id: proposalId,
      userId: viewerId,
      agentThreadId: threadId,
      state: "failed",
      toolName: "propose_transaction_update",
      argsJson: "{}",
      summaryText: "x",
      errorJson: JSON.stringify({ message: "downstream_timeout" }),
    };
    const ctx = makeCtx({
      viewerId,
      proposal,
      auditsByProposal: new Map(),
    });

    const result = await executeWriteTool(ctx as any, {
      proposalId: proposalId as any,
      threadId: threadId as any,
    });

    expect(result).toEqual({
      summary: "x",
      state: "failed",
      error: "downstream_timeout",
    });
  });

  it("persists failed state when an executor throws", async () => {
    const proposal: FakeProposal = {
      _id: proposalId,
      userId: viewerId,
      agentThreadId: threadId,
      state: "confirmed",
      toolName: "test_failing_execute_tool",
      argsJson: "{}",
      summaryText: "x",
    };
    proposal.patch = async (fields) => {
      Object.assign(proposal, fields);
    };
    registerToolExecutor(proposal.toolName, async () => {
      throw new Error("executor_failed");
    });
    const ctx = makeCtx({
      viewerId,
      proposal,
      auditsByProposal: new Map(),
    });

    const result = await executeWriteTool(ctx as any, {
      proposalId: proposalId as any,
      threadId: threadId as any,
    });

    expect(result).toEqual({
      summary: "x",
      state: "failed",
      error: "executor_failed",
    });
    expect(proposal.state).toBe("failed");
    expect(proposal.errorJson).toBe(JSON.stringify({ message: "executor_failed" }));
  });

  it("rejects when thread does not match proposal", async () => {
    const proposal: FakeProposal = {
      _id: proposalId,
      userId: viewerId,
      agentThreadId: "thread_other",
      state: "confirmed",
      toolName: "propose_transaction_update",
      argsJson: "{}",
      summaryText: "x",
    };
    const ctx = makeCtx({
      viewerId,
      proposal,
      auditsByProposal: new Map(),
    });

    await expect(
      executeWriteTool(ctx as any, {
        proposalId: proposalId as any,
        threadId: threadId as any,
      }),
    ).rejects.toThrow(/thread mismatch/);
  });
});
