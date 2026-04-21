# W7: Email System Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every code change follows TDD (failing test first; minimal implementation; green; commit). Per master brief Section 6 and the per-task "Recommended agent" tag, tasks are executed by Claude Code or Codex.

**Goal:** Extend the existing `@convex-dev/resend` 0.2.3 + React Email foundation with eight new MVP templates, a typed dispatch API for W4 and W6, RFC 8058 one-click unsubscribe, `/settings/notifications` preferences, a unified `emailEvents` log, hard-bounce + complaint suppression, and the production rollout (env vars, DNS, logo hosting, webhook route, Inngest cleanup).

**Architecture:** Spec at [specs/W7-email.md](W7-email.md); brainstorm at [specs/W7-email.brainstorm.md](W7-email.brainstorm.md); research at [specs/W7-email.research.md](W7-email.research.md); shared idempotency spike at [specs/00-idempotency-semantics.md](00-idempotency-semantics.md); cross-workstream contracts at [specs/00-contracts.md](00-contracts.md). Strategy: producer-insert dedup via unique `idempotencyKey` field; `workflow.start` only fires on new insert; shared hash utility reused by W5; dispatch actions are typed per-template wrappers over the workflow layer.

**Tech Stack:** TypeScript, Convex 1.31.x + Convex Ents 0.16.0, `@convex-dev/resend` 0.2.3, `@convex-dev/workflow` (installed by W2), `@react-email/render` + `@react-email/components` 0.4.0, `svix` (transitive via component), `jose` for HMAC (already in repo via plaid component), Clerk Backend API (for user.updated webhook), Tailwind CSS (email templates), vitest 3.x, `convex-test` (wired by W4 Task W4.1), bun 1.1.42, Turborepo, Graphite, CodeRabbit.

---

## Plan Handoff Header

| Field | Value |
|---|---|
| Linear milestone | M3 Agentic Home |
| Linear sub-project | W7 email |
| Linear issues | One per task (W7.1 through W7.14); created at plan kickoff in Linear M3 > W7 sub-project |
| Recommended primary agent | Codex-heavy (well-specified template / dispatch / workflow work). Claude Code for auth-sensitive and pattern-establishing tasks (W7.2 Clerk email mirror, W7.6 HMAC token + idempotent POST, W7.8 handleEmailEvent suppression, W7.10 pattern task, W7.11 pattern task). See per-task tags. |
| Required MCP servers | Convex MCP (schema + function execution + logs); Clerk MCP (user.updated webhook verification + backfill query); Graphite MCP (`gt` branch + stack management). Plaid MCPs not required. |
| Required read access | Repo only. Node modules at `node_modules/@convex-dev/resend/src/` for implementation reference. |
| Prerequisite plans (must be merged) | W0 (on `main`, commit `5ad246f`); W2's `@convex-dev/workflow` install PR (install lives in [packages/backend/convex/convex.config.ts](../packages/backend/convex/convex.config.ts) per contracts §11); W4 Task W4.1 (`convex-test` harness for `packages/backend`, reused here). W5 and W6 are not prerequisites but consume via the shared hashing utility and the dispatch API respectively. |
| Branch (track root) | `feat/agentic-home/W7-email-01-schema` (Task W7.1); subsequent tasks stack via `gt create` |
| Graphite stack parent | `main` (W7 is Track F root per master brief Section 11; the W2 workflow install and the W4 test harness land before the W7 stack starts, but W7 branches from `main` after those merge) |
| Worktree directory | `~/Developer/smartpockets-W7-email` |
| Estimated PRs in stack | 14 (one per task; each 100 to 500 LOC) |
| Review bot | CodeRabbit (mandatory pass before merge) |
| Rollback plan | All changes additive: three new Ents tables (unique constraint on `emailEvents.idempotencyKey`); one new field on `users.email` (nullable); new `internalAction`s; new HTTP routes; new crons; new templates alongside existing 22. No data migration to reverse. `gt restack` drops any PR. Production prerequisites (W7.14) are human-gated; the last PR is reversible. |
| Acceptance checklist | See Section "Global acceptance checklist" at the bottom of this file. Every task has per-task acceptance inline. |

### Context bootstrap (for fresh agent sessions)

Before starting, the agent must:

1. Read [AGENTS.md](../AGENTS.md) and [CLAUDE.md](../CLAUDE.md).
2. Read [specs/W0-existing-state-audit.md](W0-existing-state-audit.md), specifically Sections 15 (email infra) and 16 (TODO.md blockers).
3. Read [specs/W7-email.md](W7-email.md) top to bottom.
4. Read this file top to bottom.
5. Read [specs/W7-email.research.md](W7-email.research.md).
6. Read [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) §4.
7. Read [specs/00-contracts.md](00-contracts.md) §9, §13, §14, §15.
8. Read [node_modules/@convex-dev/resend/src/client/index.ts](../node_modules/@convex-dev/resend/src/client/index.ts) (public API surface).
9. Run `git fetch origin` and confirm the worktree is on `main` with prerequisite PRs merged.
10. Verify MCP servers respond: `Convex MCP ok`, `Clerk MCP ok` (for W7.2), `Graphite MCP ok`.
11. Verify `bun --version` reports `1.1.42`.

### Global commit + build rules (applies to every task)

- Atomic conventional commits per [CLAUDE.md](../CLAUDE.md): `feat(email): ...`, `test(email): ...`, `docs(email): ...`, `chore(email): ...`.
- Graphite for branch and PR management: `gt create <branch-name> -m "<message>"`, `gt submit --stack`. Never raw `git push` to feature branches.
- After any schema change: `bun typecheck` must pass at root.
- After any change to `packages/email/emails/`: `bun dev:email` must render without errors.
- After any change to `packages/backend/convex/email/`: `cd packages/backend && bunx convex dev --once` to push schema + function definitions locally.
- No em-dashes anywhere (code, comments, copy, commit messages, PR descriptions). Prefer colons, parentheses, semicolons, fresh sentences.
- CodeRabbit must pass before merging each PR in the stack.
- Cross-agent review per master brief Section 11: Codex-authored PRs get a Claude Code review before merge; Claude Code-authored PRs get a Codex review.
- Never import `query` / `mutation` from `./_generated/server`; import from `./functions`. `internalAction`, `internalMutation`, `action` come from `./_generated/server`.
- Never accept `userId` in public-function args; always derive from `ctx.viewerX()`. `internalAction`s accept `userId` because they are called server-to-server.

---

## Task dependency graph

```
W7.1 (schema + hashing)
  └─> W7.2 (users.email + Clerk webhooks)
  └─> W7.9 (sendResendRaw consumes EMAIL_CONFIG)
  └─> W7.10 (dispatch actions consume hashing + schema)

W7.2 (Clerk email mirror)
  └─> W7.9 (getUserEmail helper)
  └─> W7.10 (dispatch resolves email)

W7.3 (draft copy)
  └─> W7.4 (React Email templates from drafts)

W7.4 (templates)
  └─> W7.5 (templates registry)

W7.5 (registry)
  └─> W7.11 (workflows render templates)

W7.6 (HMAC + unsubscribe routes)
  └─> W7.11 (workflows set List-Unsubscribe headers)
  └─> W7.12 (preferences page; flip also happens via unsubscribe)

W7.7 (/resend-webhook route)
  └─> W7.8 (handleEmailEvent receives events)

W7.8 (handleEmailEvent + suppression)
  └─> W7.11 (preCheck reads suppressions)
  └─> W7.13 (getBounceStatus reads suppressions)

W7.9 (sendResendRaw + dev-mode gate)
  └─> W7.11 (workflows dispatch)

W7.10 (dispatch actions)
  └─> W7.11 (workflows consume emailEventId)
  └─> W7.13 (crons call dispatch)

W7.11 (workflows)
  └─> W7.14 (acceptance tests)

W7.12 (preferences page + getBounceStatus)
  └─> W7.14 (acceptance)

W7.13 (crons)
  └─> W7.14 (acceptance)
```

Linear stack order:

