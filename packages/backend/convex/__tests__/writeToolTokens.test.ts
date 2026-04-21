import { describe, expect, it } from "vitest";
import {
  base32Decode,
  base32Encode,
  decodeReversalToken,
  encodeReversalToken,
  isUniqueConstraintError,
} from "../agent/writeTool";

describe("W5 reversal token codec", () => {
  it("round-trips arbitrary Convex-id-shaped strings", () => {
    const ids = [
      "audit_log:abc123",
      "jx7a9q2kxc5m2hv3m8rmm4qevs74f5pe",
      "k123_456_789",
    ];
    for (const id of ids) {
      const token = encodeReversalToken(id);
      expect(token).toMatch(/^rev_[a-z2-7]+$/);
      expect(decodeReversalToken(token)).toBe(id);
    }
  });

  it("rejects tokens without the rev_ prefix", () => {
    expect(() => decodeReversalToken("abc")).toThrow(
      /reversal_token_invalid_prefix/,
    );
  });

  it("rejects tokens with non-base32 characters", () => {
    expect(() => decodeReversalToken("rev_0189")).toThrow(
      /invalid_base32_character/,
    );
  });

  it("base32 encode/decode round-trips non-ASCII text", () => {
    const inputs = ["", "a", "hello", "Audit-42 ☕"];
    for (const s of inputs) {
      expect(base32Decode(base32Encode(s))).toBe(s);
    }
  });
});

describe("W5 isUniqueConstraintError", () => {
  it("returns true for Ents-style unique throws", () => {
    for (const msg of [
      "UniqueConstraintError: contentHash already exists",
      "Failed due to unique constraint on contentHash",
      "Uniqueness violation on agentProposals.contentHash",
    ]) {
      expect(isUniqueConstraintError(new Error(msg))).toBe(true);
    }
  });

  it("returns false for unrelated errors", () => {
    expect(isUniqueConstraintError(new Error("not_authorized"))).toBe(false);
    expect(isUniqueConstraintError("string")).toBe(false);
    expect(isUniqueConstraintError(null)).toBe(false);
  });
});
