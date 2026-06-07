# Plan-Based Gating (Free vs Pro) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate AI chat and Plaid connections by a per-user plan (Free vs Pro $10/mo via Clerk Billing), enforced server-side, so SmartPockets can stay an open demo without unbounded Anthropic/Plaid cost.

**Architecture:** Clerk Billing is the source of truth; a webhook mirrors the resolved plan onto `users.plan`. A single `billing/entitlements.ts` module maps `plan → limits`. The two existing choke points — `agent/budgets.ts` `checkHeadroom` (chat) and the Plaid connection actions — read the plan and enforce per-plan caps. Chat is metered by a monthly **message count** (new `usageCounters` ent) with a per-plan **token backstop** (existing `agentUsage`). Everything fails safe to Free; the owner is allowlisted via env so demos keep working.

**Tech Stack:** Convex (convex-ents, `@convex-dev/rate-limiter`), Clerk + Clerk Billing (`@clerk/nextjs`, svix webhooks), Next.js 16 App Router / React 19, vitest + `convex-test`.

**Spec:** `docs/superpowers/specs/2026-06-03-crowdev-330-plan-based-gating-design.md`

**Conventions (match these):**
- Convex fns import from the local `./functions` / `../functions` wrappers (`query`, `mutation`, `internalQuery`, `internalMutation`) and use convex-ents `ctx.table(...)`.
- Tests live in `packages/backend/convex/__tests__/*.test.ts`, use `convexTest(schema, modules)` with `import.meta.glob`, seed via `t.run(async (ctx: any) => ctx.db.insert(...))`, and register the Plaid component when needed (see `__tests__/countActivePlaidItems.test.ts`).
- Run backend tests: `bun --filter @repo/backend test -- <fileSubstring>`.
- After **any** `packages/backend/convex/` change: `cd packages/backend && bunx convex dev --once` (deploy to `dev:canny-turtle-982`) then `cd apps/app && bun typecheck` (AGENTS.md rules 9–10).
- Commit format: subject `CROWDEV-330 <desc>`, body, `Refs CROWDEV-330`, `Co-authored-by: Claude <noreply@anthropic.com>`. Stage explicit paths (never `git add -A`).
- Do **not** open/submit PRs unless the owner explicitly asks; default finish = local verification + Linear-linked commits.

---

## Task 0: Clerk dashboard setup (OWNER ACTION — can run in parallel)

This is the one external dependency the code can't create. It can happen in parallel with Tasks 1–7 because all code is parameterized by env (`CLERK_PRO_PLAN_SLUG`), but it **must** be done before Task 4's webhook produces real plan data and before end-to-end verification.

- [ ] **Step 1: Enable Billing + create plans.** In the Clerk Dashboard → **Billing**: enable Billing (connect the Stripe account in test mode for dev). Create two plans for **Users** (B2C, not Organizations):
  - **Free** — $0, the default plan.
  - **Pro** — $10/month. Note its **slug** (e.g. `pro`).
- [ ] **Step 2: Record the Pro slug.** Set `CLERK_PRO_PLAN_SLUG` in the Convex dev deployment env (`bunx convex env set CLERK_PRO_PLAN_SLUG pro`) and in Vercel preview/app env for the frontend (`NEXT_PUBLIC_CLERK_PRO_PLAN_SLUG=pro`). Default in code is `pro`, so this only matters if the slug differs.
- [ ] **Step 3: Subscribe the webhook to billing events.** In Clerk Dashboard → Webhooks, ensure the existing endpoint (`https://<deployment>.convex.site/clerk-users-webhook`, already used for `user.*`) is subscribed to: `subscription.created`, `subscription.updated`, `subscription.active`, `subscription.pastDue`. The svix signing secret (`CLERK_WEBHOOK_SECRET`) is already configured.
- [ ] **Step 4: Allowlist the owner.** Set the owner's Clerk user id: `bunx convex env set BILLING_UNLIMITED_USER_IDS user_xxx` (comma-separated for multiple). Find the id in Clerk Dashboard → Users, or from an existing `users.externalId` row.

> No commit — this is dashboard/env config. Record completion in the CROWDEV-330 Linear thread.

---

## Task 1: Entitlements module (the single source of truth)

**Files:**
- Create: `packages/backend/convex/billing/entitlements.ts`
- Test: `packages/backend/convex/__tests__/billingEntitlements.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/backend/convex/__tests__/billingEntitlements.test.ts
import { describe, expect, it } from "vitest";
import { entitlementsFor, resolvePlan } from "../billing/entitlements";

describe("entitlementsFor", () => {
  it("free is strictly smaller than pro on every axis", () => {
    const free = entitlementsFor("free");
    const pro = entitlementsFor("pro");
    expect(free.chatMessagesPerMonth).toBeLessThan(pro.chatMessagesPerMonth);
    expect(free.chatTokensPerMonth).toBeLessThan(pro.chatTokensPerMonth);
    expect(free.maxPlaidConnections).toBeLessThan(pro.maxPlaidConnections);
  });

  it("free defaults match the spec (15 msgs, 1 connection)", () => {
    const free = entitlementsFor("free");
    expect(free.chatMessagesPerMonth).toBe(15);
    expect(free.maxPlaidConnections).toBe(1);
  });

  it("pro defaults match the spec (500 msgs, 5 connections)", () => {
    const pro = entitlementsFor("pro");
    expect(pro.chatMessagesPerMonth).toBe(500);
    expect(pro.maxPlaidConnections).toBe(5);
  });
});

describe("resolvePlan", () => {
  it("normalizes a known plan", () => {
    expect(resolvePlan("pro")).toBe("pro");
    expect(resolvePlan("free")).toBe("free");
  });
  it("fails safe to free on unknown/missing", () => {
    expect(resolvePlan(undefined)).toBe("free");
    expect(resolvePlan(null)).toBe("free");
    expect(resolvePlan("enterprise")).toBe("free");
    expect(resolvePlan("")).toBe("free");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --filter @repo/backend test -- billingEntitlements`
Expected: FAIL — cannot resolve `../billing/entitlements`.

- [ ] **Step 3: Write the module**