1. W7.1, W7.2, W7.3 (can run in parallel; all land before W7.4)
2. W7.4
3. W7.5, W7.6, W7.7 (parallel)
4. W7.8, W7.9 (parallel after W7.7)
5. W7.10
6. W7.11
7. W7.12, W7.13 (parallel after W7.10)
8. W7.14 (final; production rollout + integration tests)

Each task produces one Graphite branch and one PR. The stack anchors at `main` after prerequisite PRs merge.

---

## Task W7.1: Schema additions and shared hashing utility

**Recommended agent:** Codex.
**Rationale:** Well-specified schema work with a clear contract; the hashing utility is a pure function with test cases enumerated.
**Linear issue:** `LIN-W7-01` (placeholder; create at plan kickoff).

**Files:**
- Modify: [packages/backend/convex/schema.ts](../packages/backend/convex/schema.ts) (add `notificationPreferences`, `emailEvents`, `emailSuppressions` ents; add `email` field to `users`).
- Create: `packages/backend/convex/notifications/hashing.ts`.
- Create: `packages/backend/convex/notifications/__tests__/hashing.test.ts`.

**Scope:**
- Schema fields and indexes per spec §5.
- Hashing utility per spike §4.4.
- Zero behavior change to existing tables.

**Coordination note (contracts §10.1):** the canonical hashing utility location is `packages/backend/convex/notifications/hashing.ts`. W5 and W6 also consume from this path. If W5's or W6's stack lands the file first, **this task becomes a verification-only step**: confirm the file exists, confirm its `idempotencyKey` signature matches spike §4.4 (inputs: `{ userId, scope, cadence?, ids?, dateBucket? }`), and skip re-creation. If the existing file diverges, open an amendment PR against [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) and [specs/00-contracts.md](00-contracts.md) §10 per the amendment protocol (contracts §18); do not silently fork. In all cases the hashing test in Step 2 below must pass.

**Acceptance:**
- `bun typecheck` passes at root.
- `cd packages/backend && bunx convex dev --once` pushes successfully.
- `bun test` in `packages/backend` runs the new hashing test green.

**Steps:**

- [ ] **Step 1: Read existing schema for conventions.**

Read [packages/backend/convex/schema.ts](../packages/backend/convex/schema.ts) end to end. Note the `defineEntSchema` + `defineEnt` + `.field(...)` pattern, the edge style (`edge("user")`, `edges("walletCards", { ref: true })`), and where `userId` is derived (always via edge).

- [ ] **Step 2: Write the failing hashing test.**

Create `packages/backend/convex/notifications/__tests__/hashing.test.ts`:

```ts
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

  it("handles absent cadence / ids / dateBucket", () => {
    const key = idempotencyKey({ userId: "u", scope: "welcome-class" });
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });
});
```

- [ ] **Step 3: Run the test; confirm it fails because `hashing` does not exist.**

Run: `cd packages/backend && bun test notifications/__tests__/hashing.test.ts`
Expected: import error on `../hashing`.

- [ ] **Step 4: Write the minimal implementation.**

Create `packages/backend/convex/notifications/hashing.ts`:

```ts
import { createHash } from "crypto";

export type IdempotencyInput = {
  userId: string;
  scope: string;
  cadence?: number;
  ids?: string[];
  dateBucket?: string;
};

export function idempotencyKey(input: IdempotencyInput): string {
  const canonical = JSON.stringify({
    u: input.userId,
    s: input.scope,
    c: input.cadence ?? null,
    i: input.ids ? [...input.ids].sort() : null,
    d: input.dateBucket ?? null,
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
```

- [ ] **Step 5: Run the test; confirm all cases pass.**

Run: `cd packages/backend && bun test notifications/__tests__/hashing.test.ts`
Expected: 6 passed.

- [ ] **Step 6: Add schema additions.**

Modify [packages/backend/convex/schema.ts](../packages/backend/convex/schema.ts). Add `email` to users; add three new ents. Follow exactly the shape in [specs/W7-email.md §5](W7-email.md).

- [ ] **Step 7: Push schema locally.**

Run: `cd packages/backend && bunx convex dev --once`
Expected: schema pushes; no errors. If `testMode: false` on `@convex-dev/resend` conflicts with the local dev env, ensure `RESEND_API_KEY` is set.

- [ ] **Step 8: Typecheck.**

Run: `bun typecheck`
Expected: no errors.

- [ ] **Step 9: Commit.**

```bash
gt create feat/agentic-home/W7-email-01-schema -m "feat(email): add notification preferences, email events, suppressions ents and shared hashing utility"
```

**Per-task acceptance checklist:**

- [ ] Typecheck passes.
- [ ] Hashing test passes.
- [ ] Convex dev push succeeds.
- [ ] CodeRabbit clean.
- [ ] Claude Code reviews this Codex-authored PR before merge.

---

## Task W7.2: Clerk email mirror and user.updated webhook

**Recommended agent:** Claude Code.
**Rationale:** Auth-sensitive code; touches the existing Clerk webhook handler. Multi-file: schema (already landed), webhook handler, backfill action, helper query.
**Linear issue:** `LIN-W7-02`.

**Files:**
- Modify: [packages/backend/convex/http.ts](../packages/backend/convex/http.ts) (add `user.updated` branch; extend `user.created` to populate `email`).
- Create: `packages/backend/convex/email/internal.ts` (houses `getUserEmail` internal query and `backfillEmailsFromClerk` internal action).
- Modify: [packages/backend/convex/users/mutations.ts](../packages/backend/convex/users/mutations.ts) or equivalent existing user-management file (extend upsert to accept `email`).
- Create: `packages/backend/convex/email/__tests__/internal.test.ts`.

**Scope:**
- `users.email` mirrored from Clerk primary email on `user.created` and `user.updated`.
- One-time backfill runnable via Convex dashboard.
- `getUserEmail` internal query: throws with a clear message if email missing.

**Steps:**

- [ ] **Step 1: Find the existing Clerk webhook handler.**

Run: `Grep` for `user.created` and `svix` in `packages/backend/convex/http.ts`. Note the current signature verification pattern.

- [ ] **Step 2: Write failing test for `getUserEmail`.**

Create `packages/backend/convex/email/__tests__/internal.test.ts`:

```ts
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../../schema";
import { api, internal } from "../../_generated/api";

describe("getUserEmail", () => {
  it("returns the lowercased email for an existing user", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => {
      return await ctx.table("users").insert({ externalId: "user_x", email: "Eric@Example.COM", name: "Eric", connectedAccounts: [] });
    });
    const email = await t.query(internal.email.internal.getUserEmail, { userId });
    expect(email).toBe("eric@example.com");
  });

  it("throws if email is not cached", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => {
      return await ctx.table("users").insert({ externalId: "user_y", email: undefined, name: "U", connectedAccounts: [] });
    });
    await expect(t.query(internal.email.internal.getUserEmail, { userId })).rejects.toThrow(/no email cached/i);
  });
});
```

- [ ] **Step 3: Run the test; confirm failure.**

Run: `cd packages/backend && bun test email/__tests__/internal.test.ts`
Expected: import error on `internal`.

- [ ] **Step 4: Implement `getUserEmail` internal query.**

Create `packages/backend/convex/email/internal.ts`:

