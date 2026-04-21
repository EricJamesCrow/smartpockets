/**
 * W4: countActivePlaidItems internal query
 *
 * Validates the welcome-onboarding trigger pre-check used by
 * exchangePublicTokenAction per contracts §13. The zero-case covered
 * here; full mixed-status cases are covered by the W4.9 integration
 * tests that replay webhook fixtures.
 */

import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { internal } from "../_generated/api";
// Import the component schema directly (source) so we can register it for tests.
import plaidSchema from "../../../convex-plaid/src/component/schema";

const modules = import.meta.glob("../**/*.ts");
const plaidModules = import.meta.glob(
  "../../../convex-plaid/src/component/**/*.ts",
);

function setup() {
  const t = convexTest(schema, modules);
  t.registerComponent("plaid", plaidSchema, plaidModules);
  return t;
}

describe("countActivePlaidItems", () => {
  it("returns 0 for a user with no plaidItems", async () => {
    const t = setup();
    const n = await t.query(internal.users.countActivePlaidItems, {
      userId: "user_new",
    });
    expect(n).toBe(0);
  });
});