```ts
// packages/backend/convex/billing/entitlements.ts
/**
 * Single source of truth for per-plan limits. Pure module (no ctx, no I/O)
 * so it is trivially unit-testable and importable from queries, mutations,
 * actions, and the HTTP layer alike. Numbers are tunable here; the two token
 * backstops accept env overrides (matching the existing AGENT_BUDGET_* style).
 */
export type Plan = "free" | "pro";

export interface Entitlements {
  /** Primary, user-facing monthly chat cap. */
  chatMessagesPerMonth: number;
  /** Secondary cost backstop: monthly tokensIn+tokensOut ceiling. */
  chatTokensPerMonth: number;
  /** Active Plaid Items (institution logins). */
  maxPlaidConnections: number;
}

function numFromEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  const n = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const FREE: Entitlements = {
  chatMessagesPerMonth: 15,
  chatTokensPerMonth: numFromEnv("BILLING_FREE_CHAT_TOKENS", 500_000),
  maxPlaidConnections: 1,
};

const PRO: Entitlements = {
  chatMessagesPerMonth: 500,
  chatTokensPerMonth: numFromEnv("BILLING_PRO_CHAT_TOKENS", 10_000_000),
  maxPlaidConnections: 5,
};

export function entitlementsFor(plan: Plan): Entitlements {
  return plan === "pro" ? PRO : FREE;
}

/** Normalize any value to a known plan; unknown/missing ⇒ "free" (least privilege). */
export function resolvePlan(value: unknown): Plan {
  return value === "pro" ? "pro" : "free";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun --filter @repo/backend test -- billingEntitlements`
Expected: PASS (6 assertions).

- [ ] **Step 5: Commit**

```bash
git add packages/backend/convex/billing/entitlements.ts \
        packages/backend/convex/__tests__/billingEntitlements.test.ts
git commit -m "CROWDEV-330 Add billing entitlements module" \
  -m "Pure plan→limits map (Free/Pro) + resolvePlan fail-safe. Token backstops env-overridable; message/connection counts are constants." \
  -m "Refs CROWDEV-330" -m "Co-authored-by: Claude <noreply@anthropic.com>"
```

---

## Task 2: Schema — `users.plan` + `usageCounters` ent

**Files:**
- Modify: `packages/backend/convex/schema.ts` (users ent ~`:8-39`; add new ent near `agentUsage` ~`:453`)

- [ ] **Step 1: Add billing fields to the `users` ent**

In `schema.ts`, inside `users: defineEnt({ ... })`, add after `connectedAccounts` (before the closing `})` that precedes `.field("externalId", ...)`):

```ts
            // === BILLING (CROWDEV-330) ===
            // Mirrored from Clerk Billing via webhook. Absent ⇒ free (fail-safe).
            plan: v.optional(v.union(v.literal("free"), v.literal("pro"))),
            subscriptionStatus: v.optional(v.string()), // raw Clerk status, debug/UI
            planUpdatedAt: v.optional(v.number()),
```

Then add the `usageCounters` edge to the users ent's edge list (alongside `.edges("agentUsage", { ref: true })`):

```ts
            .edges("usageCounters", { ref: true })
```

- [ ] **Step 2: Add the `usageCounters` ent**

In `schema.ts`, add immediately after the `agentUsage` ent definition (after its closing `,` near `:463`):

```ts
        // === USAGE COUNTERS (CROWDEV-330) ===
        // One row per (user, month). Holds the user-facing monthly chat message
        // count. Token accounting stays in `agentUsage`. Reset is implicit: a
        // new month ⇒ a new periodStart ⇒ a fresh row starting at 0.
        usageCounters: defineEnt({
            periodStart: v.number(), // firstOfMonthUtc, matches agentUsage
            chatMessagesUsed: v.number(),
        })
            .edge("user")
            .index("by_user_period", ["userId", "periodStart"]),
```

- [ ] **Step 3: Deploy schema + typecheck**

Run:
```bash
cd packages/backend && bunx convex dev --once
cd ../../apps/app && bun typecheck
```
Expected: deploy succeeds (codegen regenerates `_generated/api.d.ts` with `usageCounters`); typecheck clean. `schemaValidation: false` + optional fields ⇒ no backfill needed.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/convex/schema.ts
git commit -m "CROWDEV-330 Add plan fields + usageCounters to schema" \
  -m "users gains plan/subscriptionStatus/planUpdatedAt (all optional, migration-safe). New usageCounters ent (one row per user-month) for the monthly chat message count." \
  -m "Refs CROWDEV-330" -m "Co-authored-by: Claude <noreply@anthropic.com>"
```

---

## Task 3: Effective-plan resolver + owner allowlist

**Files:**
- Create: `packages/backend/convex/billing/plan.ts`
- Test: `packages/backend/convex/__tests__/billingPlan.test.ts`

The resolver is what every gate calls. `"unlimited"` is a marker (owner allowlist) that makes gates **skip** the cap comparison; everyone else maps to a real `Plan`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/backend/convex/__tests__/billingPlan.test.ts
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { internal } from "../_generated/api";

const modules = import.meta.glob("../**/*.ts");

async function seedUser(t: any, plan?: "free" | "pro", externalId = "user_a") {
  return await t.run(async (ctx: any) =>
    ctx.db.insert("users", { name: "Test", externalId, plan }),
  );
}

describe("resolveEffectivePlanForUser", () => {
  const OLD = process.env.BILLING_UNLIMITED_USER_IDS;
  afterEach(() => { process.env.BILLING_UNLIMITED_USER_IDS = OLD; });

  it("absent plan ⇒ free", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, undefined);
    const r = await t.query(internal.billing.plan.resolveEffectivePlanForUser, { userId });
    expect(r).toBe("free");
  });

  it("pro plan ⇒ pro", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "pro");
    const r = await t.query(internal.billing.plan.resolveEffectivePlanForUser, { userId });
    expect(r).toBe("pro");
  });

  it("allowlisted externalId ⇒ unlimited (regardless of stored plan)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "free", "user_owner");
    process.env.BILLING_UNLIMITED_USER_IDS = "user_owner,user_other";
    const r = await t.query(internal.billing.plan.resolveEffectivePlanForUser, { userId });
    expect(r).toBe("unlimited");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --filter @repo/backend test -- billingPlan`
Expected: FAIL — cannot resolve `../billing/plan`.

- [ ] **Step 3: Implement the resolver**

