import { describe, it, expect } from "vitest";
import { idempotencyKey } from "../hashing";

describe("idempotencyKey", () => {
  it("produces a stable 64-char hex string", () => {
    const key = idempotencyKey({
      userId: "user_abc",
      scope: "promo-warning",
      cadence: 30,
      ids: ["promo_1", "promo_2"],
      dateBucket: "2026-04-20",
    });
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is order-insensitive for ids", () => {
    const a = idempotencyKey({ userId: "u", scope: "s", ids: ["b", "a"] });
    const b = idempotencyKey({ userId: "u", scope: "s", ids: ["a", "b"] });
    expect(a).toBe(b);
  });

  it("distinguishes different scopes", () => {
    const a = idempotencyKey({ userId: "u", scope: "promo-warning" });
    const b = idempotencyKey({ userId: "u", scope: "statement-closing" });
    expect(a).not.toBe(b);
  });

  it("distinguishes different cadences", () => {
    const a = idempotencyKey({ userId: "u", scope: "promo-warning", cadence: 30 });
    const b = idempotencyKey({ userId: "u", scope: "promo-warning", cadence: 14 });
    expect(a).not.toBe(b);
  });

  it("distinguishes different date buckets", () => {
    const a = idempotencyKey({ userId: "u", scope: "s", dateBucket: "2026-04-20" });
    const b = idempotencyKey({ userId: "u", scope: "s", dateBucket: "2026-04-21" });
    expect(a).not.toBe(b);
  });

  it("distinguishes different threadIds (W5 scoping)", () => {
    const a = idempotencyKey({ userId: "u", scope: "propose_foo", threadId: "t1" });
    const b = idempotencyKey({ userId: "u", scope: "propose_foo", threadId: "t2" });
    expect(a).not.toBe(b);
  });

  it("handles absent cadence / ids / dateBucket / threadId", () => {
    const key = idempotencyKey({ userId: "u", scope: "welcome-class" });
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });
});