```ts
import { v } from "convex/values";
import { internalQuery } from "../functions";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { createClerkClient } from "@clerk/backend";

export const getUserEmail = internalQuery({
  args: { userId: v.id("users") },
  returns: v.string(),
  handler: async (ctx, { userId }) => {
    const user = await ctx.table("users").getX(userId);
    if (!user.email) {
      throw new Error(`User ${userId} has no email cached; run backfillEmailsFromClerk`);
    }
    return user.email.toLowerCase();
  },
});

export const backfillEmailsFromClerk = internalAction({
  args: { batchSize: v.optional(v.number()) },
  returns: v.object({ updated: v.number(), missing: v.number() }),
  handler: async (ctx, { batchSize = 100 }) => {
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
    let updated = 0;
    let missing = 0;

    const usersWithoutEmail = await ctx.runQuery(internal.email.internal.listUsersWithoutEmail, { limit: batchSize });
    for (const user of usersWithoutEmail) {
      try {
        const clerkUser = await clerk.users.getUser(user.externalId);
        const primary = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId);
        if (primary?.emailAddress) {
          await ctx.runMutation(internal.email.internal.setUserEmail, { userId: user._id, email: primary.emailAddress });
          updated++;
        } else {
          missing++;
        }
      } catch {
        missing++;
      }
    }
    return { updated, missing };
  },
});

export const listUsersWithoutEmail = internalQuery({
  args: { limit: v.number() },
  returns: v.array(v.object({ _id: v.id("users"), externalId: v.string() })),
  handler: async (ctx, { limit }) => {
    const users = await ctx.table("users").filter(q => q.eq(q.field("email"), undefined)).take(limit);
    return users.map(u => ({ _id: u._id, externalId: u.externalId }));
  },
});

export const setUserEmail = internalMutation({
  args: { userId: v.id("users"), email: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, email }) => {
    const user = await ctx.table("users").getX(userId);
    await user.patch({ email: email.toLowerCase() });
    return null;
  },
});
```

(Add `internalMutation` import from `./functions` above.)

- [ ] **Step 5: Run the test; confirm it passes.**

Run: `cd packages/backend && bun test email/__tests__/internal.test.ts`
Expected: 2 passed.

- [ ] **Step 6: Extend `user.created` handler to populate `email`.**

Modify [packages/backend/convex/http.ts](../packages/backend/convex/http.ts). Find the `user.created` branch; add `email` population from `data.email_addresses[0].email_address` (or the primary per `data.primary_email_address_id`).

- [ ] **Step 7: Add `user.updated` branch to the same webhook handler.**

Handle email changes by re-reading Clerk payload and patching `users.email`.

- [ ] **Step 8: Typecheck.**

Run: `bun typecheck`
Expected: clean.

- [ ] **Step 9: Manual smoke test against Clerk dev.**

Create a test user in Clerk dashboard; confirm `user.created` fires and the `users.email` row is populated. Then update the email in Clerk; confirm `user.updated` fires and the row is patched.

- [ ] **Step 10: Run backfill in Convex dev dashboard.**

Run: `await internal.email.internal.backfillEmailsFromClerk({})`
Expected: `{ updated: <some-number>, missing: 0 }` for existing users.

- [ ] **Step 11: Commit.**

```bash
gt create feat/agentic-home/W7-email-02-clerk-email-mirror -m "feat(email): mirror Clerk primary email on users.email with user.created/updated webhooks and backfill"
```

**Per-task acceptance checklist:**

- [ ] `getUserEmail` test passes.
- [ ] New user via Clerk dashboard populates `users.email`.
- [ ] Email change in Clerk patches `users.email` via `user.updated`.
- [ ] Backfill succeeds for all existing users.
- [ ] Typecheck clean; CodeRabbit clean.
- [ ] Codex reviews this Claude Code-authored PR before merge.

---

## Task W7.3: Draft eight template body copy

**Recommended agent:** Codex.
**Rationale:** Pure markdown copy work against the spec. No code.
**Linear issue:** `LIN-W7-03`.

**Files:**
- Create: `packages/email/emails/drafts/welcome-onboarding.draft.md`
- Create: `packages/email/emails/drafts/weekly-digest.draft.md`
- Create: `packages/email/emails/drafts/promo-warning.draft.md`
- Create: `packages/email/emails/drafts/statement-closing.draft.md`
- Create: `packages/email/emails/drafts/anomaly-alert.draft.md`
- Create: `packages/email/emails/drafts/reconsent-required.draft.md`
- Create: `packages/email/emails/drafts/item-error-persistent.draft.md`
- Create: `packages/email/emails/drafts/subscription-detected.draft.md`

**Scope:**
- One markdown file per MVP template.
- Each draft contains: subject line variants (one primary, optional variant for cadence), preview text (the gmail snippet), body copy in the voice of the product (plain, direct, useful, no marketing tone), CTA copy, and prop-substitution placeholders (`{{firstName}}`, `{{cardName}}`, etc.).
- No em-dashes. Colons, parentheses, semicolons, fresh sentences.
- Drafts represent intent; W7.4 converts them into React Email tsx templates.

**Content rules per template (use the base templates already in this repo at [packages/email/emails/drafts/](../packages/email/emails/drafts/) as shells):**

The brainstorm + spec already describes each template's purpose and payload. Each draft file follows this shape:

```markdown
# {Template Key}

**Tier:** essential | non-essential
**Trigger:** <who calls dispatch and when>
**Cadence:** <one-shot | per cadence | per window>
**Payload shape:** <link to spec §6 dispatch signature>

## Subject

Primary: "..."
(Variant for cadence N: "...")

## Preview text (≤ 90 chars)

"..."

## Body

(Copy, in product voice. Use {{placeholders}} for prop substitution. No em-dashes.)

## Primary CTA

Text: "..."
Links to: <URL pattern>

## Secondary CTA (optional)

Text: "..."
Links to: <URL pattern>

## Footer notes

(Any non-standard footer content beyond the default EmailBrandConfig footer.)
```

**Steps:**

- [ ] **Step 1: Read the 22 existing templates' copy conventions.**

Scan [packages/email/emails/simple-welcome-01.tsx](../packages/email/emails/simple-welcome-01.tsx), [packages/email/emails/payment-failed.tsx](../packages/email/emails/payment-failed.tsx), and [packages/email/emails/trial-ending.tsx](../packages/email/emails/trial-ending.tsx) to internalize the voice.

- [ ] **Step 2: Write each draft file one at a time.**

Use the bodies provided inline at the bottom of this plan (Task W7.3 Appendix). Each draft is copy-only; no tsx.

- [ ] **Step 3: Run an em-dash check across the drafts.**

Run `Grep` for U+2014 (em-dash) and U+2013 (en-dash) across `packages/email/emails/drafts/` using the pattern `\x{2014}|\x{2013}`.
Expected: no matches.

- [ ] **Step 4: Commit.**

```bash
gt create feat/agentic-home/W7-email-03-drafts -m "docs(email): draft copy bodies for eight MVP agentic emails"
```

**Per-task acceptance checklist:**

- [ ] Eight files created.
- [ ] No em-dashes anywhere.
- [ ] Each file covers subject, preview, body, CTA per the shape above.
- [ ] Claude Code reviews this Codex-authored PR before merge.

**NOTE:** draft content for all eight templates is written in Task W7.3 Appendix at the bottom of this plan. The executing agent copies each draft block into its filename verbatim.

---

## Task W7.4: React Email template components

**Recommended agent:** Codex.
**Rationale:** Repetitive tsx work against approved drafts; `simple-welcome-01` is the shell reference; each template follows a consistent pattern.
**Linear issue:** `LIN-W7-04`.

**Files:**
- Create: `packages/email/emails/welcome-onboarding.tsx`
- Create: `packages/email/emails/weekly-digest.tsx`
- Create: `packages/email/emails/promo-warning.tsx`
- Create: `packages/email/emails/statement-closing.tsx`
- Create: `packages/email/emails/anomaly-alert.tsx`
- Create: `packages/email/emails/reconsent-required.tsx`
- Create: `packages/email/emails/item-error-persistent.tsx`
- Create: `packages/email/emails/subscription-detected.tsx`

**Scope:**
- Each template consumes typed props (matching the dispatch action payload shape from spec §6).
- Each template exports a React component AND a `PreviewProps` object (React Email convention) for `bun dev:email` preview.
- Reuse existing `_components/` atoms and `_theme/` tokens.
- Subject line is NOT part of the component; it's passed via the dispatch action. Preview text uses `<Preview>{...}</Preview>` per React Email docs.
- Accept optional `theme: "light" | "dark"` prop (default light) matching the existing factory convention.

**Steps:**

- [ ] **Step 1: Port `simple-welcome-01.tsx` as a starting shell for `welcome-onboarding`.**

Copy [packages/email/emails/simple-welcome-01.tsx](../packages/email/emails/simple-welcome-01.tsx) to `welcome-onboarding.tsx`. Replace copy blocks with content from `welcome-onboarding.draft.md`. Implement the `variant: "signup-only" | "plaid-linked"` conditional body.