```ts
// packages/backend/convex/billing/plan.ts
import { v } from "convex/values";
import { internalQuery } from "../functions";
import type { Id } from "../_generated/dataModel";
import { resolvePlan, type Plan } from "./entitlements";

export type EffectivePlan = Plan | "unlimited";

function allowlist(): Set<string> {
  return new Set(
    (process.env.BILLING_UNLIMITED_USER_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  );
}

/**
 * Pure: derive the effective plan from a user doc. Owner allowlist (by Clerk
 * externalId) ⇒ "unlimited"; otherwise normalized users.plan (unknown ⇒ free).
 */
export function effectivePlanFromUser(
  user: { externalId: string; plan?: unknown } | null | undefined,
): EffectivePlan {
  if (!user) return "free";
  if (allowlist().has(user.externalId)) return "unlimited";
  return resolvePlan(user.plan);
}

/**
 * Resolve the effective plan for a Convex user id. `ctx` is typed `any` because
 * this is called from query AND mutation ents contexts (both expose `ctx.table`;
 * actions must NOT call it — they have no DB access, see Task 7). Any error ⇒
 * "free" (least privilege).
 */
export async function resolveEffectivePlan(
  ctx: any,
  userId: Id<"users">,
): Promise<EffectivePlan> {
  try {
    const user = await ctx.table("users").get(userId);
    return effectivePlanFromUser(user);
  } catch {
    return "free";
  }
}

/** Test/diagnostic surface for the resolver. */
export const resolveEffectivePlanForUser = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.literal("free"), v.literal("pro"), v.literal("unlimited")),
  handler: async (ctx, { userId }) => resolveEffectivePlan(ctx, userId),
});
```

- [ ] **Step 4: Run test + deploy + typecheck**

Run:
```bash
bun --filter @repo/backend test -- billingPlan
cd packages/backend && bunx convex dev --once && cd ../../apps/app && bun typecheck
```
Expected: 3 tests PASS; deploy + typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/convex/billing/plan.ts \
        packages/backend/convex/__tests__/billingPlan.test.ts
git commit -m "CROWDEV-330 Add effective-plan resolver + owner allowlist" \
  -m "resolveEffectivePlan reads users.plan (fail-safe free), with BILLING_UNLIMITED_USER_IDS ⇒ unlimited so the owner bypasses caps for demos." \
  -m "Refs CROWDEV-330" -m "Co-authored-by: Claude <noreply@anthropic.com>"
```

---

## Task 4: Plan-sync mutation + Clerk Billing webhook wiring

**Files:**
- Create: `packages/backend/convex/billing/mutations.ts`
- Modify: `packages/backend/convex/http.ts` (switch at `:87`)
- Test: `packages/backend/convex/__tests__/billingSyncPlan.test.ts`

- [ ] **Step 1: Write the failing test** (mutation maps a subscription payload → `users.plan`)

```ts
// packages/backend/convex/__tests__/billingSyncPlan.test.ts
import { describe, expect, it, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { internal } from "../_generated/api";

const modules = import.meta.glob("../**/*.ts");

// Minimal shape of a Clerk Billing subscription event payload: a payer with a
// Clerk user id, plus subscription items each referencing a plan slug + status.
function payload(externalId: string, items: Array<{ slug: string; status: string }>) {
  return {
    payer: { user_id: externalId },
    items: items.map((i) => ({ status: i.status, plan: { slug: i.slug } })),
    status: "active",
  };
}

describe("syncPlanFromClerk", () => {
  const OLD = process.env.CLERK_PRO_PLAN_SLUG;
  afterEach(() => { process.env.CLERK_PRO_PLAN_SLUG = OLD; });

  it("sets plan=pro when an active item matches the pro slug", async () => {
    process.env.CLERK_PRO_PLAN_SLUG = "pro";
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "T", externalId: "user_p" }),
    );
    await t.mutation(internal.billing.mutations.syncPlanFromClerk, {
      data: payload("user_p", [{ slug: "pro", status: "active" }]),
    });
    const u = await t.run(async (ctx: any) => ctx.db.get(userId));
    expect(u.plan).toBe("pro");
  });

  it("sets plan=free when only the free item is active", async () => {
    process.env.CLERK_PRO_PLAN_SLUG = "pro";
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "T", externalId: "user_f" }),
    );
    await t.mutation(internal.billing.mutations.syncPlanFromClerk, {
      data: payload("user_f", [{ slug: "free_user", status: "active" }]),
    });
    const u = await t.run(async (ctx: any) => ctx.db.get(userId));
    expect(u.plan).toBe("free");
  });

  it("is a no-op when the payer user is unknown", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.billing.mutations.syncPlanFromClerk, {
      data: payload("user_missing", [{ slug: "pro", status: "active" }]),
    });
    // no throw; nothing to assert beyond completion
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --filter @repo/backend test -- billingSyncPlan`
Expected: FAIL — cannot resolve `../billing/mutations`.

- [ ] **Step 3: Implement the sync mutation**

```ts
// packages/backend/convex/billing/mutations.ts
import { v } from "convex/values";
import { internalMutation } from "../functions";

function proSlug(): string {
  return process.env.CLERK_PRO_PLAN_SLUG ?? "pro";
}

/** True if any subscription item for the pro plan is in an active-ish state. */
function hasActivePro(data: any): boolean {
  const items: any[] = Array.isArray(data?.items) ? data.items : [];
  const target = proSlug();
  return items.some((it) => {
    const slug = it?.plan?.slug ?? it?.plan_slug ?? it?.slug;
    const status = String(it?.status ?? "").toLowerCase();
    const active = status === "active" || status === "trialing" || status === "";
    return slug === target && active;
  });
}

/**
 * Mirror the Clerk Billing subscription payload onto users.plan. Resolves the
 * payer's Clerk user id, then sets plan=pro iff an active pro item exists, else
 * free. Idempotent upsert; unknown payer ⇒ no-op. Unknown shape ⇒ free.
 */
export const syncPlanFromClerk = internalMutation({
  args: { data: v.any() },
  returns: v.null(),
  handler: async (ctx, { data }) => {
    const externalId: string | undefined =
      data?.payer?.user_id ?? data?.user_id ?? data?.payer?.id;
    if (!externalId) return null;

    const user = await ctx.table("users").get("externalId", externalId);
    if (!user) return null; // user webhook may not have landed yet; safe no-op

    const plan = hasActivePro(data) ? "pro" : "free";
    const status =
      typeof data?.status === "string" ? data.status : undefined;

    const writable = await ctx.table("users").getX(user._id);
    await writable.patch({
      plan,
      subscriptionStatus: status,
      planUpdatedAt: Date.now(),
    });
    return null;
  },
});
```

- [ ] **Step 4: Run mutation test to verify it passes**

Run: `bun --filter @repo/backend test -- billingSyncPlan`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire the webhook** — in `http.ts`, add billing cases to the switch (after the `paymentAttempt.updated` case at `:107`):

```ts
      case "subscription.created": // intentional fallthrough
      case "subscription.updated":
      case "subscription.active":
      case "subscription.pastDue": {
        await ctx.runMutation(internal.billing.mutations.syncPlanFromClerk, {
          data: (event as any).data,
        });
        break;
      }
