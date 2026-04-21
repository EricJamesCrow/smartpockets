/**
 * W4: reasonCodeToUserCopy
 *
 * Validates every ReasonCode maps to a defined UserCopy object and that the
 * null-institution fallback is "your bank". Also verifies no em-dashes appear
 * in any copy string (repo rule).
 */

import { describe, expect, it } from "vitest";
import { reasonCodeToUserCopy } from "../plaid/errorTaxonomy";
import type { ReasonCode } from "@crowdevelopment/convex-plaid";

describe("reasonCodeToUserCopy", () => {
  it("healthy returns no-CTA copy", () => {
    const copy = reasonCodeToUserCopy("healthy", "Chase");
    expect(copy.title).toBe("Connected");
    expect(copy.ctaLabel).toBe(null);
  });

  it("auth_required_login uses Reconnect CTA", () => {
    const copy = reasonCodeToUserCopy("auth_required_login", "Chase");
    expect(copy.ctaLabel).toBe("Reconnect");
    expect(copy.description).toContain("Chase");
  });

  it("new_accounts_available uses Update accounts CTA", () => {
    const copy = reasonCodeToUserCopy("new_accounts_available", "Chase");
    expect(copy.ctaLabel).toBe("Update accounts");
  });

  it("null institutionName falls back to 'your bank'", () => {
    const copy = reasonCodeToUserCopy("auth_required_login", null);
    expect(copy.description).toContain("your bank");
    expect(copy.description).not.toContain("null");
  });

  it("empty institutionName falls back to 'your bank'", () => {
    const copy = reasonCodeToUserCopy("auth_required_login", "");
    expect(copy.description).toContain("your bank");
  });

  it("permanent_unknown uses Contact support CTA", () => {
    const copy = reasonCodeToUserCopy("permanent_unknown", "Chase");
    expect(copy.ctaLabel).toBe("Contact support");
  });

  const allReasons: ReadonlyArray<ReasonCode> = [
    "healthy",
    "syncing_initial",
    "syncing_incremental",
    "auth_required_login",
    "auth_required_expiration",
    "transient_circuit_open",
    "transient_institution_down",
    "transient_rate_limited",
    "permanent_invalid_token",
    "permanent_item_not_found",
    "permanent_no_accounts",
    "permanent_access_not_granted",
    "permanent_products_not_supported",
    "permanent_institution_unsupported",
    "permanent_revoked",
    "permanent_unknown",
    "new_accounts_available",
  ];

  for (const r of allReasons) {
    it(`returns a defined UserCopy for ${r}`, () => {
      const copy = reasonCodeToUserCopy(r, "TestBank");
      expect(copy.title).toBeTruthy();
      expect(copy.description).toBeTruthy();
      expect(typeof copy.ctaLabel === "string" || copy.ctaLabel === null).toBe(
        true,
      );
      // No em-dashes anywhere in copy (U+2014)
      expect(copy.title.includes("\u2014")).toBe(false);
      expect(copy.description.includes("\u2014")).toBe(false);
    });
  }
});
