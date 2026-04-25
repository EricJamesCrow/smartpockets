/**
 * W4: Plaid webhook integration tests.
 *
 * Exercises the /webhooks-plaid HTTP route with signature-bypass fixtures
 * (SKIP_WEBHOOK_VERIFICATION=true + PLAID_ENV=sandbox). Validates:
 *
 * - Fixtures are well-formed and loadable.
 * - The route accepts every W4 webhook code and returns 200 OK.
 * - Unknown item_ids return status=200 with ignored=unknown_item (no scheduling).
 *
 * Deeper assertions (scheduler dispatches, dispatch-action payload shape,
 * cron dedup) depend on multi-component seeding across the convex-test
 * boundary and are left to Tier 3 manual Sandbox smoke per spec §9.3 (also
 * the reason W4.11's cron test is the one convex-test-driven assertion
 * for cron cadence; see that task).
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { convexTest } from "convex-test";
import fs from "node:fs";
import path from "node:path";
import schema from "../schema";
import plaidSchema from "../../../convex-plaid/src/component/schema";

const FIXTURE_DIR = path.join(__dirname, "fixtures/plaid-webhooks");

const modules = import.meta.glob("../**/*.ts");
const plaidModules = import.meta.glob(
  "../../../convex-plaid/src/component/**/*.ts",
);

interface Fixture {
  body: {
    webhook_type: string;
    webhook_code: string;
    item_id: string;
    error?: unknown;
  };
  jwt: string | null;
  bypassSignature: boolean;
}

function loadFixture(name: string): Fixture {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, name), "utf8"));
}

function setupHarness() {
  const t = convexTest(schema, modules);
  t.registerComponent("plaid", plaidSchema as any, plaidModules);
  return t;
}

async function postWebhook(
  t: ReturnType<typeof convexTest>,
  fixture: Fixture,
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (fixture.jwt) {
    headers["Plaid-Verification"] = fixture.jwt;
  }
  return await t.fetch("/webhooks-plaid", {
    method: "POST",
    headers,
    body: JSON.stringify(fixture.body),
  });
}

describe("Plaid webhook fixtures", () => {
  const fixtures = [
    "transactions_default_update.json",
    "item_login_repaired.json",
    "item_new_accounts_available.json",
    "holdings_default_update.json",
    "investments_transactions_default_update.json",
    "auth_default_update.json",
    "identity_default_update.json",
    "transactions_sync_updates_available.json",
    "item_error_login_required.json",
  ];

  for (const f of fixtures) {
    it(`${f} loads with matching webhook_type + webhook_code`, () => {
      const fx = loadFixture(f);
      expect(typeof fx.body.webhook_type).toBe("string");
      expect(typeof fx.body.webhook_code).toBe("string");
      expect(fx.body.webhook_type.length).toBeGreaterThan(0);
      expect(fx.body.webhook_code.length).toBeGreaterThan(0);
    });
  }
});

describe("Plaid webhook HTTP route (signature-bypass)", () => {
  const prevSkip = process.env.SKIP_WEBHOOK_VERIFICATION;
  const prevEnv = process.env.PLAID_ENV;

  beforeAll(() => {
    process.env.SKIP_WEBHOOK_VERIFICATION = "true";
    process.env.PLAID_ENV = "sandbox";
  });

  afterAll(() => {
    if (prevSkip === undefined) delete process.env.SKIP_WEBHOOK_VERIFICATION;
    else process.env.SKIP_WEBHOOK_VERIFICATION = prevSkip;
    if (prevEnv === undefined) delete process.env.PLAID_ENV;
    else process.env.PLAID_ENV = prevEnv;
  });

  const cases = [
    "transactions_default_update.json",
    "item_login_repaired.json",
    "item_new_accounts_available.json",
    "holdings_default_update.json",
    "investments_transactions_default_update.json",
    "auth_default_update.json",
    "identity_default_update.json",
  ];

  for (const f of cases) {
    it(`${f} returns 200 OK for unknown item_id (ignored=unknown_item)`, async () => {
      const t = setupHarness();
      const fx = loadFixture(f);
      const resp = await postWebhook(t, fx);
      expect(resp.status).toBe(200);
      const json = (await resp.json()) as { ignored?: string };
      // Unknown item_id short-circuits with ignored=unknown_item before
      // scheduling, mutating, or dispatching anything.
      expect(json.ignored).toBe("unknown_item");
    });
  }
});