```

- [ ] **Step 6: Deploy + typecheck**

Run:
```bash
cd packages/backend && bunx convex dev --once && cd ../../apps/app && bun typecheck
```
Expected: clean. (Manual end-to-end webhook verification happens after Task 0 is done — see Final Verification.)

- [ ] **Step 7: Commit**

```bash
git add packages/backend/convex/billing/mutations.ts packages/backend/convex/http.ts \
        packages/backend/convex/__tests__/billingSyncPlan.test.ts
git commit -m "CROWDEV-330 Mirror Clerk Billing plan to users.plan via webhook" \
  -m "syncPlanFromClerk maps subscription.* payloads to plan=pro/free (pro slug via CLERK_PRO_PLAN_SLUG); wired into the existing /clerk-users-webhook switch. Unknown payer/shape ⇒ safe no-op / free." \
  -m "Refs CROWDEV-330" -m "Co-authored-by: Claude <noreply@anthropic.com>"
```

---

## Task 5: Plan-aware `checkHeadroom` (message cap + per-plan token backstop)

**Files:**
- Modify: `packages/backend/convex/agent/budgets.ts` (`checkHeadroom` `:10-57`)
- Test: `packages/backend/convex/__tests__/budgetsHeadroom.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/backend/convex/__tests__/budgetsHeadroom.test.ts
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { internal } from "../_generated/api";

const modules = import.meta.glob("../**/*.ts");

function firstOfMonthUtc(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

async function seedUserWithMessages(t: any, plan: "free" | "pro", used: number) {
  return await t.run(async (ctx: any) => {
    const userId = await ctx.db.insert("users", { name: "T", externalId: `u_${plan}_${used}`, plan });
    await ctx.db.insert("usageCounters", {
      userId,
      periodStart: firstOfMonthUtc(Date.now()),
      chatMessagesUsed: used,
    });
    return userId;
  });
}

describe("checkHeadroom — message cap", () => {
  it("blocks a free user at the 15-message cap", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUserWithMessages(t, "free", 15);
    const r = await t.query(internal.agent.budgets.checkHeadroom, { userId });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("message_cap");
  });

  it("allows a free user below the cap", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUserWithMessages(t, "free", 14);
    const r = await t.query(internal.agent.budgets.checkHeadroom, { userId });
    expect(r.ok).toBe(true);
  });

  it("allows a pro user at 15 (their cap is higher)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUserWithMessages(t, "pro", 15);
    const r = await t.query(internal.agent.budgets.checkHeadroom, { userId });
    expect(r.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --filter @repo/backend test -- budgetsHeadroom`
Expected: FAIL — `reason` is `undefined`/`monthly_cap`, not `message_cap` (headroom is plan-blind and has no message logic yet).

- [ ] **Step 3: Make `checkHeadroom` plan-aware**

In `budgets.ts`, replace the `checkHeadroom` handler body. Add imports at top:

```ts
import { resolveEffectivePlan } from "../billing/plan";
import { entitlementsFor } from "../billing/entitlements";
```

Update the `returns` union and handler:

```ts
  returns: v.object({
    ok: v.boolean(),
    reason: v.optional(
      v.union(
        v.literal("message_cap"),
        v.literal("monthly_cap"),
        v.literal("thread_cap"),
      ),
    ),
  }),
  handler: async (ctx, { userId, threadId }) => {
    const effective = await resolveEffectivePlan(ctx, userId);
    // Owner allowlist bypasses all chat caps.
    if (effective === "unlimited") return { ok: true };
    const ent = entitlementsFor(effective);

    const periodStart = firstOfMonthUtc(Date.now());

    // 1) Message cap (primary, user-facing).
    const counter = (await ctx.table("usageCounters", "by_user_period", (q) =>
      q.eq("userId", userId).eq("periodStart", periodStart),
    )) as unknown as Array<{ chatMessagesUsed: number }>;
    const messagesUsed = counter[0]?.chatMessagesUsed ?? 0;
    if (messagesUsed >= ent.chatMessagesPerMonth) {
      return { ok: false, reason: "message_cap" as const };
    }

    // 2) Token backstop (per-plan).
    const usageRows = (await ctx.table("agentUsage", "by_user_period", (q) =>
      q.eq("userId", userId).eq("periodStart", periodStart),
    )) as unknown as Array<{ tokensIn: number; tokensOut: number }>;
    const monthlyTotal = usageRows.reduce((acc, r) => acc + r.tokensIn + r.tokensOut, 0);
    if (monthlyTotal >= ent.chatTokensPerMonth) {
      return { ok: false, reason: "monthly_cap" as const };
    }

    // 3) Per-thread cap (unchanged runaway guard).
    const perThread = Number(process.env.AGENT_BUDGET_PER_THREAD_TOKENS ?? 200_000);
    if (threadId) {
      const messages = (await ctx.table("agentMessages", "by_thread_createdAt", (q) =>
        q.eq("agentThreadId", threadId),
      )) as unknown as Array<{ tokensIn?: number; tokensOut?: number }>;
      const threadTotal = messages.reduce(
        (acc, m) => acc + (m.tokensIn ?? 0) + (m.tokensOut ?? 0),
        0,
      );
      if (threadTotal >= perThread) return { ok: false, reason: "thread_cap" as const };
    }

    return { ok: true };
  },
```

Delete the now-unused `monthly` const (`AGENT_BUDGET_MONTHLY_TOKENS`) — the cap is per-plan now.

- [ ] **Step 4: Run test + full budget suite**

Run: `bun --filter @repo/backend test -- budgetsHeadroom`
Expected: PASS (3 tests). The two call sites (`http.ts:705`, `threads.ts:360`) forward `reason` verbatim, so no change needed there.

- [ ] **Step 5: Deploy + typecheck + commit**

```bash
cd packages/backend && bunx convex dev --once && cd ../../apps/app && bun typecheck && cd ../../
git add packages/backend/convex/agent/budgets.ts \
        packages/backend/convex/__tests__/budgetsHeadroom.test.ts
git commit -m "CROWDEV-330 Make checkHeadroom plan-aware with a message cap" \
  -m "Adds a monthly message cap (reason=message_cap) read from usageCounters and switches the token backstop to per-plan entitlements. Owner (unlimited) bypasses. Per-thread guard unchanged." \
  -m "Refs CROWDEV-330" -m "Co-authored-by: Claude <noreply@anthropic.com>"
```

---

## Task 6: Increment the message counter at turn-admit

**Files:**
- Modify: `packages/backend/convex/agent/threads.ts` (`startUserTurn` `:119-178`; edit-and-resend mutation `:302-406`)
- Test: `packages/backend/convex/__tests__/usageCounterIncrement.test.ts`

- [ ] **Step 1: Write the failing test** (driving a turn bumps the counter)

```ts
// packages/backend/convex/__tests__/usageCounterIncrement.test.ts
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { internal } from "../_generated/api";

const modules = import.meta.glob("../**/*.ts");
function firstOfMonthUtc(n: number) { const d = new Date(n); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1); }

describe("incrementChatMessageCount", () => {
  it("creates then increments the monthly counter", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "T", externalId: "u_inc" }),
    );
    await t.mutation(internal.agent.threads.incrementChatMessageCountForTest, { userId });
    await t.mutation(internal.agent.threads.incrementChatMessageCountForTest, { userId });
    const count = await t.run(async (ctx: any) => {
      const rows = await ctx.db
        .query("usageCounters")
        .withIndex("by_user_period", (q: any) =>
          q.eq("userId", userId).eq("periodStart", firstOfMonthUtc(Date.now())))
        .collect();
      return rows[0]?.chatMessagesUsed ?? 0;
    });
    expect(count).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --filter @repo/backend test -- usageCounterIncrement`
Expected: FAIL — `incrementChatMessageCountForTest` is not defined.

- [ ] **Step 3: Implement the shared helper + a thin test wrapper**

In `threads.ts`, add a module-level helper and a tiny internal mutation that exposes it for the test (real callers use the helper directly):

```ts
// Near the other helpers in threads.ts.
async function incrementChatMessageCount(ctx: any, userId: Id<"users">): Promise<void> {
  const d = new Date();
  const periodStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const existing = await ctx.table("usageCounters", "by_user_period", (q: any) =>
    q.eq("userId", userId).eq("periodStart", periodStart),
  );
  const row = existing[0];
  if (row) {
    const writable = await ctx.table("usageCounters").getX(row._id);
    await writable.patch({ chatMessagesUsed: writable.chatMessagesUsed + 1 });
  } else {
    await ctx.table("usageCounters").insert({ userId, periodStart, chatMessagesUsed: 1 });
  }
}
```

Add the test-only wrapper (alongside other internal mutations in `threads.ts`):

```ts
export const incrementChatMessageCountForTest = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    await incrementChatMessageCount(ctx, userId);
    return null;
  },
});
```

- [ ] **Step 4: Call the helper from both turn-admit paths**

In `startUserTurn` (`:119`), after the user-message insert + thread patch (right before `return { threadId: finalThreadId, messageId }` at `:177`):

```ts
  await incrementChatMessageCount(ctx, args.userId);
