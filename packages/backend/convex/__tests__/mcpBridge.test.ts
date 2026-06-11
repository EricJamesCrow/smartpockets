/**
 * MCP bridge tests (/mcp-tools HTTP action + mcp/bridge.runReadTool).
 *
 * The bridge is the server-to-server path the external MCP server uses after
 * verifying a Clerk OAuth token (CROWDEV-54). Asserts:
 *
 * - fail-closed when MCP_BRIDGE_SECRET is unset (503)
 * - wrong secret rejected (401)
 * - unknown user → ok:false unknown_user (no data)
 * - list_credit_cards returns only the resolved user's cards
 * - get_credit_card refuses another user's card (null) and malformed ids
 * - unknown tool → ok:false unknown_tool
 */

import { describe, expect, it, beforeEach, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import plaidSchema from "../../../convex-plaid/src/component/schema";

const modules = import.meta.glob("../**/*.ts");
const plaidModules = import.meta.glob(
  "../../../convex-plaid/src/component/**/*.ts",
);

const SECRET = "test_mcp_bridge_secret_value";

function setup() {
  const t = convexTest(schema, modules);
  t.registerComponent("plaid", plaidSchema as any, plaidModules);
  return t;
}

async function seedUser(t: ReturnType<typeof setup>, externalId: string) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      name: `User ${externalId}`,
      externalId,
      connectedAccounts: [],
    });
  });
}

async function seedManualCard(
  t: ReturnType<typeof setup>,
  userId: Awaited<ReturnType<typeof seedUser>>,
  label: string,
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("creditCards", {
      userId,
      accountId: `manual_account_${label}`,
      accountName: label,
      displayName: label,
      isOverdue: false,
      isLocked: false,
      isAutoPay: false,
      isActive: true,
    });
  });
}

async function callBridge(
  t: ReturnType<typeof setup>,
  body: unknown,
  secret?: string,
): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers["Authorization"] = `Bearer ${secret}`;
  return await t.fetch("/mcp-tools", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("MCP bridge", () => {
  beforeEach(() => {
    vi.stubEnv("MCP_BRIDGE_SECRET", SECRET);
  });

  it("fails closed with 503 when the secret is not configured", async () => {
    vi.stubEnv("MCP_BRIDGE_SECRET", "");
    const t = setup();
    const res = await callBridge(t, { externalId: "u", tool: "list_credit_cards", args: {} }, "anything");
    expect(res.status).toBe(503);
  });

  it("rejects a wrong secret with 401", async () => {
    const t = setup();
    const res = await callBridge(t, { externalId: "u", tool: "list_credit_cards", args: {} }, "wrong-secret");
    expect(res.status).toBe(401);
  });

  it("returns unknown_user for an unresolvable externalId", async () => {
    const t = setup();
    const res = await callBridge(t, { externalId: "user_missing", tool: "list_credit_cards", args: {} }, SECRET);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: false, error: "unknown_user" });
  });

  it("list_credit_cards returns only the resolved user's cards", async () => {
    const t = setup();
    const userA = await seedUser(t, "user_bridge_a");
    const userB = await seedUser(t, "user_bridge_b");
    await seedManualCard(t, userA, "Card A");
    await seedManualCard(t, userB, "Card B");

    const res = await callBridge(t, { externalId: "user_bridge_a", tool: "list_credit_cards", args: {} }, SECRET);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].displayName).toBe("Card A");
  });

  it("get_credit_card refuses another user's card", async () => {
    const t = setup();
    const userA = await seedUser(t, "user_bridge_a2");
    await seedUser(t, "user_bridge_b2");
    const cardA = await seedManualCard(t, userA, "Card A2");

    const res = await callBridge(
      t,
      { externalId: "user_bridge_b2", tool: "get_credit_card", args: { cardId: cardA } },
      SECRET,
    );
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toBeNull();
  });

  it("get_credit_card tolerates malformed ids", async () => {
    const t = setup();
    await seedUser(t, "user_bridge_c");
    const res = await callBridge(
      t,
      { externalId: "user_bridge_c", tool: "get_credit_card", args: { cardId: "not-a-real-id" } },
      SECRET,
    );
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toBeNull();
  });

  it("rejects unknown tools", async () => {
    const t = setup();
    await seedUser(t, "user_bridge_d");
    const res = await callBridge(
      t,
      { externalId: "user_bridge_d", tool: "drop_all_tables", args: {} },
      SECRET,
    );
    expect(await res.json()).toMatchObject({ ok: false, error: "unknown_tool" });
  });

  it("get_credit_card_stats aggregates the user's cards", async () => {
    const t = setup();
    const userA = await seedUser(t, "user_bridge_e");
    await seedManualCard(t, userA, "Card E1");
    await seedManualCard(t, userA, "Card E2");

    const res = await callBridge(
      t,
      { externalId: "user_bridge_e", tool: "get_credit_card_stats", args: {} },
      SECRET,
    );
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.cardCount).toBe(2);
  });
});
