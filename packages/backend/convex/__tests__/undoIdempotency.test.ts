/**
 * W5 undoByToken idempotency test.
 *
 * A second undo call on an already-reverted audit row must return a
 * consistent success envelope (state: "reverted", alreadyReverted: true)
 * rather than throw "already_reverted". Per W5 review criteria.
 */

import { describe, expect, it } from "vitest";
import {
  encodeReversalToken,
  undoByToken,
} from "../agent/writeTool";

type FakeAudit = {
  _id: string;
  userId: string;
  toolName: string;
  executedAt: number;
  reversedAt?: number;
  proposalId: string;
  inputArgsJson: string;
  affectedIdsJson: string;
};

function makeCtx(opts: { viewerId: string; audit: FakeAudit }) {
  return {
    viewerX: () => ({ _id: opts.viewerId }),
    table: (name: string) => {
      if (name === "auditLog") {
        return {
          get: async (_id: string) => opts.audit,
        };
      }
      throw new Error(`unexpected table ${name}`);
    },
  };
}

describe("undoByToken idempotency", () => {
  it("returns alreadyReverted envelope when audit is already reversed", async () => {
    const auditId = "audit_abc";
    const audit: FakeAudit = {
      _id: auditId,
      userId: "user_1",
      toolName: "propose_transaction_update",
      executedAt: 1_000_000,
      reversedAt: 1_000_500,
      proposalId: "prop_1",
      inputArgsJson: "{}",
      affectedIdsJson: "[]",
    };
    const ctx = makeCtx({ viewerId: "user_1", audit });

    const result = await undoByToken(ctx as any, {
      reversalToken: encodeReversalToken(auditId),
      threadId: "thread_1" as any,
    });

    expect(result.alreadyReverted).toBe(true);
    expect(result.state).toBe("reverted");
    expect(result.revertedAt).toBe(1_000_500);
    expect(result.undoAuditLogId).toBeNull();
    expect(result.auditLogId).toBe(auditId);
  });

  it("rejects unknown tokens with reversal_token_not_found", async () => {
    const ctx = {
      viewerX: () => ({ _id: "user_1" }),
      table: () => ({ get: async () => null }),
    };
    await expect(
      undoByToken(ctx as any, {
        reversalToken: encodeReversalToken("nope"),
        threadId: "thread_1" as any,
      }),
    ).rejects.toThrow(/reversal_token_not_found/);
  });

  it("rejects tokens owned by another user", async () => {
    const auditId = "audit_x";
    const audit: FakeAudit = {
      _id: auditId,
      userId: "user_other",
      toolName: "propose_transaction_update",
      executedAt: 1_000_000,
      proposalId: "prop_1",
      inputArgsJson: "{}",
      affectedIdsJson: "[]",
    };
    const ctx = makeCtx({ viewerId: "user_1", audit });

    await expect(
      undoByToken(ctx as any, {
        reversalToken: encodeReversalToken(auditId),
        threadId: "thread_1" as any,
      }),
    ).rejects.toThrow(/reversal_token_not_found/);
  });
});