```

In the edit-and-resend mutation (the one that calls `checkHeadroom` at `:355` and schedules `runAgentTurn` at `:406`), after it inserts the replacement user message and before scheduling the run, add the same call with that mutation's resolved user id (the owner of the thread — `viewer._id` / the thread's `userId`):

```ts
  await incrementChatMessageCount(ctx, /* the thread owner's userId in scope */);
```

> Use whichever user-id variable is already in scope in that handler (it resolves the thread owner before `checkHeadroom`). Do not introduce a new lookup.

- [ ] **Step 5: Run test + deploy + typecheck**

Run:
```bash
bun --filter @repo/backend test -- usageCounterIncrement
cd packages/backend && bunx convex dev --once && cd ../../apps/app && bun typecheck && cd ../../
```
Expected: PASS; clean.

- [ ] **Step 6: Commit**

```bash
git add packages/backend/convex/agent/threads.ts \
        packages/backend/convex/__tests__/usageCounterIncrement.test.ts
git commit -m "CROWDEV-330 Count chat messages per month at turn-admit" \
  -m "Shared incrementChatMessageCount helper bumps usageCounters in the same transaction as the user-message insert, from both startUserTurn and edit-and-resend." \
  -m "Refs CROWDEV-330" -m "Co-authored-by: Claude <noreply@anthropic.com>"
```

---

## Task 7: Plaid connection cap

**Files:**
- Create: `packages/backend/convex/billing/plaidLimit.ts` (pure decision + headroom internalQuery)
- Modify: `packages/backend/convex/plaidComponent.ts` (`createLinkTokenAction` `:111`; `exchangePublicTokenAction` `:144`; `onboardNewConnectionAction` `:367`)
- Test: `packages/backend/convex/__tests__/plaidConnectionLimit.test.ts`

> **Why this shape:** all three Plaid functions are `action`s (`export const ... = action({...})`), and actions have **no DB access** (no `ctx.table`). They get the user via `const userId = await requireActionUserId(ctx)` which returns the **Clerk externalId string** (it's passed straight to `countActivePlaidItems({ userId })` at `plaidComponent.ts:421-424`). So the action calls an **internalQuery** (`getPlaidHeadroom`) that does the DB + component reads; the action only throws on the result. The pure `plaidHeadroomDecision` is what we unit-test (component item-seeding in `convex-test` is impractical — the existing `countActivePlaidItems.test.ts` only covers the zero case for the same reason).

- [ ] **Step 1: Write the failing test** (pure decision function — no component needed)

```ts
// packages/backend/convex/__tests__/plaidConnectionLimit.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --filter @repo/backend test -- plaidConnectionLimit`
Expected: FAIL — cannot resolve `../billing/plaidLimit`.

- [ ] **Step 3: Implement the decision + headroom internalQuery**