- [ ] **Step 2: `bun dev:email` render check.**

Run: `bun dev:email` in a separate terminal. Open `http://localhost:3003/preview/welcome-onboarding`. Both variants render without error.

- [ ] **Step 3: Repeat for each remaining template.**

Use the draft file as the copy source. Base structure: `<Html><Head /><Preview>...</Preview><Body><Container>... header, content, primary CTA, secondary CTA, footer ...</Container></Body></Html>`.

- [ ] **Step 4: Em-dash check across new tsx files.**

Run `Grep` for U+2014 (em-dash) and U+2013 (en-dash) in `packages/email/emails/*.tsx` filtered to the new eight, using the pattern `\x{2014}|\x{2013}`.
Expected: none.

- [ ] **Step 5: Run the full email dev preview for each of the eight.**

Visit each at `http://localhost:3003/preview/<name>` and confirm renders cleanly.

- [ ] **Step 6: Commit.**

```bash
gt create feat/agentic-home/W7-email-04-templates -m "feat(email): add eight React Email templates for MVP agentic notifications"
```

**Per-task acceptance checklist:**

- [ ] 8 tsx files created.
- [ ] Each renders in `bun dev:email`.
- [ ] Each consumes typed props that match spec §6 dispatch signatures.
- [ ] No em-dashes.
- [ ] Claude Code reviews.

---

## Task W7.5: Template registry and factory entries

**Recommended agent:** Codex.
**Rationale:** Straightforward extension of the existing `TemplateType` union and `templateFactory` record.
**Linear issue:** `LIN-W7-05`.

**Files:**
- Modify: [packages/backend/convex/email/templates.ts](../packages/backend/convex/email/templates.ts) (add eight import + factory entries + TemplateType values).

**Steps:**

- [ ] **Step 1: Add imports.**

At the top of `templates.ts`, add:

```ts
import { WelcomeOnboarding } from "@repo/email/templates/welcome-onboarding";
import { WeeklyDigest } from "@repo/email/templates/weekly-digest";
import { PromoWarning } from "@repo/email/templates/promo-warning";
import { StatementClosing } from "@repo/email/templates/statement-closing";
import { AnomalyAlert } from "@repo/email/templates/anomaly-alert";
import { ReconsentRequired } from "@repo/email/templates/reconsent-required";
import { ItemErrorPersistent } from "@repo/email/templates/item-error-persistent";
import { SubscriptionDetected } from "@repo/email/templates/subscription-detected";
```

- [ ] **Step 2: Extend `TemplateType`.**

Add these literals to the `TemplateType` union:

```ts
| "welcome-onboarding"
| "weekly-digest"
| "promo-warning"
| "statement-closing"
| "anomaly-alert"
| "reconsent-required"
| "item-error-persistent"
| "subscription-detected"
```

- [ ] **Step 3: Add factory entries.**

Add to `templateFactory`:

```ts
"welcome-onboarding": (props) => React.createElement(WelcomeOnboarding, props),
"weekly-digest": (props) => React.createElement(WeeklyDigest, props),
"promo-warning": (props) => React.createElement(PromoWarning, props),
"statement-closing": (props) => React.createElement(StatementClosing, props),
"anomaly-alert": (props) => React.createElement(AnomalyAlert, props),
"reconsent-required": (props) => React.createElement(ReconsentRequired, props),
"item-error-persistent": (props) => React.createElement(ItemErrorPersistent, props),
"subscription-detected": (props) => React.createElement(SubscriptionDetected, props),
```

- [ ] **Step 4: Typecheck.**

Run: `bun typecheck`
Expected: clean (the `@repo/email/templates/*` paths should resolve since `packages/email/` exports templates via the workspace).

- [ ] **Step 5: Add a registry integration test.**

Create `packages/backend/convex/email/__tests__/templates.test.ts`:

```ts
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../../schema";
import { internal } from "../../_generated/api";

describe("renderTemplate", () => {
  it.each([
    "welcome-onboarding",
    "weekly-digest",
    "promo-warning",
    "statement-closing",
    "anomaly-alert",
    "reconsent-required",
    "item-error-persistent",
    "subscription-detected",
  ])("renders %s with PreviewProps", async (key) => {
    const t = convexTest(schema);
    const { PreviewProps } = await import(`@repo/email/templates/${key}`);
    const html = await t.action(internal.email.templates.renderTemplate, { template: key, props: PreviewProps });
    expect(html).toContain("<html");
    expect(html.length).toBeGreaterThan(500);
  });
});
```

- [ ] **Step 6: Run the test.**

Run: `cd packages/backend && bun test email/__tests__/templates.test.ts`
Expected: 8 passed.

- [ ] **Step 7: Commit.**

```bash
gt create feat/agentic-home/W7-email-05-registry -m "feat(email): register eight MVP templates in renderTemplate factory"
```

**Per-task acceptance checklist:**

- [ ] Registry extended.
- [ ] 8 render tests pass.
- [ ] Typecheck clean; CodeRabbit clean.
- [ ] Claude Code reviews.

---

## Task W7.6: HMAC unsubscribe token and `/email/unsubscribe` routes

**Recommended agent:** Claude Code.
**Rationale:** Crypto surface; idempotent POST endpoint semantics per RFC 8058; auth-adjacent.
**Linear issue:** `LIN-W7-06`.

**Files:**
- Create: `packages/backend/convex/email/unsubscribeToken.ts`.
- Create: `packages/backend/convex/email/__tests__/unsubscribeToken.test.ts`.
- Modify: [packages/backend/convex/http.ts](../packages/backend/convex/http.ts) (add POST and GET routes).
- Create: `packages/backend/convex/email/mutations.ts` if not existing (add `flipPreferenceFromToken` internal mutation).

**Steps:**

- [ ] **Step 1: Write failing token tests.**

Create the test file:

```ts
import { describe, it, expect } from "vitest";
import { signUnsubscribeToken, verifyUnsubscribeToken } from "../unsubscribeToken";

describe("unsubscribe token", () => {
  const key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  it("signs and verifies a fresh token", () => {
    const token = signUnsubscribeToken({ userId: "u1", templateKey: "weekly-digest" }, key);
    const verified = verifyUnsubscribeToken(token, key);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.data.userId).toBe("u1");
      expect(verified.data.templateKey).toBe("weekly-digest");
      expect(verified.data.expired).toBe(false);
    }
  });

  it("rejects an invalid signature", () => {
    const token = signUnsubscribeToken({ userId: "u1", templateKey: "weekly-digest" }, key);
    const tampered = token.slice(0, -5) + "XXXXX";
    const verified = verifyUnsubscribeToken(tampered, key);
    expect(verified.ok).toBe(false);
  });

  it("marks expired but still verifiable after 30 days", () => {
    const expired = signUnsubscribeToken({ userId: "u1", templateKey: "weekly-digest", ts: Date.now() - 40 * 24 * 60 * 60 * 1000 }, key);
    const verified = verifyUnsubscribeToken(expired, key);
    expect(verified.ok).toBe(true);
    if (verified.ok) expect(verified.data.expired).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test; confirm failure.**

Run: `cd packages/backend && bun test email/__tests__/unsubscribeToken.test.ts`
Expected: import error on `../unsubscribeToken`.

- [ ] **Step 3: Implement `unsubscribeToken.ts`.**

```ts
import { createHmac, timingSafeEqual } from "crypto";

type TokenPayload = { userId: string; templateKey: string; ts?: number };
type VerifiedPayload = { userId: string; templateKey: string; expired: boolean };

const TTL_MS = 30 * 24 * 60 * 60 * 1000;

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(s: string): Buffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "==".slice((s.length + 3) % 4);
  return Buffer.from(padded, "base64");
}

function hmac(payload: string, key: string): Buffer {
  return createHmac("sha256", Buffer.from(key, "hex")).update(payload, "utf8").digest();
}

export function signUnsubscribeToken(input: TokenPayload, key: string): string {
  const payload = { u: input.userId, t: input.templateKey, ts: input.ts ?? Date.now() };
  const encoded = base64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = base64url(hmac(encoded, key));
  return `${encoded}.${sig}`;
}

