/**
 * Clerk webhook svix signature verification tests (/clerk-users-webhook).
 *
 * The route's validateRequest() verifies the svix signature against
 * CLERK_WEBHOOK_SECRET before any event is processed. These tests sign
 * payloads with the real svix scheme (HMAC-SHA256 over `${id}.${ts}.${body}`,
 * keyed by the base64 secret after the `whsec_` prefix) and assert:
 *
 * - a correctly signed user.created event is accepted (200) and upserts a user
 * - a tampered body is rejected (400) without side effects
 * - missing svix headers are rejected (400)
 */

import { describe, expect, it, beforeEach, vi } from "vitest";
import { convexTest } from "convex-test";
import { createHmac, randomBytes } from "node:crypto";
import schema from "../schema";
import plaidSchema from "../../../convex-plaid/src/component/schema";

const modules = import.meta.glob("../**/*.ts");
const plaidModules = import.meta.glob(
  "../../../convex-plaid/src/component/**/*.ts",
);

const SECRET_BYTES = randomBytes(24);
const WEBHOOK_SECRET = `whsec_${SECRET_BYTES.toString("base64")}`;

function setupHarness() {
  const t = convexTest(schema, modules);
  t.registerComponent("plaid", plaidSchema as any, plaidModules);
  return t;
}

function svixSign(payload: string, opts?: { tamper?: boolean }) {
  const id = "msg_test_clerk_webhook";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signedContent = `${id}.${timestamp}.${payload}`;
  const signature = createHmac("sha256", SECRET_BYTES)
    .update(signedContent)
    .digest("base64");
  return {
    "svix-id": id,
    "svix-timestamp": timestamp,
    "svix-signature": `v1,${opts?.tamper ? signature.slice(0, -2) + "xx" : signature}`,
  };
}

const USER_CREATED_EVENT = {
  type: "user.created",
  data: {
    id: "user_webhook_sig_test",
    first_name: "Sig",
    last_name: "Test",
    email_addresses: [
      { id: "idn_1", email_address: "sig.test@example.com" },
    ],
    primary_email_address_id: "idn_1",
    external_accounts: [],
  },
};

async function postClerkWebhook(
  t: ReturnType<typeof convexTest>,
  body: string,
  headers: Record<string, string>,
): Promise<Response> {
  return await t.fetch("/clerk-users-webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
}

describe("Clerk webhook signature verification", () => {
  beforeEach(() => {
    vi.stubEnv("CLERK_WEBHOOK_SECRET", WEBHOOK_SECRET);
  });

  it("accepts a correctly signed user.created event and upserts the user", async () => {
    const t = setupHarness();
    const payload = JSON.stringify(USER_CREATED_EVENT);

    const res = await postClerkWebhook(t, payload, svixSign(payload));
    expect(res.status).toBe(200);

    const user = await t.run(async (ctx) => {
      return await ctx.db
        .query("users")
        .withIndex("externalId", (q) =>
          q.eq("externalId", "user_webhook_sig_test"),
        )
        .unique();
    });
    expect(user).not.toBeNull();
    expect(user!.name).toBe("Sig Test");
  });

  it("rejects a tampered payload with 400 and no side effects", async () => {
    const t = setupHarness();
    const payload = JSON.stringify(USER_CREATED_EVENT);
    const headers = svixSign(payload);
    const tampered = payload.replace("Sig", "Mal");

    const res = await postClerkWebhook(t, tampered, headers);
    expect(res.status).toBe(400);

    const user = await t.run(async (ctx) => {
      return await ctx.db
        .query("users")
        .withIndex("externalId", (q) =>
          q.eq("externalId", "user_webhook_sig_test"),
        )
        .unique();
    });
    expect(user).toBeNull();
  });

  it("rejects a corrupted signature with 400", async () => {
    const t = setupHarness();
    const payload = JSON.stringify(USER_CREATED_EVENT);

    const res = await postClerkWebhook(
      t,
      payload,
      svixSign(payload, { tamper: true }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects missing svix headers with 400", async () => {
    const t = setupHarness();
    const payload = JSON.stringify(USER_CREATED_EVENT);

    const res = await postClerkWebhook(t, payload, {});
    expect(res.status).toBe(400);
  });
});