```ts
// packages/backend/convex/billing/plaidLimit.ts
import { v } from "convex/values";
import { internalQuery } from "../functions";
import { components } from "../_generated/api";
import { effectivePlanFromUser, type EffectivePlan } from "./plan";
import { entitlementsFor } from "./entitlements";

export type PlaidHeadroom =
  | { ok: true }
  | { ok: false; code: "plaid_connection_limit"; limit: number; used: number };

/** Pure: given the effective plan and current active-item count, may they add one? */
export function plaidHeadroomDecision(
  effective: EffectivePlan,
  used: number,
): PlaidHeadroom {
  if (effective === "unlimited") return { ok: true };
  const limit = entitlementsFor(effective).maxPlaidConnections;
  return used >= limit
    ? { ok: false, code: "plaid_connection_limit", limit, used }
    : { ok: true };
}

/** Count a user's non-deleting Plaid items via the component (ctx-flexible). */
export async function countActiveItems(ctx: any, externalId: string): Promise<number> {
  const items = (await ctx.runQuery(components.plaid.public.getItemsByUser, {
    userId: externalId,
  })) as Array<{ status: string }>;
  return items.filter((i) => i.status !== "deleting").length;
}

/**
 * Headroom for adding another Plaid connection, keyed by Clerk externalId
 * (what the Plaid actions hold). Resolves plan from users.plan + owner
 * allowlist; unlimited short-circuits before any count. Query ctx ⇒ has both
 * `ctx.table` and component `ctx.runQuery`.
 */
export const getPlaidHeadroom = internalQuery({
  args: { externalId: v.string() },
  returns: v.union(
    v.object({ ok: v.literal(true) }),
    v.object({
      ok: v.literal(false),
      code: v.literal("plaid_connection_limit"),
      limit: v.number(),
      used: v.number(),
    }),
  ),
  handler: async (ctx, { externalId }) => {
    const user = await ctx.table("users").get("externalId", externalId);
    const effective = effectivePlanFromUser(user);
    if (effective === "unlimited") return { ok: true };
    const used = await countActiveItems(ctx, externalId);
    return plaidHeadroomDecision(effective, used);
  },
});
```

- [ ] **Step 4: Enforce in the three Plaid actions** (`plaidComponent.ts`). In `createLinkTokenAction`, `exchangePublicTokenAction`, and `onboardNewConnectionAction`, immediately after `const userId = await requireActionUserId(ctx);` (and before the `enforcePlaidRateLimit` / exchange call), add:

```ts
    const headroom = await ctx.runQuery(internal.billing.plaidLimit.getPlaidHeadroom, {
      externalId: userId,
    });
    if (!headroom.ok) {
      throw new Error("plaid_connection_limit");
    }
```

`internal` is already imported in `plaidComponent.ts` (used at `:422`). No other import needed. (`userId` here is the externalId string, per the why-note above.)

- [ ] **Step 5: Run test + deploy + typecheck**

Run:
```bash
bun --filter @repo/backend test -- plaidConnectionLimit
cd packages/backend && bunx convex dev --once && cd ../../apps/app && bun typecheck && cd ../../
```
Expected: PASS; clean.

- [ ] **Step 6: Commit**

```bash
git add packages/backend/convex/billing/plaidLimit.ts packages/backend/convex/plaidComponent.ts \
        packages/backend/convex/__tests__/plaidConnectionLimit.test.ts
git commit -m "CROWDEV-330 Cap active Plaid connections by plan" \
  -m "getPlaidHeadroom internalQuery (free 1 / pro 5 / owner unlimited, fail-safe free) is called from all three Plaid actions at link-token issuance and exchange/onboard. Throws plaid_connection_limit at the cap; pure plaidHeadroomDecision is unit-tested." \
  -m "Refs CROWDEV-330" -m "Co-authored-by: Claude <noreply@anthropic.com>"
```

---

## Task 8: Public `getMyPlanAndUsage` query (drives the UI)

**Files:**
- Create: `packages/backend/convex/billing/queries.ts`
- Test: `packages/backend/convex/__tests__/billingGetMyPlanAndUsage.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/backend/convex/__tests__/billingGetMyPlanAndUsage.test.ts
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";
import plaidSchema from "../../../convex-plaid/src/component/schema";

const modules = import.meta.glob("../**/*.ts");
const plaidModules = import.meta.glob("../../../convex-plaid/src/component/**/*.ts");

describe("getMyPlanAndUsage", () => {
  it("returns free plan + limits for an authed free user", async () => {
    const t0 = convexTest(schema, modules);
    t0.registerComponent("plaid", plaidSchema as any, plaidModules);
    await t0.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "T", externalId: "user_me", plan: "free" }),
    );
    const t = t0.withIdentity({ subject: "user_me" });
    const r = await t.query(api.billing.queries.getMyPlanAndUsage, {});
    expect(r.plan).toBe("free");
    expect(r.chat.limit).toBe(15);
    expect(r.plaid.limit).toBe(1);
    expect(r.chat.used).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --filter @repo/backend test -- billingGetMyPlanAndUsage`
Expected: FAIL — cannot resolve `../billing/queries`.

- [ ] **Step 3: Implement the query** (uses `ctx.viewer`; mirrors the resolver but returns numbers for the UI)

```ts
// packages/backend/convex/billing/queries.ts
import { v } from "convex/values";
import { query } from "../functions";
import { resolveEffectivePlan } from "./plan";
import { entitlementsFor } from "./entitlements";
import { countActiveItems } from "./plaidLimit";

function firstOfMonthUtc(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

export const getMyPlanAndUsage = query({
  args: {},
  returns: v.object({
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("unlimited")),
    chat: v.object({ used: v.number(), limit: v.number() }),
    plaid: v.object({ used: v.number(), limit: v.number() }),
  }),
  handler: async (ctx) => {
    const viewer = ctx.viewer;
    if (!viewer) {
      // Unauthenticated: report the most restrictive plan with zero usage.
      const ent = entitlementsFor("free");
      return {
        plan: "free" as const,
        chat: { used: 0, limit: ent.chatMessagesPerMonth },
        plaid: { used: 0, limit: ent.maxPlaidConnections },
      };
    }

    const effective = await resolveEffectivePlan(ctx, viewer._id);
    const ent = entitlementsFor(effective === "unlimited" ? "pro" : effective);
    const periodStart = firstOfMonthUtc(Date.now());

    const counter = await ctx.table("usageCounters", "by_user_period", (q) =>
      q.eq("userId", viewer._id).eq("periodStart", periodStart),
    );
    const chatUsed = counter[0]?.chatMessagesUsed ?? 0;

    const plaidUsed = await countActiveItems(ctx, viewer.externalId);

    // "unlimited" reports the pro numbers as the displayed limit but the gates
    // never block; the UI treats unlimited as no cap.
    return {
      plan: effective,
      chat: { used: chatUsed, limit: ent.chatMessagesPerMonth },
      plaid: { used: plaidUsed, limit: ent.maxPlaidConnections },
    };
  },
});
```

- [ ] **Step 4: Run test + deploy + typecheck + commit**