export function verifyUnsubscribeToken(token: string, key: string):
  | { ok: true; data: VerifiedPayload }
  | { ok: false; reason: string }
{
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [encoded, sig] = parts;
  const expected = base64url(hmac(encoded, key));
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "bad signature" };
  try {
    const parsed = JSON.parse(base64urlDecode(encoded).toString("utf8")) as { u: string; t: string; ts: number };
    const expired = Date.now() - parsed.ts > TTL_MS;
    return { ok: true, data: { userId: parsed.u, templateKey: parsed.t, expired } };
  } catch {
    return { ok: false, reason: "unparseable" };
  }
}
```

- [ ] **Step 4: Run the test; confirm pass.**

Run: `cd packages/backend && bun test email/__tests__/unsubscribeToken.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Implement `flipPreferenceFromToken` internal mutation.**

In `packages/backend/convex/email/mutations.ts`:

```ts
import { v } from "convex/values";
import { internalMutation } from "../functions";

const TEMPLATE_KEYS = [
  "weekly-digest",
  "promo-warning",
  "statement-closing",
  "anomaly-alert",
  "subscription-detected",
] as const;

export const flipPreferenceFromToken = internalMutation({
  args: { userId: v.id("users"), templateKey: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, templateKey }) => {
    if (!TEMPLATE_KEYS.includes(templateKey as typeof TEMPLATE_KEYS[number])) return null;
    const existing = await ctx.table("notificationPreferences").getX("userId", userId);
    const field = `${camel(templateKey)}Enabled` as keyof typeof existing;
    await existing.patch({ [field]: false, updatedAt: Date.now() } as Record<string, unknown>);
    return null;
  },
});

function camel(kebab: string): string {
  return kebab.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
```

- [ ] **Step 6: Add the HTTP routes.**

Modify `packages/backend/convex/http.ts`:

```ts
http.route({
  path: "/email/unsubscribe",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return new Response("missing token", { status: 400 });

    const verified = verifyUnsubscribeToken(token, process.env.EMAIL_UNSUBSCRIBE_SIGNING_KEY!);
    if (!verified.ok) return new Response("invalid signature", { status: 400 });

    await ctx.runMutation(internal.email.mutations.flipPreferenceFromToken, {
      userId: verified.data.userId as Id<"users">,
      templateKey: verified.data.templateKey,
    });

    return new Response(null, { status: verified.data.expired ? 410 : 200 });
  }),
});

http.route({
  path: "/email/unsubscribe",
  method: "GET",
  handler: httpAction(async (_ctx, req) => {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") ?? "";
    const html = `<!doctype html><html><head><title>Unsubscribe</title></head><body style="font-family:system-ui,sans-serif;padding:24px"><h1>Unsubscribe</h1><p>Click the button below to stop receiving this type of email.</p><form method="POST" action="/email/unsubscribe?token=${encodeURIComponent(token)}"><button type="submit" style="padding:12px 20px;background:#16a34a;color:white;border:0;border-radius:6px;cursor:pointer">Confirm unsubscribe</button></form></body></html>`;
    return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }),
});
```

- [ ] **Step 7: Add an integration test for the HTTP routes.**

Use `convex-test`'s HTTP route harness (see `packages/backend/convex/__tests__/` from W4.1) to POST with a valid token and assert 200 + preference flip.

- [ ] **Step 8: Commit.**

```bash
gt create feat/agentic-home/W7-email-06-unsubscribe -m "feat(email): HMAC-signed unsubscribe tokens and RFC 8058 idempotent POST endpoint"
```

**Per-task acceptance checklist:**

- [ ] Token sign/verify tests pass.
- [ ] POST flips preference idempotently.
- [ ] Invalid signature returns 400.
- [ ] Expired token returns 410 with preference still flipped.
- [ ] GET renders confirmation page.
- [ ] Codex reviews.

---

## Task W7.7: `/resend-webhook` HTTP route

**Recommended agent:** Codex.
**Rationale:** One-liner route that delegates to `resend.handleResendEventWebhook`. Well-specified by component docs.
**Linear issue:** `LIN-W7-07`.

**Files:**
- Modify: [packages/backend/convex/http.ts](../packages/backend/convex/http.ts).

**Steps:**

- [ ] **Step 1: Add the route.**

```ts
import { resend } from "./email/resend";

http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});
```

- [ ] **Step 2: Configure Resend dev webhook.**

In the Resend dashboard, add `https://<convex-dev-deployment>.convex.site/resend-webhook`. Copy the svix secret into `RESEND_WEBHOOK_SECRET` env var (Convex dev env).

- [ ] **Step 3: Manual smoke test.**

Send a test event from the Resend dashboard. Verify `handleEmailEvent` fires (log appears). If the signature check fails, verify the secret matches.

- [ ] **Step 4: Commit.**

```bash
gt create feat/agentic-home/W7-email-07-resend-webhook -m "feat(email): add /resend-webhook HTTP route with svix signature verification"
```

**Per-task acceptance checklist:**

- [ ] Route responds 201 to a valid test event.
- [ ] Invalid signature returns 4xx (component throws; Convex returns 500; in production, reconsider downgrade to 4xx via try/catch if desired).
- [ ] CodeRabbit clean.

---

## Task W7.8: Enhanced `handleEmailEvent` with suppression logic

**Recommended agent:** Claude Code.
**Rationale:** Pattern-establishing; careful tier split logic; adjacent to auth decisions.
**Linear issue:** `LIN-W7-08`.

**Files:**
- Modify: [packages/backend/convex/email/events.ts](../packages/backend/convex/email/events.ts).
- Create: `packages/backend/convex/email/__tests__/events.test.ts`.

**Steps:**

- [ ] **Step 1: Write failing tests.**

