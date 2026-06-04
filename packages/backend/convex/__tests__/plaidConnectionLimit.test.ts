import { describe, expect, it } from "vitest";
import { plaidHeadroomDecision } from "../billing/plaidLimit";

describe("plaidHeadroomDecision", () => {
  it("free: ok at 0 connections, blocked at 1", () => {
    expect(plaidHeadroomDecision("free", 0).ok).toBe(true);
    const r = plaidHeadroomDecision("free", 1);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("plaid_connection_limit");
      expect(r.limit).toBe(1);
      expect(r.used).toBe(1);
    }
  });
  it("pro: ok at 4, blocked at 5", () => {
    expect(plaidHeadroomDecision("pro", 4).ok).toBe(true);
    expect(plaidHeadroomDecision("pro", 5).ok).toBe(false);
  });
  it("unlimited: always ok", () => {
    expect(plaidHeadroomDecision("unlimited", 999).ok).toBe(true);
  });
});