```bash
bun --filter @repo/backend test -- billingGetMyPlanAndUsage
cd packages/backend && bunx convex dev --once && cd ../../apps/app && bun typecheck && cd ../../
git add packages/backend/convex/billing/queries.ts \
        packages/backend/convex/__tests__/billingGetMyPlanAndUsage.test.ts
git commit -m "CROWDEV-330 Add getMyPlanAndUsage query for UI" \
  -m "Public query returning { plan, chat:{used,limit}, plaid:{used,limit} } from the effective plan + usageCounters + active Plaid item count." \
  -m "Refs CROWDEV-330" -m "Co-authored-by: Claude <noreply@anthropic.com>"
```

---

## Task 9: Frontend — surface usage on the existing billing page

> **Already built — do NOT rebuild:** `/settings/billing` (`apps/app/src/app/(app)/settings/billing/page.tsx` + `billing-content.tsx`) already implements a complete Clerk Billing flow via `usePlans` / `useSubscription` / `useCheckout` (`{ for: "user" }`): it lists plans, shows the current subscription + status, and runs checkout. No pricing route, no `<PricingTable/>` wiring is needed. The orphaned `CustomClerkPricing` component is an unused alternative — leave it untouched (surgical-changes; don't delete pre-existing code). This task only **adds a usage summary** so users see how close they are to their caps, driven by the Task 8 query.

**Files:**
- Modify: `apps/app/src/app/(app)/settings/billing/billing-content.tsx`

- [ ] **Step 1: Add a usage panel.** At the top of `billing-content.tsx`, add imports:

```tsx
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
```

Inside `BillingContent`, near the other hooks:

```tsx
    const planUsage = useQuery(api.billing.queries.getMyPlanAndUsage);
```

Render a usage section just before the `{/* Plan selection */}` block (hidden for the allowlisted owner, whose plan reads `"unlimited"`):

```tsx
            {planUsage && planUsage.plan !== "unlimited" && (
                <div className="px-4 lg:px-8">
                    <SectionHeader.Root className="border-none pb-0">
                        <SectionHeader.Group>
                            <SectionHeader.Heading>This month's usage</SectionHeader.Heading>
                        </SectionHeader.Group>
                    </SectionHeader.Root>
                    <ul className="text-secondary mt-2 flex flex-col gap-1 text-sm">
                        <li>
                            AI assistant messages: {planUsage.chat.used} / {planUsage.chat.limit}
                        </li>
                        <li>
                            Bank connections: {planUsage.plaid.used} / {planUsage.plaid.limit}
                        </li>
                    </ul>
                </div>
            )}
```

> `@convex/_generated/api` is the app's Convex alias (see `plaid-link-button.tsx`). `SectionHeader` is already imported in this file.

- [ ] **Step 2: Verify**

Run: `cd apps/app && bun typecheck`. With `bun dev:app` running, sign in and load `/settings/billing`: the existing plan selector renders, plus a "This month's usage" panel showing messages + connections used/limit.

- [ ] **Step 3: Commit**

```bash
git add apps/app/src/app/\(app\)/settings/billing/billing-content.tsx
git commit -m "CROWDEV-330 Show plan usage on the billing page" \
  -m "Adds a This-month's-usage panel (AI messages + bank connections used/limit) to the existing Clerk Billing settings page, driven by getMyPlanAndUsage. Hidden for unlimited (owner)." \
  -m "Refs CROWDEV-330" -m "Co-authored-by: Claude <noreply@anthropic.com>"
```

---

## Task 10: Frontend — plan-aware chat banner copy on the cap

> The pipeline already works end-to-end: `ChatInteractionContext` parses the `429 { error: "budget_exhausted", reason }` into `TypedAgentError({ kind: "budget_exhausted", reason })` (`reason` is a passthrough `string`, so the new `message_cap` value flows through with **no change**), and `ChatBanner` already renders a `/settings/billing` upgrade link for `budget_exhausted`. This task only improves the **copy** so the raw reason code isn't shown and the upgrade prompt is suppressed for the plan-independent `thread_cap`.

**Files:**
- Modify: `apps/app/src/components/chat/ChatBanner.tsx` (`budget_exhausted` case, `:26-31`)

- [ ] **Step 1: Map the reason to friendly copy.** Replace the `budget_exhausted` case in `ChatBanner.tsx` (it currently renders `state.reason` verbatim, which would show "message_cap"):

```tsx
      case "budget_exhausted": {
        const text =
          state.reason === "message_cap"
            ? "You've used all your messages this month."
            : state.reason === "thread_cap"
              ? "This conversation is too long — start a new chat."
              : "You've reached this month's usage limit.";
        // thread_cap is plan-independent (a per-thread guard), so no upgrade CTA.
        const link =
          state.reason === "thread_cap"
            ? null
            : { href: "/settings/billing", label: "Upgrade to Pro" };
        return { icon: <AlertCircle className="size-4" />, text, link };
      }
```

- [ ] **Step 2: Verify + commit**

Run: `cd apps/app && bun typecheck`. Manually: seed a free account's `usageCounters.chatMessagesUsed` to 15 (or set `BILLING_FREE_CHAT_TOKENS=1`), send a message → the banner reads "You've used all your messages this month." with an "Upgrade to Pro" link to `/settings/billing`.

```bash
git add apps/app/src/components/chat/ChatBanner.tsx
git commit -m "CROWDEV-330 Make chat cap banner copy plan-aware" \
  -m "Maps budget_exhausted reason (message_cap/monthly_cap/thread_cap) to friendly copy with an Upgrade-to-Pro link to /settings/billing; thread_cap shows no upgrade (plan-independent)." \
  -m "Refs CROWDEV-330" -m "Co-authored-by: Claude <noreply@anthropic.com>"
```

---

## Task 11: Frontend — Plaid Link button upgrade state at the cap

**Files:**
- Modify: `apps/app/src/features/institutions/components/plaid-link-button.tsx`

- [ ] **Step 1: Read plan usage + short-circuit at the cap.** In `plaid-link-button.tsx`, subscribe to the usage query and gate the button:

```tsx
import { useQuery } from "convex/react";
// ...inside the component, near the other hooks:
const planUsage = useQuery(api.billing.queries.getMyPlanAndUsage);
const atPlaidCap =
  planUsage !== undefined &&
  planUsage.plan !== "unlimited" &&
  planUsage.plaid.used >= planUsage.plaid.limit;
```

Skip fetching a link token when at the cap (guard the `useEffect` at `:71`):

```tsx
      if (!isAuthenticated || atPlaidCap) return;
```

And render the upgrade affordance instead of launching Link. In the default button branch (`:182`), when `atPlaidCap` is true, render a link to `/settings/billing`:

```tsx
  if (atPlaidCap) {
    return (
      <Button size={size} color={color} href="/settings/billing" iconLeading={Plus} className={className}>
        Upgrade to connect more
      </Button>
    );
  }
```

> `api` is already imported in this file (`import { api } from "@convex/_generated/api";`). Confirm the UntitledUI `Button` accepts `href` (it renders as a link via react-aria in this codebase); if not, wrap a `next/link` `Link` around it instead.

- [ ] **Step 2: Defensively handle the server error.** In the `onboardConnection` catch (`:130-139`), special-case the typed limit error so the toast is actionable:

```tsx
        const msg = error instanceof Error ? error.message : "";
        if (msg.includes("plaid_connection_limit")) {
          toast.error("Connection limit reached", {
            id: toastId,
            description: "Upgrade to Pro to connect more banks.",
          });
          return;
        }
```

- [ ] **Step 3: Verify + commit**

Run: `cd apps/app && bun typecheck`. Manually: as a free user with 1 connection, the button shows "Upgrade to connect more" → `/settings/billing` and does not open Plaid Link.

```bash
git add apps/app/src/features/institutions/components/plaid-link-button.tsx
git commit -m "CROWDEV-330 Show Plaid upgrade state at the connection cap" \
  -m "plaid-link-button reads getMyPlanAndUsage; at the cap it renders Upgrade-to-connect-more (→/settings/billing) instead of opening Link, and maps plaid_connection_limit errors to an upgrade toast." \
  -m "Refs CROWDEV-330" -m "Co-authored-by: Claude <noreply@anthropic.com>"
```

---

## Task 12: Docs — AGENTS.md, README, .env.example

**Files:**
- Modify: `AGENTS.md` (add a "Billing & plan gating" section)
- Modify: `README.md` (mention Free/Pro tiers + env)
- Modify: `.env.example` (add the new env vars)
- Modify: `packages/backend/convex/agent/budgets.ts` doc comment if it still references `AGENT_BUDGET_MONTHLY_TOKENS`

- [ ] **Step 1: `.env.example`** — add under a new `# Billing (Clerk Billing / plan gating)` block:

```bash
# Pro plan slug as configured in the Clerk dashboard (used by has({plan}) + webhook)
CLERK_PRO_PLAN_SLUG=pro
NEXT_PUBLIC_CLERK_PRO_PLAN_SLUG=pro
# Comma-separated Clerk user ids that always resolve to unlimited (owner/demo)
BILLING_UNLIMITED_USER_IDS=
# Optional per-plan monthly chat token backstops (defaults 500k free / 10M pro)
BILLING_FREE_CHAT_TOKENS=
BILLING_PRO_CHAT_TOKENS=
```

- [ ] **Step 2: `AGENTS.md`** — add a section documenting: the Free/Pro limits table (15/500 msgs, 1/5 connections, token backstops), that plan is mirrored to `users.plan` via `subscription.*` Clerk webhooks, that `BILLING_UNLIMITED_USER_IDS` grants unlimited (the documented owner exception, like the Plaid prod exception), and that `AGENT_BUDGET_MONTHLY_TOKENS` is **superseded** by per-plan `chatTokensPerMonth` (no longer the cap). Note plans must exist in the Clerk dashboard (Task 0).

- [ ] **Step 3: `README.md`** — one short paragraph under features/setup: SmartPockets has a Free tier (limited AI chat + 1 bank connection) and a Pro tier ($10/mo) via Clerk Billing; point to AGENTS.md for the limits + env.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md README.md .env.example
git commit -m "CROWDEV-330 Document plan gating + billing env" \
  -m "AGENTS.md billing section (limits, webhook sync, owner allowlist, superseded AGENT_BUDGET_MONTHLY_TOKENS); README tier note; .env.example billing vars." \
  -m "Refs CROWDEV-330" -m "Co-authored-by: Claude <noreply@anthropic.com>"
```

---

## Final Verification (after Task 0 + all tasks)

- [ ] **Backend suite green:** `bun --filter @repo/backend test` (at least the new files + the existing agent/budget/plaid suites).
- [ ] **Typecheck:** `bun typecheck` (root) and `cd apps/app && bun typecheck`.
- [ ] **Lint/build:** `bun lint` and `bun run build`.
- [ ] **Deploy functions:** `cd packages/backend && bunx convex dev --once`.
- [ ] **End-to-end (manual, requires Task 0 done):**
  - Free account: send ~15 chat messages → the 16th is blocked with the upgrade banner → `/settings/billing`.
  - Free account with 1 bank connected: the Plaid button shows "Upgrade to connect more"; a direct `onboardNewConnectionAction` call throws `plaid_connection_limit`.
  - Subscribe to Pro via `/settings/billing` (the existing Clerk Billing checkout, Stripe test card) → within seconds `users.plan` flips to `pro` (verify in Convex dashboard) → chat + Plaid caps lift to 500 / 5. `has({ plan: 'pro' })` gives instant UI unlock before the webhook lands.
  - Owner account (allowlisted): never blocked.
- [ ] **Linear:** comment on CROWDEV-330 with verification evidence + the commit SHAs (Graphite PR link only if a PR was explicitly requested). Move to Done only if the shipped state on `main` matches the acceptance criteria; otherwise leave In Progress.

## Spec coverage check

| Spec section | Task |
|---|---|
| §5 schema (users.plan, usageCounters) | Task 2 |
| §6 entitlements module | Task 1 |
| §7.1 plan-aware checkHeadroom + message_cap | Task 5 |
| §7.2 counter increment at both turn paths | Task 6 |
| §8 Plaid cap (link-token + exchange/onboard) | Task 7 |
| §10 Clerk Billing → users.plan webhook sync | Tasks 0, 4 |
| §11 owner allowlist + fail-safe | Task 3 (resolver), used in 5/7/8 |
| §12 pricing page, usage query, chat + Plaid CTAs | Tasks 8, 9, 10, 11 |
| §13 error taxonomy (message_cap, plaid_connection_limit) | Tasks 5, 7, 10, 11 |
| §14 tests | Tasks 1, 3, 4, 5, 6, 7, 8 |
| Docs (global rule: README+AGENTS with code) | Task 12 |