```ts
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../../schema";
import { api, internal } from "../../_generated/api";

describe("handleEmailEvent", () => {
  it("creates emailSuppressions row on hard bounce", async () => {
    const t = convexTest(schema);
    await t.mutation(internal.email.events.handleEmailEvent, {
      id: "resend_xyz",
      event: {
        type: "email.bounced",
        created_at: new Date().toISOString(),
        data: { email_id: "resend_xyz", to: "dead@example.com", bounce: { type: "hard", message: "No such user" } },
      },
    });
    const supp = await t.run(async (ctx) => ctx.table("emailSuppressions").get("email", "dead@example.com"));
    expect(supp?.reason).toBe("hard_bounce");
  });

  it("creates complaint row on email.complained", async () => {
    const t = convexTest(schema);
    await t.mutation(internal.email.events.handleEmailEvent, {
      id: "resend_abc",
      event: {
        type: "email.complained",
        created_at: new Date().toISOString(),
        data: { email_id: "resend_abc", to: "complainer@example.com" },
      },
    });
    const supp = await t.run(async (ctx) => ctx.table("emailSuppressions").get("email", "complainer@example.com"));
    expect(supp?.reason).toBe("complaint");
  });

  it("does NOT suppress on soft bounce", async () => {
    const t = convexTest(schema);
    await t.mutation(internal.email.events.handleEmailEvent, {
      id: "resend_soft",
      event: {
        type: "email.bounced",
        created_at: new Date().toISOString(),
        data: { email_id: "resend_soft", to: "full@example.com", bounce: { type: "soft", message: "Mailbox full" } },
      },
    });
    const supp = await t.run(async (ctx) => ctx.table("emailSuppressions").get("email", "full@example.com"));
    expect(supp).toBeNull();
  });

  it("increments eventCount on repeat", async () => {
    const t = convexTest(schema);
    for (let i = 0; i < 3; i++) {
      await t.mutation(internal.email.events.handleEmailEvent, {
        id: `r${i}`,
        event: {
          type: "email.bounced",
          created_at: new Date().toISOString(),
          data: { email_id: `r${i}`, to: "same@example.com", bounce: { type: "hard", message: "x" } },
        },
      });
    }
    const supp = await t.run(async (ctx) => ctx.table("emailSuppressions").get("email", "same@example.com"));
    expect(supp?.eventCount).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests; confirm failures.**

Expected: all four fail because `handleEmailEvent` does not yet write to `emailSuppressions`.

- [ ] **Step 3: Implement the new `handleEmailEvent` body.**

Use the reference implementation in [specs/W7-email.md §8](W7-email.md). Add `upsertSuppression` helper. Insert webhook row into `emailEvents` with source discriminator. Guard against duplicate inserts via the unique `idempotencyKey` constraint (webhook rows use key `webhook:${resendEmailId}:${eventType}:${createdAt}`).

- [ ] **Step 4: Run tests; confirm passes.**

Expected: all 4 pass.

- [ ] **Step 5: Commit.**

```bash
gt create feat/agentic-home/W7-email-08-suppression -m "feat(email): suppress hard bounces and complaints; write webhook events to emailEvents"
```

**Per-task acceptance checklist:**

- [ ] 4 suppression tests pass.
- [ ] Webhook row insert is idempotent (second receipt of the same event does not duplicate).
- [ ] Codex reviews.

---

## Task W7.9: `sendResendRaw` action with dev-mode gating

**Recommended agent:** Codex.
**Rationale:** Thin wrapper over the existing component API with clear env-gating logic.
**Linear issue:** `LIN-W7-09`.

**Files:**
- Modify: [packages/backend/convex/email/send.ts](../packages/backend/convex/email/send.ts) (add `sendResendRaw` alongside existing actions).

**Steps:**

- [ ] **Step 1: Add the action per [specs/W7-email.md §14](W7-email.md).**

```ts
export const sendResendRaw = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    headers: v.array(v.object({ name: v.string(), value: v.string() })),
  },
  returns: v.object({ emailId: v.string(), mode: v.union(v.literal("live"), v.literal("dev-capture")) }),
  handler: async (ctx, { to, subject, html, headers }) => {
    const devLive = process.env.EMAIL_DEV_LIVE === "true";
    const deploymentId = process.env.CONVEX_DEPLOYMENT ?? "";
    const isProd = deploymentId.startsWith("prod:");
    const shouldCapture = !isProd && !devLive;

    if (shouldCapture) {
      return { emailId: `devcap_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`, mode: "dev-capture" };
    }

    const effectiveTo = process.env.EMAIL_DEV_OVERRIDE_TO ?? to;
    const emailId = await resend.sendEmail(ctx, {
      from: EMAIL_CONFIG.from.default,
      to: [effectiveTo],
      subject,
      html,
      headers,
    });
    return { emailId: emailId as string, mode: "live" };
  },
});
```

- [ ] **Step 2: Typecheck.**

Run: `bun typecheck`
Expected: clean.

- [ ] **Step 3: Commit.**

```bash
gt create feat/agentic-home/W7-email-09-send-raw -m "feat(email): add sendResendRaw with dev-capture env gating"
```

**Per-task acceptance checklist:**

- [ ] Typecheck clean.
- [ ] Local `bunx convex dev --once` push succeeds.
- [ ] Claude Code reviews.

---

## Task W7.10: Dispatch actions (pattern + 8 templates)

**Recommended agent:** Claude Code for the pattern (dispatchWelcomeOnboarding is the exemplar). Codex for the remaining seven once the pattern is reviewed.
**Rationale:** The first dispatch establishes the type contract, the idempotency key derivation, and the insert-or-skip control flow. Codex scales to the rest.
**Linear issue:** `LIN-W7-10`.

**Files:**
- Create: `packages/backend/convex/email/dispatch.ts`.
- Create: `packages/backend/convex/email/queries.ts` (add `getByIdempotencyKey` internal query if not already present).
- Create: `packages/backend/convex/email/__tests__/dispatch.test.ts`.

**Steps:**

- [ ] **Step 1: Write failing dispatch tests (welcome-onboarding as the exemplar).**

```ts
it("inserts emailEvents row and returns queued", async () => {
  const t = convexTest(schema);
  const userId = await t.run(async (ctx) => ctx.table("users").insert({ externalId: "u", email: "eric@example.com", connectedAccounts: [] }));
  const result = await t.action(internal.email.dispatch.dispatchWelcomeOnboarding, {
    userId,
    variant: "plaid-linked",
    firstLinkedInstitutionName: "Chase",
  });
  expect(result.status).toBe("queued");
  const row = await t.run(async (ctx) => ctx.table("emailEvents").getX(result.emailEventId));
  expect(row.templateKey).toBe("welcome-onboarding");
  expect(row.status).toBe("pending");
});

