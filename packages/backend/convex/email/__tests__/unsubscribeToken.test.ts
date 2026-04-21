import { describe, it, expect } from "vitest";
import { signUnsubscribeToken, verifyUnsubscribeToken } from "../unsubscribeToken";

describe("unsubscribe token", () => {
  const key =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  it("signs and verifies a fresh token", () => {
    const token = signUnsubscribeToken(
      { userId: "u1", templateKey: "weekly-digest" },
      key,
    );
    const verified = verifyUnsubscribeToken(token, key);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.data.userId).toBe("u1");
      expect(verified.data.templateKey).toBe("weekly-digest");
      expect(verified.data.expired).toBe(false);
    }
  });

  it("rejects an invalid signature", () => {
    const token = signUnsubscribeToken(
      { userId: "u1", templateKey: "weekly-digest" },
      key,
    );
    const tampered = token.slice(0, -5) + "XXXXX";
    const verified = verifyUnsubscribeToken(tampered, key);
    expect(verified.ok).toBe(false);
  });

  it("rejects malformed tokens", () => {
    const verified = verifyUnsubscribeToken("not-a-token", key);
    expect(verified.ok).toBe(false);
    if (!verified.ok) {
      expect(verified.reason).toBe("malformed");
    }
  });

  it("marks expired but still verifiable after 30 days", () => {
    const expiredTs = Date.now() - 40 * 24 * 60 * 60 * 1000;
    const expiredToken = signUnsubscribeToken(
      { userId: "u1", templateKey: "weekly-digest", ts: expiredTs },
      key,
    );
    const verified = verifyUnsubscribeToken(expiredToken, key);
    expect(verified.ok).toBe(true);
    if (verified.ok) expect(verified.data.expired).toBe(true);
  });
});