it("second call with same userId returns skipped_duplicate", async () => {
  const t = convexTest(schema);
  const userId = await t.run(async (ctx) => ctx.table("users").insert({ externalId: "u", email: "eric@example.com", connectedAccounts: [] }));
  await t.action(internal.email.dispatch.dispatchWelcomeOnboarding, { userId, variant: "plaid-linked" });
  const second = await t.action(internal.email.dispatch.dispatchWelcomeOnboarding, { userId, variant: "signup-only" });
  expect(second.status).toBe("skipped_duplicate");
});
```

- [ ] **Step 2: Implement `dispatchWelcomeOnboarding` per [specs/W7-email.md §6](W7-email.md) pattern.**

Scope:
- idempotencyKey from `{userId, scope: "welcome-class"}` (no date bucket; lifetime dedup for the trigger class).
- get-by-idempotencyKey, short-circuit on duplicate.
- getUserEmail, then insert `emailEvents` pending, then `workflow.start`.
- Return `{ status, emailEventId }`.

- [ ] **Step 3: Run the 2 tests; confirm pass.**

- [ ] **Step 4: Implement the remaining seven dispatch actions.**

Each follows the same pattern with:
- Its own idempotencyKey inputs per spec §4 table.
- Its own workflow reference (`internal.email.workflows.send<Template>`).
- Its own Zod-validated arg shape (from spec §6).

Copy the welcome-onboarding exemplar, substitute the arg shape and idempotency inputs.

- [ ] **Step 5: Full-suite typecheck and test.**

Run: `bun typecheck && cd packages/backend && bun test email/__tests__/dispatch.test.ts`
Expected: all tests pass.

- [ ] **Step 6: Commit.**

```bash
gt create feat/agentic-home/W7-email-10-dispatch -m "feat(email): eight typed dispatch actions with producer-insert dedup and workflow handoff"
```

**Per-task acceptance checklist:**

- [ ] 8 dispatch actions implemented.
- [ ] Idempotency tests for at least 3 actions (welcome, promo, anomaly) demonstrate dedup.
- [ ] `workflow.start` is only called when the insert succeeded.
- [ ] Codex reviews pattern task; Claude Code reviews Codex-authored batch.

---

## Task W7.11: Workflow bodies (8 workflows)

**Recommended agent:** Claude Code for the `sendPromoWarning` pattern and `sendAnomalyAlert` (coalesce logic). Codex for the other six once pattern reviewed.
**Rationale:** Workflow step ordering, inline mutation usage, and preCheck middleware need care. Coalesce for anomaly is non-trivial.
**Linear issue:** `LIN-W7-11`.

**Files:**
- Create: `packages/backend/convex/email/workflows/{sendWelcomeOnboarding,sendWeeklyDigest,sendPromoWarning,sendStatementReminder,sendAnomalyAlert,sendReconsentRequired,sendItemErrorPersistent,sendSubscriptionDigest}.ts`.
- Create: `packages/backend/convex/email/middleware.ts` (houses `preCheck`, `buildUnsubscribeHeaders`, `anomalyLeadershipCheck`, `anomalyCoalesce`, `patchCoalescedRunning`, `patchCoalescedSent`, `patchSiblingsSkipped`).
- Create: `packages/backend/convex/email/workflow.ts` (exports `workflow` manager; W2's W2.x installs the component; this file imports it).
- Create: `packages/backend/convex/email/__tests__/workflows.test.ts`.

**Steps:**

- [ ] **Step 1: Implement `middleware.ts` with `preCheck` and header builder.**

Use spec §8 reference implementation. `buildUnsubscribeHeaders` signs a fresh token via `signUnsubscribeToken` (W7.6) and returns an array of `{ name: "List-Unsubscribe", value }`, `{ name: "List-Unsubscribe-Post", value: "List-Unsubscribe=One-Click" }`.

- [ ] **Step 2: Implement `sendPromoWarning` as the exemplar pattern.**

Per spec §7. Steps: load row, preCheck, render, patch running, build headers, sendResendRaw, patch sent.

- [ ] **Step 3: Write a test that drives the pattern end-to-end.**

```ts
it("dispatches promo-warning and moves row from pending to sent in dev-capture mode", async () => {
  const t = convexTest(schema);
  const userId = /* setup user */;
  const dispatchResult = await t.action(internal.email.dispatch.dispatchPromoWarning, {
    userId,
    cadence: 30,
    promos: [{ promoId: "p1", cardName: "Chase Sapphire", expirationDate: "2026-05-20", balanceCents: 124500, daysRemaining: 30 }],
  });
  expect(dispatchResult.status).toBe("queued");
  // Wait for workflow completion (in convex-test, await scheduler drain).
  await t.finishInProgressScheduledFunctions();
  const row = await t.run(async (ctx) => ctx.table("emailEvents").getX(dispatchResult.emailEventId));
  expect(row.status).toBe("sent");
});
```

- [ ] **Step 4: Run the test; confirm pass.**

- [ ] **Step 5: Implement `sendAnomalyAlert` with coalesce logic per spec §9.**

Leadership check; 15-minute wait; coalesce siblings; patch all.

- [ ] **Step 6: Test the coalesce path.**

```ts
it("coalesces three anomalies inserted within 15 minutes into one send", async () => {
  const t = convexTest(schema);
  const userId = /* setup */;
  for (let i = 0; i < 3; i++) {
    await t.action(internal.email.dispatch.dispatchAnomalyAlert, { userId, anomalyId: `anom_${i}` });
  }
  await t.finishInProgressScheduledFunctions(); // drains the 15-min wait in test time
  const sent = await t.run(async (ctx) => ctx.table("emailEvents").filter(q => q.eq(q.field("templateKey"), "anomaly-alert")).filter(q => q.eq(q.field("status"), "sent")).collect());
  expect(sent).toHaveLength(1);
  const others = await t.run(async (ctx) => ctx.table("emailEvents").filter(q => q.eq(q.field("templateKey"), "anomaly-alert")).filter(q => q.neq(q.field("_id"), sent[0]._id)).collect());
  for (const o of others) expect(o.status).toBe("sent"); // siblings share resendEmailId
});
```

- [ ] **Step 7: Implement remaining six workflows using `sendPromoWarning` as the pattern.**

- [ ] **Step 8: Full typecheck and test run.**

- [ ] **Step 9: Commit.**

```bash
gt create feat/agentic-home/W7-email-11-workflows -m "feat(email): eight durable send workflows with preCheck middleware and anomaly coalesce"
```

**Per-task acceptance checklist:**

- [ ] 8 workflows implemented.
- [ ] sendPromoWarning dispatch-to-sent integration test passes.
- [ ] sendAnomalyAlert coalesce test passes.
- [ ] preCheck test: suppressed email → `status: "skipped_suppression"`.
- [ ] preCheck test: preference disabled → `status: "skipped_pref"`.
- [ ] Codex reviews Claude Code's pattern tasks; Claude Code reviews Codex batch.

---

## Task W7.12: Preferences page and public queries

**Recommended agent:** Codex.
**Rationale:** Straightforward UI work against the existing `/settings/*` layout plus two Convex public queries and one mutation. Pattern follows existing settings pages.
**Linear issue:** `LIN-W7-12`.

**Files:**
- Create: `packages/backend/convex/email/queries.ts` (add `getNotificationPreferences` public query, ensure pattern, `getBounceStatus` public query).
- Modify: `packages/backend/convex/email/mutations.ts` (add `updateNotificationPreference` public mutation).
- Create: `apps/app/src/app/(app)/settings/notifications/page.tsx`.
- Create: `apps/app/src/app/(app)/settings/notifications/PreferencesForm.tsx` (client component).

**Steps:**

- [ ] **Step 1: Implement `getNotificationPreferences` public query.**

```ts
// packages/backend/convex/email/queries.ts
export const getNotificationPreferences = query({
  args: {},
  returns: v.object({
    weeklyDigestEnabled: v.boolean(),
    promoWarningEnabled: v.boolean(),
    statementReminderEnabled: v.boolean(),
    anomalyAlertEnabled: v.boolean(),
    subscriptionDetectedEnabled: v.boolean(),
    masterUnsubscribed: v.boolean(),
  }),
  handler: async (ctx) => {
    const viewer = ctx.viewerX();
    const existing = await ctx.table("notificationPreferences").get("userId", viewer._id);
    if (existing) {
      return {
        weeklyDigestEnabled: existing.weeklyDigestEnabled,
        promoWarningEnabled: existing.promoWarningEnabled,
        statementReminderEnabled: existing.statementReminderEnabled,
        anomalyAlertEnabled: existing.anomalyAlertEnabled,
        subscriptionDetectedEnabled: existing.subscriptionDetectedEnabled,
        masterUnsubscribed: existing.masterUnsubscribed,
      };
    }
    return {
      weeklyDigestEnabled: true,
      promoWarningEnabled: true,
      statementReminderEnabled: true,
      anomalyAlertEnabled: true,
      subscriptionDetectedEnabled: true,
      masterUnsubscribed: false,
    };
  },
});
```

- [ ] **Step 2: Implement `ensureNotificationPreferences` internal mutation that lazy-creates the row.**

```ts
// mutations.ts (internal, called by updateNotificationPreference)
export const ensurePreferences = internalMutation({
  args: { userId: v.id("users") },
  returns: v.id("notificationPreferences"),
  handler: async (ctx, { userId }) => {
    const existing = await ctx.table("notificationPreferences").get("userId", userId);
    if (existing) return existing._id;
    return await ctx.table("notificationPreferences").insert({
      userId,
      weeklyDigestEnabled: true,
      promoWarningEnabled: true,
      statementReminderEnabled: true,
      anomalyAlertEnabled: true,
      subscriptionDetectedEnabled: true,
      welcomeOnboardingEnabled: true,
      masterUnsubscribed: false,
      updatedAt: Date.now(),
    });
  },
});
```

- [ ] **Step 3: Implement `updateNotificationPreference` public mutation.**

```ts
export const updateNotificationPreference = mutation({
  args: { templateKey: v.string(), enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { templateKey, enabled }) => {
    const viewer = ctx.viewerX();
    const PREFERENCE_MAP: Record<string, string> = {
      "weekly-digest": "weeklyDigestEnabled",
      "promo-warning": "promoWarningEnabled",
      "statement-closing": "statementReminderEnabled",
      "anomaly-alert": "anomalyAlertEnabled",
      "subscription-detected": "subscriptionDetectedEnabled",
      "master": "masterUnsubscribed",
    };
    const field = PREFERENCE_MAP[templateKey];
    if (!field) throw new Error(`Unknown template key: ${templateKey}`);
    const prefsId = await ctx.runMutation(internal.email.mutations.ensurePreferences, { userId: viewer._id });
    const prefs = await ctx.table("notificationPreferences").getX(prefsId);
    // masterUnsubscribed semantic inversion: user "enables" the master toggle which means unsubscribed=true.
    const value = templateKey === "master" ? !enabled : enabled;
    await prefs.patch({ [field]: value, updatedAt: Date.now() } as Record<string, unknown>);
    return null;
  },
});
```

- [ ] **Step 4: Implement `getBounceStatus` public query.**

Per spec §13.

- [ ] **Step 5: Build the page.**

`apps/app/src/app/(app)/settings/notifications/page.tsx`:

```tsx
import { PreferencesForm } from "./PreferencesForm";

export default function NotificationsSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-primary">Notifications</h1>
      <p className="mt-2 text-sm text-tertiary">Choose which emails from SmartPockets you want to receive.</p>
      <PreferencesForm />
    </div>
  );
}
```

`PreferencesForm.tsx` is a client component that uses cached `useQuery` for `getNotificationPreferences` and `getBounceStatus`, renders six toggles per spec §10, and calls `updateNotificationPreference` on flip.

- [ ] **Step 6: Smoke test in `bun dev:app`.**

Navigate to `http://localhost:3000/settings/notifications`, flip toggles, confirm values persist on reload.

- [ ] **Step 7: Commit.**

```bash
gt create feat/agentic-home/W7-email-12-preferences-page -m "feat(email): preferences page at /settings/notifications with five toggles and master unsubscribe"
```

**Per-task acceptance checklist:**

- [ ] Page renders; toggles flip; bounce banner appears when suppressed.
- [ ] `getBounceStatus` returns correct discriminator.
- [ ] Typecheck + build clean.

---

## Task W7.13: Crons and scheduled jobs

**Recommended agent:** Codex.
**Rationale:** Four crons with well-specified handlers.
**Linear issue:** `LIN-W7-13`.

**Files:**
- Modify: [packages/backend/convex/crons.ts](../packages/backend/convex/crons.ts).
- Create: `packages/backend/convex/email/crons.ts` (handler implementations).

**Steps:**

- [ ] **Step 1: Register the four crons per spec §12.**

```ts
// crons.ts
crons.weekly("weekly digest", { dayOfWeek: "sunday", hourUTC: 9, minuteUTC: 0 }, internal.email.crons.dispatchWeeklyDigestForAllUsers);
crons.hourly("welcome signup fallback", { minuteUTC: 15 }, internal.email.crons.dispatchWelcomeSignupFallback);
crons.daily("cleanup old email events", { hourUTC: 3, minuteUTC: 30 }, internal.email.crons.cleanupOldEmailEvents);
crons.hourly("reconcile stuck email workflows", { minuteUTC: 45 }, internal.email.crons.reconcileStuckWorkflows);
```

- [ ] **Step 2: Implement each handler.**

`dispatchWeeklyDigestForAllUsers`:
- Paginate active users.
- For each user with digest enabled and no hard-bounce suppression, assemble payload from W6's tables via cross-workstream reads (wrap each read in a try/catch so one user's missing table does not block others).
- Skip if zero-signal.
- Call `dispatchWeeklyDigest`.

`dispatchWelcomeSignupFallback`:
- Query users where `createdAt <= now - 48h`, `email` is set, and no `emailEvents` row with `templateKey: "welcome-onboarding"`.
- Confirm no active Plaid items.
- Call `dispatchWelcomeOnboarding({ variant: "signup-only" })`.

`cleanupOldEmailEvents`:
- Delete `dev-capture` rows older than 7 days.
- Delete `webhook-*` rows older than 90 days.
- Delete `send` rows older than the per-scope TTL from spike §4.4.

`reconcileStuckWorkflows`:
- Scan `emailEvents` where `status === "running"` AND `processedAt + 1h < now`.
- For each, `workflow.status(ctx, workflowId)`. If `completed`, patch status to `sent` or `failed`; if `inProgress`, leave.

- [ ] **Step 3: Write tests for at least the cleanup cron (deterministic).**

- [ ] **Step 4: Commit.**

```bash
gt create feat/agentic-home/W7-email-13-crons -m "feat(email): weekly digest, welcome fallback, cleanup, and stuck workflow reconciliation crons"
```

**Per-task acceptance checklist:**

- [ ] 4 crons registered.
- [ ] Cleanup handler deletes correct row set.
- [ ] Reconcile handler updates stuck rows.

---

## Task W7.14: Production rollout and integration tests

**Recommended agent:** Codex for the integration test harness; human for production prerequisites.
**Rationale:** Final gate. Production env vars, DNS, logo hosting, webhook endpoint are mostly human tasks with test validation.
**Linear issue:** `LIN-W7-14`.

**Files:**
- Create: `apps/web/public/email-assets/logo.png` (copy from brand assets).
- Create: `apps/web/public/email-assets/logo@2x.png`.
- Modify: [packages/email/emails/_config/email-config.ts](../packages/email/emails/_config/email-config.ts) (set `logoUrl`).
- Create: `packages/backend/convex/email/__tests__/integration.test.ts` (covers dispatch → workflow → send → webhook cycle).

**Steps:**

- [ ] **Step 1: Commit logo assets and update config.**

- [ ] **Step 2: Write the integration test.**

```ts
describe("W7 integration", () => {
  it("full pipeline: dispatch → workflow → dev-capture", async () => {
    const t = convexTest(schema);
    const userId = /* setup */;
    const result = await t.action(internal.email.dispatch.dispatchPromoWarning, { /* payload */ });
    await t.finishInProgressScheduledFunctions();
    const row = await t.run(async (ctx) => ctx.table("emailEvents").getX(result.emailEventId));
    expect(row.status).toBe("sent");
    expect(row.resendEmailId).toMatch(/^devcap_/);
  });

  it("suppressed email short-circuits at preCheck", async () => {
    /* setup suppression, dispatch, expect status: "skipped_suppression" */
  });

  it("disabled preference short-circuits at preCheck", async () => {
    /* setup preferences with promoWarningEnabled: false, dispatch, expect status: "skipped_pref" */
  });

  it("unsubscribe POST flips preference and blocks next send", async () => {
    /* sign token, POST /email/unsubscribe, re-dispatch, expect skipped_pref */
  });
});
```

- [ ] **Step 3: Run the full W7 test suite.**

Run: `cd packages/backend && bun test email/__tests__/`
Expected: all W7 tests pass.

- [ ] **Step 4: Human production rollout gates (from spec §15).**

Per the acceptance gate list. Before merging W7.14, all eight preconditions must be green.

- [ ] **Step 5: Commit.**

```bash
gt create feat/agentic-home/W7-email-14-rollout -m "chore(email): logo assets, production env var checklist, and integration test harness"
```

- [ ] **Step 6: Prod rollout.**

In a separate PR after full stack merges:

- Set Convex prod env vars per spec §15.
- Register Resend webhook at prod Convex site URL.
- Remove `INNGEST_EVENT_KEY` from Convex prod.
- Run `internal.email.internal.backfillEmailsFromClerk` once in prod.
- Verify DNS (SPF, DKIM, DMARC) resolves.
- Send one smoke test from prod (weekly-digest to Eric).
- Close the M3 > W7 Linear sub-project.

**Per-task acceptance checklist:**

- [ ] Integration tests pass.
- [ ] Logo reachable at prod URL.
- [ ] DNS verified.
- [ ] Prod env vars set; Inngest cleaned.
- [ ] Resend webhook registered.
- [ ] Smoke send delivered.
- [ ] All prior task acceptances ticked.
- [ ] CodeRabbit clean on every PR in the stack.

---

## Global acceptance checklist

W7 milestone closes when:

- [ ] All 14 tasks' per-task acceptance checklists complete.
- [ ] [specs/W7-email.md §16](W7-email.md) all 17 acceptance criteria met.
- [ ] `bun typecheck` passes at root.
- [ ] `bun build` succeeds for `apps/app` and `apps/web`.
- [ ] `bun dev:email` renders all 30 templates (22 existing + 8 new).
- [ ] `cd packages/backend && bun test` passes all W7 tests.
- [ ] CodeRabbit clean on every PR in the stack.
- [ ] No em-dashes anywhere in the stack.
- [ ] Linear M3 > W7 sub-project closes with all issues `Done`.
- [ ] Contracts §14 template catalog reflects actual shipped files.
- [ ] Spike §4.4 Strategy C-prime is the implemented pattern.

---

## Task W7.3 Appendix: draft bodies

The actual draft copy for each of the eight templates is committed as its own file under `packages/email/emails/drafts/` in Task W7.3. The eight files are produced as the W7.3 deliverable; their content is drafted in parallel to this plan at the same filenames. Executing agent copies each draft verbatim from the plan's sibling files in `packages/email/emails/drafts/*.draft.md`, which the `/plan` output of this workstream also emits.

**Canonical location of draft bodies:** `packages/email/emails/drafts/{welcome-onboarding,weekly-digest,promo-warning,statement-closing,anomaly-alert,reconsent-required,item-error-persistent,subscription-detected}.draft.md`.

---

**End of W7 plan.**
