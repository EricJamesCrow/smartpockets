# W4: Plaid Component Gap Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every code change follows TDD (failing test first; minimal implementation; green; commit). Per master brief Section 6 and the per-task "Recommended agent" tag, tasks are executed by Claude Code or Codex.

**Goal:** Close the 7 NOT FOUND Plaid webhooks from W0 Section 9 (5 real handlers, 4 stubs), expose a rich per-item sync-state query that retires `plaidItems.status` duplication, add the `account_select` update-mode Link path, publish W1 / W7 integration contracts, and commit to a three-tier test plan. All changes additive; no data migration; security properties preserved.

**Architecture:** Spec at [specs/W4-plaid-gap-closure.md](specs/W4-plaid-gap-closure.md); brainstorm at [specs/W4-plaid-gap-closure.brainstorm.md](specs/W4-plaid-gap-closure.brainstorm.md); research at [specs/W4-plaid-gap-closure.research.md](specs/W4-plaid-gap-closure.research.md). Component-side changes (one additive schema field; three internal mutations; one public-query pair; one pure derivation helper; one pure error-to-reason mapper; one optional action argument). Host-app changes (one new error-taxonomy user-copy module; seven new HTTP webhook branches; one new daily cron; two new scheduled email events; three query wrappers; one action wrapper update; `getConnectedBanks` return-shape extension; `ConnectedBanks.tsx` banner CTA; Settings > Institutions CTA).

**Tech Stack:** TypeScript, Convex 1.31.x + Convex Ents 0.16.0, Plaid SDK 41.x, `jose` 6.x, vitest 3.x, `convex-test` 0.0.40, bun 1.1.42, Turborepo, Graphite, CodeRabbit.

---

## Plan Handoff Header

| Field | Value |
|---|---|
| Linear milestone | M3 Agentic Home |
| Linear sub-project | W4 plaid-gap-closure |
| Linear issues | One per task (W4.1 through W4.11); created at plan-phase kickoff in the Linear M3 > W4 sub-project |
| Recommended primary agent | Claude Code for architectural / auth-sensitive tasks (W4.1 test harness, W4.4 error taxonomy, W4.5 health query, W4.6 user-copy taxonomy); Codex for boilerplate / well-specified CRUD / fixture capture / test writing (W4.2, W4.3, W4.7, W4.8, W4.9, W4.10, W4.11) |
| Required MCP servers | Convex MCP (schema + function execution + logs), Plaid Sandbox MCP (webhook simulation for W4.8), Plaid Dashboard MCP (doc cross-check for W4.7 research verification), Graphite MCP (`gt` branch + stack management) |
| Required read access | Repo only. No external template directories required for W4 |
| Prerequisite plans (must be merged) | W0 (complete on `main` per commit `5ad246f`) |
| Branch (track root) | `feat/agentic-home/W4-plaid-gap-closure-01-test-harness` (Task W4.1); subsequent tasks stack via `gt create` |
| Graphite stack parent | `main` (W4 is Track A root per master brief Section 11) |
| Worktree directory | `~/Developer/smartpockets-W4-plaid` |
| Estimated PRs in stack | 11 (one per task; each 100 to 400 LOC) |
| Review bot | CodeRabbit (mandatory pass before merge) |
| Rollback plan | All changes additive (nullable schema field; new internal mutations; new public queries; new webhook branches; new cron; new scheduled email events; refactor of one host-app query return shape with backward-compatible extensions). `gt restack` drops any PR in the stack; no data migration to reverse |
| Acceptance checklist | See Section "Acceptance checklist" at the bottom of this file. Every task also has a per-task acceptance checklist inline |

### Context bootstrap (for fresh agent sessions)

Before starting, the agent must:
1. Read [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md) in the repo root.
2. Read [specs/W0-existing-state-audit.md](specs/W0-existing-state-audit.md), specifically Sections 1, 8, 9, and 20.
3. Read [specs/W4-plaid-gap-closure.md](specs/W4-plaid-gap-closure.md) (the authoritative spec).
4. Read this file top to bottom.
5. Read [specs/W4-plaid-gap-closure.research.md](specs/W4-plaid-gap-closure.research.md).
6. Read [packages/convex-plaid/CLAUDE.md](packages/convex-plaid/CLAUDE.md) (component's own operating manual).
7. Run `git fetch origin` and confirm the worktree is on `main` before `gt create` for Task W4.1.
8. Verify MCP servers respond: `Convex MCP ok`, `Plaid Sandbox MCP ok` (at least before W4.8), `Graphite MCP ok`.
9. Verify `bun --version` reports `1.1.42`; repo package manager is pinned.

### Global commit + build rules (applies to every task)

- Atomic conventional commits per [CLAUDE.md](CLAUDE.md): `feat(scope): ...`, `test(scope): ...`, `docs(scope): ...`, `chore(scope): ...`.
- Use Graphite for branch and PR management: `gt create`, `gt submit --stack`. Never raw `git push` to feature branches.
- After any edit under `packages/convex-plaid/src/`: run `cd packages/convex-plaid && bun run build` then `cd -`. The root `bun dev` excludes the component (see [package.json:11](package.json:11) and [AGENTS.md:83](AGENTS.md:83)); the manual rebuild is required for the host app to pick up changes.
- After any component API change that affects host-app imports: run `bun typecheck` at the repo root to validate the whole workspace.
- `bun typecheck` must pass at task end.
- No em-dashes (in code comments, commit messages, PR descriptions, spec updates).
- CodeRabbit must pass before merging each PR in the stack.
- Cross-agent review per master brief Section 11: Codex-authored PRs get a Claude Code review before merge; Claude Code-authored PRs get a Codex review.

---

## Task dependency graph

```
W4.1 (test harness)
  └─> W4.9 (integration tests)

W4.2 (schema + mutations)
  └─> W4.5 (query reads new field)
  └─> W4.7 (handler writes new field)

W4.3 (mode param)
  └─> W4.7 (exchangePublicTokenAction passes mode)

W4.4 (component errorTaxonomy)
  └─> W4.5 (derivation uses mapErrorCodeToReason)
  └─> W4.6 (host-app user-copy uses ReasonCode)

W4.5 (health queries)
  └─> W4.10 (UI callers consume)
  └─> W4.11 (cron consumes)

W4.6 (user-copy taxonomy)
  └─> W4.10 (banner CTA uses reasonCodeToUserCopy)

W4.7 (webhook branches)
  └─> W4.8 (fixtures target real handlers)
  └─> W4.11 (needs_reauth events emit from handlers)

W4.8 (fixtures)
  └─> W4.9 (tests replay fixtures)
```

Linear stack order (respects the graph):

1. W4.1
2. W4.2
3. W4.3
4. W4.4
5. W4.5
6. W4.6
7. W4.7
8. W4.8
9. W4.9
10. W4.10
11. W4.11

Each task produces one Graphite branch and one PR. The stack anchors at `main`.

---

## Task W4.1: Wire `convex-test` harness for host-app `packages/backend`

**Recommended agent:** Claude Code (framework bring-up; one-time infra that unblocks W5 / W6 tests too).
**Rationale:** `packages/backend` has no vitest / convex-test wiring today (verified in research task 6). Claude Code's multi-file reasoning is well-suited to wiring the config, scripts, and first scaffolding test. Later per-test authorship is Codex territory.
**Linear issue:** `LIN-W4-01` (placeholder; create at plan kickoff).

**Files:**
- Modify: [packages/backend/package.json](packages/backend/package.json) (add devDependencies: `vitest`, `@vitest/coverage-v8`, `convex-test`; add `test`, `test:coverage`, `test:watch` scripts).
- Create: `packages/backend/vitest.config.ts`.
- Create: `packages/backend/convex/__tests__/sanity.test.ts`.
- Create: `packages/backend/convex/__tests__/fixtures/plaid-webhooks/README.md` (directory placeholder; content documents fixture naming convention).

**Scope:**
- Acceptance: `cd packages/backend && bun run test` exits 0 with at least one passing test. No changes to Convex schema. No changes to runtime code. No new prod dependencies.

**Steps:**

- [ ] **Step 1: Add devDependencies and scripts to `packages/backend/package.json`**

  Patch:

  ```diff
   "scripts": {
     "dev": "convex dev --tail-logs",
     "deploy": "convex deploy",
     "setup": "convex dev --once",
  -  "typecheck": "tsc --noEmit"
  +  "typecheck": "tsc --noEmit",
  +  "test": "vitest run --typecheck",
  +  "test:coverage": "vitest run --coverage",
  +  "test:watch": "vitest --typecheck --clearScreen false"
   },
   ...
   "devDependencies": {
  -  "typescript": "^5.9.2"
  +  "typescript": "^5.9.2",
  +  "vitest": "^3.0.0",
  +  "@vitest/coverage-v8": "^3.2.4",
  +  "convex-test": "^0.0.40"
   }
  ```

- [ ] **Step 2: Install (respects bun lockfile)**

  ```bash
  bun install
  ```

  Expected: lockfile updates with vitest, @vitest/coverage-v8, convex-test.

- [ ] **Step 3: Create `packages/backend/vitest.config.ts`**

  Mirror the component's vitest config structure:

  ```ts
  // packages/backend/vitest.config.ts
  import { defineConfig } from "vitest/config";

  export default defineConfig({
    test: {
      environment: "node",
      typecheck: {
        tsconfig: "./tsconfig.json",
      },
      include: ["convex/__tests__/**/*.test.ts"],
    },
  });
  ```

- [ ] **Step 4: Create a failing scaffolding test first (TDD red)**

  Create `packages/backend/convex/__tests__/sanity.test.ts`:

  ```ts
  // packages/backend/convex/__tests__/sanity.test.ts
  import { describe, expect, it } from "vitest";
  import { convexTest } from "convex-test";
  import schema from "../schema";

  describe("convex-test harness", () => {
    it("boots with the host-app schema", async () => {
      const t = convexTest(schema);
      expect(t).toBeDefined();
    });
  });
  ```

- [ ] **Step 5: Run test; expect it to pass (confirms harness works; this is a bring-up test, not a red-green cycle)**

  ```bash
  cd packages/backend && bun run test
  ```

  Expected output includes `1 passed`. If the harness cannot load the schema (import error), escalate per research task 6 fallback.

- [ ] **Step 6: Create fixture directory placeholder**

  ```bash
  mkdir -p packages/backend/convex/__tests__/fixtures/plaid-webhooks
  ```

  Create `packages/backend/convex/__tests__/fixtures/plaid-webhooks/README.md`:

  ```markdown
  # Plaid webhook fixtures

  Each `.json` file in this directory represents a recorded or constructed Plaid webhook.

  ## File format

  ```json
  {
    "body": { "webhook_type": "...", "webhook_code": "...", "item_id": "...", "error": null },
    "jwt": "eyJ..." ,
    "bypassSignature": false
  }
  ```

  - `body`: the Plaid webhook body as sent to `/webhooks-plaid`.
  - `jwt`: a pre-computed ES256 JWT string or `null` if `bypassSignature` is true.
  - `bypassSignature`: when true, the test invokes the handler with `shouldSkipVerification()` engaged (matches sandbox-mode behavior at http.ts:123).

  ## Naming convention

  `{webhook_type}_{webhook_code}.json` in lowercase, for example:
  `transactions_default_update.json`, `item_login_repaired.json`.
  ```

- [ ] **Step 7: Run the full test suite to confirm nothing breaks**

  ```bash
  cd packages/backend && bun run test && cd -
  bun typecheck
  ```

  Expected: all green.

- [ ] **Step 8: Commit via Graphite**

  ```bash
  gt create feat/agentic-home/W4-01-test-harness -m "chore(backend): wire vitest + convex-test harness"
  ```

**Test:**
- `cd packages/backend && bun run test` exits 0.
- `bun typecheck` passes at repo root.
- `sanity.test.ts` contains one passing test.

**Acceptance checklist:**
- [ ] Vitest + convex-test listed in `packages/backend/package.json` devDependencies.
- [ ] Three test scripts added.
- [ ] `packages/backend/vitest.config.ts` exists.
- [ ] Sanity test passes.
- [ ] Fixture README exists.
- [ ] `bun typecheck` passes.
- [ ] CodeRabbit clean.
- [ ] Reviewed by Codex (this PR authored by Claude Code).

---

## Task W4.2: Add three component schema fields, five internal mutations, host-app `countActivePlaidItems` query, and dispatch stubs

**Recommended agent:** Codex (additive schema + CRUD mutations + one-line host-app query; follows existing patterns).
**Rationale:** Three additive fields on `plaidItems` (`newAccountsAvailableAt`, `firstErrorAt`, `lastDispatchedAt`); five internal mutations that patch those fields; one host-app internal query that wraps a component call; three dispatch-action stubs at `internal.email.dispatch.*` that W7 later replaces. Each increment is well-specified and test-covered. Pattern matches `markNeedsReauthInternal` at the component side and `internal.users.*` existing queries at the host-app side.
**Linear issue:** `LIN-W4-02`.

**Files:**
- Modify: [packages/convex-plaid/src/component/schema.ts:22](packages/convex-plaid/src/component/schema.ts:22) (add `newAccountsAvailableAt`, `firstErrorAt`, `lastDispatchedAt`).
- Modify: `packages/convex-plaid/src/component/private.ts` (add `setNewAccountsAvailableInternal`, `clearNewAccountsAvailableInternal`, `markFirstErrorAtInternal`, `clearErrorTrackingInternal`, `markItemErrorDispatchedInternal`).
- Create: `packages/convex-plaid/src/component/newAccountsAvailable.test.ts`.
- Create: `packages/convex-plaid/src/component/errorTracking.test.ts`.
- Modify: [packages/backend/convex/users/index.ts](packages/backend/convex/users/index.ts) (or the existing users module entrypoint; add `countActivePlaidItems` internal query).
- Create: `packages/backend/convex/email/dispatch.ts` (three internal-action stubs; W7 replaces bodies).
- Create: `packages/backend/convex/__tests__/countActivePlaidItems.test.ts`.
- Rebuild: `cd packages/convex-plaid && bun run build`.

**Scope:**
- Acceptance: All three fields added; all five mutations implemented and unit-tested; host-app `countActivePlaidItems` returns the expected count (0 for new user, 1 after one link, etc.); dispatch stubs at the correct `internal.email.dispatch.*` path log payloads and return `null`; component rebuilt; host app typechecks.

**Steps:**

- [ ] **Step 1: Write the failing test for `setNewAccountsAvailableInternal`**

  Create `packages/convex-plaid/src/component/newAccountsAvailable.test.ts`:

  ```ts
  // packages/convex-plaid/src/component/newAccountsAvailable.test.ts
  import { describe, expect, it } from "vitest";
  import { convexTest } from "convex-test";
  import schema from "./schema";
  import { api } from "./_generated/api";

  describe("newAccountsAvailable mutations", () => {
    it("setNewAccountsAvailableInternal stamps the field", async () => {
      const t = convexTest(schema);
      const itemId = await t.mutation(api.private.insertPlaidItemForTest, {
        userId: "user_1",
        itemId: "item_1",
        accessToken: "fake-jwe",
        products: ["transactions"],
        status: "active",
        createdAt: Date.now(),
      });
      await t.mutation(api.private.setNewAccountsAvailableInternal, {
        plaidItemId: itemId,
      });
      const item = await t.query(api.private.getPlaidItemForTest, { plaidItemId: itemId });
      expect(item.newAccountsAvailableAt).toBeDefined();
      expect(typeof item.newAccountsAvailableAt).toBe("number");
    });

    it("clearNewAccountsAvailableInternal clears the field", async () => {
      const t = convexTest(schema);
      const itemId = await t.mutation(api.private.insertPlaidItemForTest, {
        userId: "user_1",
        itemId: "item_1",
        accessToken: "fake-jwe",
        products: ["transactions"],
        status: "active",
        createdAt: Date.now(),
      });
      await t.mutation(api.private.setNewAccountsAvailableInternal, {
        plaidItemId: itemId,
      });
      await t.mutation(api.private.clearNewAccountsAvailableInternal, {
        plaidItemId: itemId,
      });
      const item = await t.query(api.private.getPlaidItemForTest, { plaidItemId: itemId });
      expect(item.newAccountsAvailableAt).toBeUndefined();
    });
  });
  ```

  The test references `api.private.insertPlaidItemForTest` and `api.private.getPlaidItemForTest` as test helpers. These exist in the component's test harness pattern (used by circuitBreaker.test.ts analogues). If they do not exist, add them in Step 3.

- [ ] **Step 2: Run the test; expect it to fail (red)**

  ```bash
  cd packages/convex-plaid && bun run test -- newAccountsAvailable
  ```

  Expected: `FAIL` with "Cannot find function setNewAccountsAvailableInternal" or similar.

- [ ] **Step 3: Add schema fields and mutations**

  Edit [packages/convex-plaid/src/component/schema.ts:22](packages/convex-plaid/src/component/schema.ts:22); within the `plaidItems` table definition, add after `nextRetryAt`:

  ```ts
      // Flag: Plaid reported new accounts are available at the institution
      // (ITEM:NEW_ACCOUNTS_AVAILABLE webhook). Cleared on update-mode exchange.
      newAccountsAvailableAt: v.optional(v.number()),

      // Error-tracking fields for persistent-error email dispatch.
      // `firstErrorAt` is stamped on transition into error or needs_reauth status
      // (first-write-wins). `lastDispatchedAt` is stamped by the 6-hour persistent-error
      // cron on dispatch. Both are cleared on recovery to active status.
      firstErrorAt: v.optional(v.number()),
      lastDispatchedAt: v.optional(v.number()),
  ```

  Edit `packages/convex-plaid/src/component/private.ts`; add at the bottom of the module:

  ```ts
  export const setNewAccountsAvailableInternal = internalMutation({
    args: { plaidItemId: v.id("plaidItems") },
    returns: v.null(),
    handler: async (ctx, { plaidItemId }) => {
      await ctx.db.patch(plaidItemId, { newAccountsAvailableAt: Date.now() });
      return null;
    },
  });

  export const clearNewAccountsAvailableInternal = internalMutation({
    args: { plaidItemId: v.id("plaidItems") },
    returns: v.null(),
    handler: async (ctx, { plaidItemId }) => {
      await ctx.db.patch(plaidItemId, { newAccountsAvailableAt: undefined });
      return null;
    },
  });

  // Stamps firstErrorAt only on transition into error-class status (first-write-wins).
  export const markFirstErrorAtInternal = internalMutation({
    args: { plaidItemId: v.id("plaidItems") },
    returns: v.null(),
    handler: async (ctx, { plaidItemId }) => {
      const item = await ctx.db.get(plaidItemId);
      if (!item) return null;
      if (item.firstErrorAt == null) {
        await ctx.db.patch(plaidItemId, { firstErrorAt: Date.now() });
      }
      return null;
    },
  });

  // Clears both error-tracking fields on recovery to healthy state.
  export const clearErrorTrackingInternal = internalMutation({
    args: { plaidItemId: v.id("plaidItems") },
    returns: v.null(),
    handler: async (ctx, { plaidItemId }) => {
      await ctx.db.patch(plaidItemId, {
        firstErrorAt: undefined,
        lastDispatchedAt: undefined,
      });
      return null;
    },
  });

  // Called by the 6-hour cron when it schedules dispatchItemErrorPersistent.
  export const markItemErrorDispatchedInternal = internalMutation({
    args: { plaidItemId: v.id("plaidItems") },
    returns: v.null(),
    handler: async (ctx, { plaidItemId }) => {
      await ctx.db.patch(plaidItemId, { lastDispatchedAt: Date.now() });
      return null;
    },
  });
  ```

  If the test helpers `insertPlaidItemForTest` and `getPlaidItemForTest` are missing, add them as internal mutations guarded by a `NODE_ENV === "test"` check, or expose them only via the test-only export boundary (matching the component's existing pattern; check for similar helpers in `circuitBreaker.test.ts` and follow the same convention).

- [ ] **Step 4: Write + run tests for the error-tracking mutations**

  Create `packages/convex-plaid/src/component/errorTracking.test.ts` with three cases:
  - `markFirstErrorAtInternal` stamps `firstErrorAt` when unset.
  - `markFirstErrorAtInternal` is a no-op when `firstErrorAt` already set (monotonic).
  - `clearErrorTrackingInternal` wipes both fields.
  - `markItemErrorDispatchedInternal` stamps `lastDispatchedAt`.

  ```bash
  cd packages/convex-plaid && bun run test -- "(newAccountsAvailable|errorTracking)"
  ```

  Expected: all cases pass.

- [ ] **Step 5: Add host-app `countActivePlaidItems` internal query**

  Create `packages/backend/convex/users/countActivePlaidItems.ts` (or extend an existing users module file):

  ```ts
  // packages/backend/convex/users/countActivePlaidItems.ts
  import { v } from "convex/values";
  import { internalQuery } from "../_generated/server";
  import { components } from "../_generated/api";

  export const countActivePlaidItems = internalQuery({
    args: { userId: v.string() },
    returns: v.number(),
    handler: async (ctx, { userId }) => {
      const items = await ctx.runQuery(components.plaid.public.getItemsByUser, {
        userId,
      });
      // "Active" for the welcome trigger means "not deleting"; any status
      // other than deleting counts as an established Plaid connection.
      return items.filter((i: { status: string }) => i.status !== "deleting").length;
    },
  });
  ```

  Re-export from the users module's barrel file if the existing convention uses one.

- [ ] **Step 6: Add dispatch-action stubs at `internal.email.dispatch.*`**

  Create `packages/backend/convex/email/dispatch.ts`:

  ```ts
  // packages/backend/convex/email/dispatch.ts
  //
  // Dispatch action stubs per contracts §14 and §15. W7 owns these actions;
  // W4 creates stubs so the W4 stack can land independently. W7 replaces the
  // handler bodies with Resend send + template render + dedup in a later PR.
  //
  // Signatures below match contracts §15 verbatim. Any drift breaks the
  // cross-workstream contract; update 00-contracts.md in the same PR.

  import { v } from "convex/values";
  import { internalAction } from "../_generated/server";

  export const dispatchWelcomeOnboarding = internalAction({
    args: {
      userId: v.string(),                          // Id<"users"> serialized
      variant: v.union(v.literal("signup-only"), v.literal("plaid-linked")),
      firstLinkedInstitutionName: v.optional(v.string()),
    },
    returns: v.null(),
    handler: async (_ctx, args) => {
      console.log("[email/dispatch:W7-stub] dispatchWelcomeOnboarding:", args);
      return null;
    },
  });

  export const dispatchReconsentRequired = internalAction({
    args: {
      userId: v.string(),
      plaidItemId: v.string(),
      institutionName: v.string(),
      reason: v.union(
        v.literal("ITEM_LOGIN_REQUIRED"),
        v.literal("PENDING_EXPIRATION"),
      ),
    },
    returns: v.null(),
    handler: async (_ctx, args) => {
      console.log("[email/dispatch:W7-stub] dispatchReconsentRequired:", args);
      return null;
    },
  });

  export const dispatchItemErrorPersistent = internalAction({
    args: {
      userId: v.string(),
      plaidItemId: v.string(),
      institutionName: v.string(),
      firstErrorAt: v.number(),
      lastSeenErrorAt: v.number(),
      errorCode: v.string(),
    },
    returns: v.null(),
    handler: async (_ctx, args) => {
      console.log("[email/dispatch:W7-stub] dispatchItemErrorPersistent:", args);
      return null;
    },
  });
  ```

- [ ] **Step 7: Write + run test for `countActivePlaidItems`**

  Create `packages/backend/convex/__tests__/countActivePlaidItems.test.ts`:

  ```ts
  // packages/backend/convex/__tests__/countActivePlaidItems.test.ts
  import { describe, expect, it } from "vitest";
  import { convexTest } from "convex-test";
  import schema from "../schema";
  import { internal } from "../_generated/api";

  describe("countActivePlaidItems", () => {
    it("returns 0 for a user with no plaidItems", async () => {
      const t = convexTest(schema);
      const n = await t.query(internal.users.countActivePlaidItems.countActivePlaidItems, { userId: "user_1" });
      expect(n).toBe(0);
    });

    it("counts non-deleting items", async () => {
      const t = convexTest(schema);
      // Seed two plaidItems for user_1 (one active, one deleting) via the component's test helper.
      // Assert count is 1.
    });
  });
  ```

  Adjust the API path to match the exported function name (e.g. if the barrel re-exports under `api.users.countActivePlaidItems`, use that path instead).

- [ ] **Step 8: Rebuild the component**

  ```bash
  cd packages/convex-plaid && bun run build && cd -
  ```

- [ ] **Step 9: Typecheck at repo root**

  ```bash
  bun typecheck
  ```

  Expected: all green. No existing-caller changes; new fields are nullable, new mutations / queries are internal.

- [ ] **Step 10: Commit via Graphite**

  ```bash
  gt create feat/agentic-home/W4-02-schema-mutations-dispatch-stubs -m "feat(plaid): add error-tracking schema fields, component mutations, countActivePlaidItems, and dispatch stubs"
  ```

**Test:**
- `cd packages/convex-plaid && bun run test` includes the new newAccountsAvailable + errorTracking suites, all green.
- `cd packages/backend && bun run test -- countActivePlaidItems` passes both cases.
- `bun typecheck` passes at repo root.
- Full component test suite still green.

**Acceptance checklist:**
- [ ] Three schema fields added to `plaidItems` (`newAccountsAvailableAt`, `firstErrorAt`, `lastDispatchedAt`).
- [ ] Five new component internal mutations exist.
- [ ] Host-app `internal.users.countActivePlaidItems` internal query exists and tests pass.
- [ ] Three dispatch-action stubs at `internal.email.dispatch.*` exist with signatures matching contracts §15 verbatim.
- [ ] Unit tests cover: set + clear newAccountsAvailable, markFirstErrorAt monotonic, clearErrorTracking, markItemErrorDispatched, countActivePlaidItems with 0 items and with mixed-status items.
- [ ] Component rebuilt.
- [ ] `bun typecheck` passes.
- [ ] Component's existing tests still pass.
- [ ] CodeRabbit clean.
- [ ] Reviewed by Claude Code (this PR authored by Codex).

---

## Task W4.3: Add `mode` parameter to `createUpdateLinkTokenAction`

**Recommended agent:** Codex.
**Rationale:** 5-line signature addition plus a passthrough to Plaid SDK; test coverage is a single assertion on the SDK-call argument.
**Linear issue:** `LIN-W4-03`.

**Files:**
- Modify: `packages/convex-plaid/src/component/actions.ts` (the `createUpdateLinkToken` action in the component).
- Modify: [packages/backend/convex/plaidComponent.ts:162](packages/backend/convex/plaidComponent.ts:162) (host-app wrapper `createUpdateLinkTokenAction`).
- Modify: `packages/convex-plaid/src/client/index.ts` (the `Plaid` class `createUpdateLinkToken` method in the client layer).
- Create: `packages/convex-plaid/src/component/updateLinkTokenMode.test.ts`.
- Rebuild component.

**Scope:**
- Acceptance: new optional `mode: "reauth" | "account_select"` argument flows from host-app wrapper through client to component action to Plaid SDK. When `mode === "account_select"`, Plaid SDK receives `update: { account_selection_enabled: true }`. Default behavior (no `mode` argument or `mode: "reauth"`) is unchanged.

**Steps:**

- [ ] **Step 1: Write failing test for account_select mode**

  Create `packages/convex-plaid/src/component/updateLinkTokenMode.test.ts`:

  ```ts
  // packages/convex-plaid/src/component/updateLinkTokenMode.test.ts
  import { describe, expect, it, vi } from "vitest";
  import { convexTest } from "convex-test";
  import schema from "./schema";
  import { api } from "./_generated/api";

  // Mock the Plaid SDK to capture the arguments passed to linkTokenCreate.
  vi.mock("plaid", async () => {
    const actual = await vi.importActual("plaid");
    return {
      ...actual,
      PlaidApi: class {
        calls: Array<{ fn: string; args: unknown }> = [];
        async linkTokenCreate(args: unknown) {
          this.calls.push({ fn: "linkTokenCreate", args });
          return { data: { link_token: "link-fake-123" } };
        }
        async itemGet() {
          return { data: { item: { products: ["transactions"] } } };
        }
      },
    };
  });

  describe("createUpdateLinkToken mode parameter", () => {
    it("defaults to reauth mode (no account_selection_enabled flag)", async () => {
      // Test logic: create a plaidItem, invoke createUpdateLinkToken action without mode,
      // assert the mock PlaidApi.linkTokenCreate received args WITHOUT update.account_selection_enabled.
      // See the component's existing action test pattern; instrument the mock to record calls.
    });

    it("mode: account_select sets update.account_selection_enabled = true", async () => {
      // Test logic: invoke with mode: "account_select",
      // assert the mock args include update: { account_selection_enabled: true }.
    });
  });
  ```

  The concrete test bodies depend on the component's existing action-testing helper pattern. The executing agent follows the pattern in [packages/convex-plaid/src/client/index.test.ts](packages/convex-plaid/src/client/index.test.ts) and [packages/convex-plaid/src/client/helpers.test.ts](packages/convex-plaid/src/client/helpers.test.ts). If no clear pattern exists for asserting on mocked SDK calls, fall back to unit-testing the pure helper that constructs the `linkTokenCreate` args (extract the construction logic into a pure function first).

- [ ] **Step 2: Run test; expect fail (red)**

  ```bash
  cd packages/convex-plaid && bun run test -- updateLinkTokenMode
  ```

- [ ] **Step 3: Extend the component action signature**

  In `packages/convex-plaid/src/component/actions.ts`, locate the `createUpdateLinkToken` action and add `mode` to its args:

  ```ts
  export const createUpdateLinkToken = action({
    args: {
      plaidItemId: v.id("plaidItems"),
      ...plaidConfigArgs,
      mode: v.optional(v.union(v.literal("reauth"), v.literal("account_select"))),
    },
    returns: v.object({ linkToken: v.string() }),
    handler: async (ctx, args) => {
      // ... existing access-token decryption ...
      const linkTokenResponse = await plaidClient.linkTokenCreate({
        // ... existing fields ...
        access_token: accessToken,
        update: args.mode === "account_select"
          ? { account_selection_enabled: true }
          : undefined,
      });
      return { linkToken: linkTokenResponse.data.link_token };
    },
  });
  ```

  Preserve all existing fields; only add the `update` object conditionally.

- [ ] **Step 4: Update client layer**

  In `packages/convex-plaid/src/client/index.ts`, locate the `createUpdateLinkToken` method on the `Plaid` class:

  ```ts
  async createUpdateLinkToken(
    ctx: ActionCtx,
    args: { plaidItemId: string; mode?: "reauth" | "account_select" },
  ): Promise<{ linkToken: string }> {
    return await ctx.runAction(this.component.actions.createUpdateLinkToken, {
      plaidItemId: args.plaidItemId as any,
      mode: args.mode,
      ...this.config,
    });
  }
  ```

- [ ] **Step 5: Update host-app wrapper**

  In [packages/backend/convex/plaidComponent.ts:162](packages/backend/convex/plaidComponent.ts:162):

  ```ts
  export const createUpdateLinkTokenAction = action({
    args: {
      plaidItemId: v.id("plaidItems"),
      mode: v.optional(v.union(v.literal("reauth"), v.literal("account_select"))),
    },
    returns: v.object({ linkToken: v.string() }),
    handler: async (ctx, { plaidItemId, mode }) => {
      const plaid = getPlaidClient();
      return await plaid.createUpdateLinkToken(ctx, { plaidItemId, mode });
    },
  });
  ```

- [ ] **Step 6: Run tests; expect green**

  ```bash
  cd packages/convex-plaid && bun run test -- updateLinkTokenMode
  ```

- [ ] **Step 7: Rebuild and typecheck**

  ```bash
  cd packages/convex-plaid && bun run build && cd -
  bun typecheck
  ```

- [ ] **Step 8: Commit**

  ```bash
  gt create feat/agentic-home/W4-03-update-link-mode -m "feat(plaid): add account_select mode to createUpdateLinkToken"
  ```

**Test:**
- Both test cases in `updateLinkTokenMode.test.ts` pass.
- `bun typecheck` passes.

**Acceptance checklist:**
- [ ] Component action accepts `mode` argument.
- [ ] Client class `createUpdateLinkToken` forwards `mode`.
- [ ] Host-app wrapper forwards `mode`.
- [ ] Default behavior unchanged.
- [ ] Unit tests cover both branches.
- [ ] Component rebuilt; typecheck passes.
- [ ] CodeRabbit clean.
- [ ] Reviewed by Claude Code.

---

## Task W4.4: Add `mapErrorCodeToReason` pure helper in the component

**Recommended agent:** Claude Code (taxonomy is cross-cutting; the `ReasonCode` enum is the boundary contract between component and host app).
**Rationale:** Design-heavy work: the `ReasonCode` enum becomes a public type exported by the component. Every row in the taxonomy table (spec Section 6.5) maps to one test case. Claude Code's multi-file reasoning keeps the derivation + enum + tests + export consistent.
**Linear issue:** `LIN-W4-04`.

**Files:**
- Create: `packages/convex-plaid/src/component/reasonCode.ts` (pure helper + `ReasonCode` union type).
- Create: `packages/convex-plaid/src/component/reasonCode.test.ts`.
- Modify: `packages/convex-plaid/src/index.ts` (re-export `ReasonCode` and `mapErrorCodeToReason` at the public package boundary so host-app code can `import { ReasonCode } from "@crowdevelopment/convex-plaid"`).
- Rebuild component.

**Scope:**
- Acceptance: Pure, side-effect-free helper. `ReasonCode` union type available at package entrypoint. 21 unit test cases (one per row of spec Section 6.5 table) pass.

**Steps:**

- [ ] **Step 1: Write the failing tests (all 21 cases)**

  Create `packages/convex-plaid/src/component/reasonCode.test.ts`:

  ```ts
  // packages/convex-plaid/src/component/reasonCode.test.ts
  import { describe, expect, it } from "vitest";
  import { mapErrorCodeToReason } from "./reasonCode";

  describe("mapErrorCodeToReason", () => {
    const cases: Array<[string | null, string]> = [
      ["ITEM_LOGIN_REQUIRED", "auth_required_login"],
      ["INVALID_ACCESS_TOKEN", "permanent_invalid_token"],
      ["ITEM_NOT_FOUND", "permanent_item_not_found"],
      ["ACCESS_NOT_GRANTED", "permanent_access_not_granted"],
      ["INVALID_CREDENTIALS", "auth_required_login"],
      ["INSUFFICIENT_CREDENTIALS", "auth_required_login"],
      ["USER_SETUP_REQUIRED", "auth_required_login"],
      ["MFA_NOT_SUPPORTED", "permanent_unknown"],
      ["NO_ACCOUNTS", "permanent_no_accounts"],
      ["ITEM_LOCKED", "auth_required_login"],
      ["ITEM_NOT_SUPPORTED", "permanent_products_not_supported"],
      ["INVALID_MFA", "auth_required_login"],
      ["INVALID_SEND_METHOD", "auth_required_login"],
      ["TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION", "transient_rate_limited"],
      ["INTERNAL_SERVER_ERROR", "transient_institution_down"],
      ["RATE_LIMIT_EXCEEDED", "transient_rate_limited"],
      ["INSTITUTION_DOWN", "transient_institution_down"],
      ["INSTITUTION_NOT_RESPONDING", "transient_institution_down"],
      ["INSTITUTION_NO_CREDENTIALS", "auth_required_login"],
      ["PLAID_ERROR", "transient_institution_down"],
      ["INSTITUTION_NO_LONGER_SUPPORTED", "permanent_institution_unsupported"],
      ["USER_PERMISSION_REVOKED", "permanent_revoked"],
      ["SOME_UNRECOGNIZED_CODE", "permanent_unknown"],
      [null, "permanent_unknown"],
    ];

    for (const [code, expected] of cases) {
      it(`maps ${code ?? "null"} -> ${expected}`, () => {
        expect(mapErrorCodeToReason(code)).toBe(expected);
      });
    }
  });
  ```

- [ ] **Step 2: Run tests; expect fail (red)**

  ```bash
  cd packages/convex-plaid && bun run test -- reasonCode
  ```

  Expected: all fail with "Cannot find module ./reasonCode".

- [ ] **Step 3: Implement the helper**

  Create `packages/convex-plaid/src/component/reasonCode.ts`:

  ```ts
  // packages/convex-plaid/src/component/reasonCode.ts
  /**
   * Structured reason codes for Plaid item health.
   *
   * Maps Plaid error codes (and non-error states) to a stable enum the host app
   * translates to user-facing copy. See spec Section 6.5 for the canonical table.
   */
  export type ReasonCode =
    | "healthy"
    | "syncing_initial"
    | "syncing_incremental"
    | "auth_required_login"
    | "auth_required_expiration"
    | "transient_circuit_open"
    | "transient_institution_down"
    | "transient_rate_limited"
    | "permanent_invalid_token"
    | "permanent_item_not_found"
    | "permanent_no_accounts"
    | "permanent_access_not_granted"
    | "permanent_products_not_supported"
    | "permanent_institution_unsupported"
    | "permanent_revoked"
    | "permanent_unknown"
    | "new_accounts_available";

  const ERROR_CODE_MAP: Record<string, ReasonCode> = {
    ITEM_LOGIN_REQUIRED: "auth_required_login",
    INVALID_ACCESS_TOKEN: "permanent_invalid_token",
    ITEM_NOT_FOUND: "permanent_item_not_found",
    ACCESS_NOT_GRANTED: "permanent_access_not_granted",
    INVALID_CREDENTIALS: "auth_required_login",
    INSUFFICIENT_CREDENTIALS: "auth_required_login",
    USER_SETUP_REQUIRED: "auth_required_login",
    MFA_NOT_SUPPORTED: "permanent_unknown",
    NO_ACCOUNTS: "permanent_no_accounts",
    ITEM_LOCKED: "auth_required_login",
    ITEM_NOT_SUPPORTED: "permanent_products_not_supported",
    INVALID_MFA: "auth_required_login",
    INVALID_SEND_METHOD: "auth_required_login",
    TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION: "transient_rate_limited",
    INTERNAL_SERVER_ERROR: "transient_institution_down",
    RATE_LIMIT_EXCEEDED: "transient_rate_limited",
    INSTITUTION_DOWN: "transient_institution_down",
    INSTITUTION_NOT_RESPONDING: "transient_institution_down",
    INSTITUTION_NO_CREDENTIALS: "auth_required_login",
    PLAID_ERROR: "transient_institution_down",
    INSTITUTION_NO_LONGER_SUPPORTED: "permanent_institution_unsupported",
    USER_PERMISSION_REVOKED: "permanent_revoked",
  };

  export function mapErrorCodeToReason(errorCode: string | null): ReasonCode {
    if (!errorCode) return "permanent_unknown";
    return ERROR_CODE_MAP[errorCode] ?? "permanent_unknown";
  }
  ```

- [ ] **Step 4: Re-export at package boundary**

  Modify `packages/convex-plaid/src/index.ts` to add at the top:

  ```ts
  export type { ReasonCode } from "./component/reasonCode";
  export { mapErrorCodeToReason } from "./component/reasonCode";
  ```

- [ ] **Step 5: Run tests; expect green**

  ```bash
  cd packages/convex-plaid && bun run test -- reasonCode
  ```

  Expected: 24 passing cases.

- [ ] **Step 6: Rebuild and typecheck**

  ```bash
  cd packages/convex-plaid && bun run build && cd -
  bun typecheck
  ```

- [ ] **Step 7: Commit**

  ```bash
  gt create feat/agentic-home/W4-04-reason-code-taxonomy -m "feat(plaid): add mapErrorCodeToReason and ReasonCode taxonomy"
  ```

**Test:**
- 24 test cases in `reasonCode.test.ts` pass.
- `bun typecheck` passes.
- `import { ReasonCode } from "@crowdevelopment/convex-plaid"` works in a scratch file (verify during typecheck).

**Acceptance checklist:**
- [ ] `ReasonCode` union type exported at package entrypoint.
- [ ] `mapErrorCodeToReason` exported at package entrypoint.
- [ ] 24 unit tests pass (one per row + null + unknown).
- [ ] No behavior change in existing `errors.ts` categorization.
- [ ] Component rebuilt; typecheck passes.
- [ ] CodeRabbit clean.
- [ ] Reviewed by Codex.

---

## Task W4.5: Add `getItemHealth` + `getItemHealthByUser` component queries and derivation

**Recommended agent:** Claude Code (derivation algorithm has ordered-priority logic; joins three table reads; integrates `mapErrorCodeToReason`; this is the query that downstream UI and W2 agent depend on).
**Rationale:** The derivation rules in spec Section 6.4 are ordered priority. Handling the `deleting` filter, the null-safety of `institution` joins, and the `lastWebhookAt` lookup all require coherent multi-step reasoning. Claude Code also extends the test suite to 9+ cases covering every branch of the algorithm.
**Linear issue:** `LIN-W4-05`.

**Files:**
- Create: `packages/convex-plaid/src/component/health.ts` (pure `derive` function + the `ItemHealth` type).
- Create: `packages/convex-plaid/src/component/health.test.ts`.
- Modify: [packages/convex-plaid/src/component/public.ts](packages/convex-plaid/src/component/public.ts) (add `getItemHealth` and `getItemHealthByUser` queries).
- Modify: `packages/convex-plaid/src/index.ts` (re-export `ItemHealth` type).
- Modify: [packages/backend/convex/plaidComponent.ts](packages/backend/convex/plaidComponent.ts) (add host-app wrappers `getPlaidItemHealth` and `getPlaidItemHealthByUser`).
- Rebuild component.

**Scope:**
- Acceptance: Pure `derive` function covers all 9+ branches; queries exposed at component public API and via host-app wrappers; queries filter `status === "deleting"` from list results; unit tests pass.

**Steps:**

- [ ] **Step 1: Write failing tests for derivation (one per spec Section 6.4 branch)**

  Create `packages/convex-plaid/src/component/health.test.ts`:

  ```ts
  // packages/convex-plaid/src/component/health.test.ts
  import { describe, expect, it } from "vitest";
  import { derive } from "./health";

  const baseItem = {
    _id: "j_item_1" as any,
    userId: "user_1",
    itemId: "item_1",
    accessToken: "enc",
    products: ["transactions"],
    status: "active" as const,
    createdAt: 0,
    circuitState: "closed" as const,
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
  };

  const baseInstitution = {
    institutionId: "ins_1",
    institutionName: "Acme Bank",
    institutionLogoBase64: null,
    institutionPrimaryColor: null,
  };

  describe("derive", () => {
    it("deleting -> filtered-out sentinel", () => {
      const h = derive({ ...baseItem, status: "deleting" }, baseInstitution, null);
      expect(h.state).toBe("error");
      expect(h.recommendedAction).toBe(null);
      expect(h.reasonCode).toBe("permanent_unknown");
    });

    it("needs_reauth -> re-consent-required + reconnect + auth_required_login", () => {
      const h = derive(
        { ...baseItem, status: "needs_reauth", reauthReason: "ITEM_LOGIN_REQUIRED" },
        baseInstitution,
        null,
      );
      expect(h.state).toBe("re-consent-required");
      expect(h.recommendedAction).toBe("reconnect");
      expect(h.reasonCode).toBe("auth_required_login");
    });

    it("needs_reauth with 'expir' in reason -> auth_required_expiration", () => {
      const h = derive(
        { ...baseItem, status: "needs_reauth", reauthReason: "Credentials expiring: 2026-06-01" },
        baseInstitution,
        null,
      );
      expect(h.reasonCode).toBe("auth_required_expiration");
    });

    it("circuitState=open (status active) -> error + wait + transient_circuit_open", () => {
      const h = derive(
        { ...baseItem, circuitState: "open" },
        baseInstitution,
        null,
      );
      expect(h.state).toBe("error");
      expect(h.recommendedAction).toBe("wait");
      expect(h.reasonCode).toBe("transient_circuit_open");
    });

    it("status=error, circuit closed, errorCode=INVALID_ACCESS_TOKEN -> contact_support + permanent_invalid_token", () => {
      const h = derive(
        { ...baseItem, status: "error", errorCode: "INVALID_ACCESS_TOKEN" },
        baseInstitution,
        null,
      );
      expect(h.state).toBe("error");
      expect(h.recommendedAction).toBe("contact_support");
      expect(h.reasonCode).toBe("permanent_invalid_token");
    });

    it("status=error, circuit closed, errorCode=INSTITUTION_DOWN -> wait + transient_institution_down", () => {
      const h = derive(
        { ...baseItem, status: "error", errorCode: "INSTITUTION_DOWN" },
        baseInstitution,
        null,
      );
      expect(h.recommendedAction).toBe("wait");
      expect(h.reasonCode).toBe("transient_institution_down");
    });

    it("circuitState=half_open -> syncing + null + syncing_incremental", () => {
      const h = derive(
        { ...baseItem, circuitState: "half_open" },
        baseInstitution,
        null,
      );
      expect(h.state).toBe("syncing");
      expect(h.recommendedAction).toBe(null);
      expect(h.reasonCode).toBe("syncing_incremental");
    });

    it("status=pending -> syncing + syncing_initial", () => {
      const h = derive({ ...baseItem, status: "pending" }, baseInstitution, null);
      expect(h.reasonCode).toBe("syncing_initial");
    });

    it("status=syncing -> syncing_incremental", () => {
      const h = derive({ ...baseItem, status: "syncing" }, baseInstitution, null);
      expect(h.reasonCode).toBe("syncing_incremental");
    });

    it("status=active, newAccountsAvailableAt set -> ready + reconnect_for_new_accounts + new_accounts_available", () => {
      const h = derive(
        { ...baseItem, status: "active", newAccountsAvailableAt: Date.now() },
        baseInstitution,
        null,
      );
      expect(h.state).toBe("ready");
      expect(h.recommendedAction).toBe("reconnect_for_new_accounts");
      expect(h.reasonCode).toBe("new_accounts_available");
    });

    it("status=active, no newAccountsAvailableAt -> healthy", () => {
      const h = derive({ ...baseItem }, baseInstitution, null);
      expect(h.state).toBe("ready");
      expect(h.recommendedAction).toBe(null);
      expect(h.reasonCode).toBe("healthy");
    });

    it("carries institutionName / logo / color through", () => {
      const h = derive(
        { ...baseItem },
        { ...baseInstitution, institutionLogoBase64: "abc", institutionPrimaryColor: "#ff0000" },
        null,
      );
      expect(h.institutionName).toBe("Acme Bank");
      expect(h.institutionLogoBase64).toBe("abc");
      expect(h.institutionPrimaryColor).toBe("#ff0000");
    });
  });
  ```

- [ ] **Step 2: Run tests; expect all fail (red)**

  ```bash
  cd packages/convex-plaid && bun run test -- health
  ```

- [ ] **Step 3: Implement `derive` in `health.ts`**

  Create `packages/convex-plaid/src/component/health.ts`:

  ```ts
  // packages/convex-plaid/src/component/health.ts
  import type { Doc } from "./_generated/dataModel";
  import { mapErrorCodeToReason, type ReasonCode } from "./reasonCode";

  export interface ItemHealth {
    plaidItemId: string;
    itemId: string;
    state: "syncing" | "ready" | "error" | "re-consent-required";
    recommendedAction:
      | "reconnect"
      | "reconnect_for_new_accounts"
      | "wait"
      | "contact_support"
      | null;
    reasonCode: ReasonCode;
    isActive: boolean;
    institutionId: string | null;
    institutionName: string | null;
    institutionLogoBase64: string | null;
    institutionPrimaryColor: string | null;
    lastSyncedAt: number | null;
    lastWebhookAt: number | null;
    errorCode: string | null;
    errorMessage: string | null;
    circuitState: "closed" | "open" | "half_open";
    consecutiveFailures: number;
    nextRetryAt: number | null;
    newAccountsAvailableAt: number | null;
  }

  export interface InstitutionSnapshot {
    institutionId: string | null;
    institutionName: string | null;
    institutionLogoBase64: string | null;
    institutionPrimaryColor: string | null;
  }

  export function derive(
    item: Doc<"plaidItems">,
    institution: InstitutionSnapshot,
    lastWebhookAt: number | null,
  ): ItemHealth {
    const base = {
      plaidItemId: item._id,
      itemId: item.itemId,
      isActive: item.isActive ?? true,
      institutionId: institution.institutionId,
      institutionName: institution.institutionName,
      institutionLogoBase64: institution.institutionLogoBase64,
      institutionPrimaryColor: institution.institutionPrimaryColor,
      lastSyncedAt: item.lastSyncedAt ?? null,
      lastWebhookAt,
      errorCode: item.errorCode ?? null,
      errorMessage: item.errorMessage ?? null,
      circuitState: (item.circuitState ?? "closed") as ItemHealth["circuitState"],
      consecutiveFailures: item.consecutiveFailures ?? 0,
      nextRetryAt: item.nextRetryAt ?? null,
      newAccountsAvailableAt: item.newAccountsAvailableAt ?? null,
    };

    if (item.status === "deleting") {
      return { ...base, state: "error", recommendedAction: null, reasonCode: "permanent_unknown" };
    }

    if (item.status === "needs_reauth") {
      const reason = (item.reauthReason ?? "").toLowerCase();
      const reasonCode: ReasonCode = reason.includes("expir")
        ? "auth_required_expiration"
        : "auth_required_login";
      return { ...base, state: "re-consent-required", recommendedAction: "reconnect", reasonCode };
    }

    if (base.circuitState === "open") {
      return { ...base, state: "error", recommendedAction: "wait", reasonCode: "transient_circuit_open" };
    }

    if (item.status === "error") {
      const reasonCode = mapErrorCodeToReason(base.errorCode);
      const recommendedAction: ItemHealth["recommendedAction"] = reasonCode.startsWith("transient_")
        ? "wait"
        : "contact_support";
      return { ...base, state: "error", recommendedAction, reasonCode };
    }

    if (base.circuitState === "half_open") {
      return { ...base, state: "syncing", recommendedAction: null, reasonCode: "syncing_incremental" };
    }

    if (item.status === "pending") {
      return { ...base, state: "syncing", recommendedAction: null, reasonCode: "syncing_initial" };
    }

    if (item.status === "syncing") {
      return { ...base, state: "syncing", recommendedAction: null, reasonCode: "syncing_incremental" };
    }

    if (item.status === "active" && item.newAccountsAvailableAt != null) {
      return {
        ...base,
        state: "ready",
        recommendedAction: "reconnect_for_new_accounts",
        reasonCode: "new_accounts_available",
      };
    }

    if (item.status === "active") {
      return { ...base, state: "ready", recommendedAction: null, reasonCode: "healthy" };
    }

    return { ...base, state: "error", recommendedAction: null, reasonCode: "permanent_unknown" };
  }
  ```

- [ ] **Step 4: Add public queries**

  Extend [packages/convex-plaid/src/component/public.ts](packages/convex-plaid/src/component/public.ts):

  ```ts
  import { derive, type ItemHealth } from "./health";

  export const getItemHealth = query({
    args: { plaidItemId: v.id("plaidItems") },
    returns: /* reuse validator for ItemHealth; define via v.object(...) matching the type */,
    handler: async (ctx, { plaidItemId }) => {
      const item = await ctx.db.get(plaidItemId);
      if (!item) throw new Error("Plaid item not found");
      const institution = await getInstitutionSnapshot(ctx, item.institutionId);
      const lastWebhookAt = await getLastWebhookAt(ctx, plaidItemId);
      return derive(item, institution, lastWebhookAt);
    },
  });

  export const getItemHealthByUser = query({
    args: { userId: v.string() },
    returns: v.array(/* ItemHealth validator */),
    handler: async (ctx, { userId }) => {
      const items = await ctx.db
        .query("plaidItems")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      const visible = items.filter((i) => i.status !== "deleting");
      const results = await Promise.all(
        visible.map(async (item) => {
          const institution = await getInstitutionSnapshot(ctx, item.institutionId);
          const lastWebhookAt = await getLastWebhookAt(ctx, item._id);
          return derive(item, institution, lastWebhookAt);
        }),
      );
      return results;
    },
  });

  // Helper: look up cached institution snapshot from plaidInstitutions table.
  async function getInstitutionSnapshot(ctx, institutionId: string | undefined) {
    if (!institutionId) {
      return { institutionId: null, institutionName: null, institutionLogoBase64: null, institutionPrimaryColor: null };
    }
    const inst = await ctx.db
      .query("plaidInstitutions")
      .withIndex("by_institution_id", (q) => q.eq("institutionId", institutionId))
      .first();
    if (!inst) {
      return { institutionId, institutionName: null, institutionLogoBase64: null, institutionPrimaryColor: null };
    }
    return {
      institutionId: inst.institutionId,
      institutionName: inst.name ?? null,
      institutionLogoBase64: inst.logoBase64 ?? null,
      institutionPrimaryColor: inst.primaryColor ?? null,
    };
  }

  // Helper: most recent webhookLogs row for this item, by received_at.
  async function getLastWebhookAt(ctx, plaidItemId) {
    const log = await ctx.db
      .query("webhookLogs")
      .withIndex("by_item", (q) => q.eq("plaidItemId", plaidItemId))
      .order("desc")
      .first();
    return log?.receivedAt ?? null;
  }
  ```

  Verify the `plaidInstitutions` table and `by_institution_id` index name per [packages/convex-plaid/src/component/schema.ts:502](packages/convex-plaid/src/component/schema.ts:502); adjust field names to match actual schema.

- [ ] **Step 5: Re-export `ItemHealth` from package entrypoint**

  Modify `packages/convex-plaid/src/index.ts`:

  ```ts
  export type { ItemHealth } from "./component/health";
  ```

- [ ] **Step 6: Add host-app wrappers in [packages/backend/convex/plaidComponent.ts](packages/backend/convex/plaidComponent.ts)**

  After the existing query wrappers (for example after `getLiabilitiesByUserId` at [plaidComponent.ts:733](packages/backend/convex/plaidComponent.ts:733)):

  ```ts
  import type { ItemHealth } from "@crowdevelopment/convex-plaid";

  export const getPlaidItemHealth = query({
    args: { plaidItemId: v.id("plaidItems") },
    returns: /* ItemHealth validator, copied from component */,
    handler: async (ctx, { plaidItemId }) => {
      const viewer = ctx.viewerX();
      const item = await ctx.runQuery(components.plaid.public.getItem, { plaidItemId });
      if (!item || item.userId !== viewer.externalId) {
        throw new Error("Plaid item not found or unauthorized");
      }
      return await ctx.runQuery(components.plaid.public.getItemHealth, { plaidItemId });
    },
  });

  export const getPlaidItemHealthByUser = query({
    args: {},
    returns: v.array(/* ItemHealth validator */),
    handler: async (ctx) => {
      const viewer = ctx.viewerX();
      return await ctx.runQuery(components.plaid.public.getItemHealthByUser, {
        userId: viewer.externalId,
      });
    },
  });
  ```

- [ ] **Step 7: Run tests; expect green**

  ```bash
  cd packages/convex-plaid && bun run test -- health
  ```

- [ ] **Step 8: Rebuild and typecheck**

  ```bash
  cd packages/convex-plaid && bun run build && cd -
  bun typecheck
  ```

- [ ] **Step 9: Commit**

  ```bash
  gt create feat/agentic-home/W4-05-item-health-query -m "feat(plaid): add getItemHealth query with derivation"
  ```

**Test:**
- 12 unit tests in `health.test.ts` pass (one per derivation branch plus the metadata-carrier test).
- `bun typecheck` passes.
- Queries callable via Convex dashboard in dev.

**Acceptance checklist:**
- [ ] Pure `derive` function implemented.
- [ ] Both component public queries implemented with cascade joins.
- [ ] `deleting` items filtered from list.
- [ ] Host-app wrappers verify viewer ownership.
- [ ] All derivation branches unit-tested.
- [ ] Component rebuilt; typecheck passes.
- [ ] CodeRabbit clean.
- [ ] Reviewed by Codex.

---

## Task W4.6: Add host-app `errorTaxonomy.ts` with `reasonCodeToUserCopy`

**Recommended agent:** Claude Code (user-facing copy is cross-cutting; coordinating with W1 banner / W7 email implies careful consistency).
**Rationale:** Single module; 17 mapping rows; one public helper function; unit tests cover every row plus the null-institution fallback.
**Linear issue:** `LIN-W4-06`.

**Files:**
- Create: `packages/backend/convex/plaid/errorTaxonomy.ts` (new directory `plaid/`).
- Create: `packages/backend/convex/plaid/errorTaxonomy.test.ts`.

**Scope:**
- Acceptance: `reasonCodeToUserCopy(reasonCode, institutionName)` returns `{ title, description, ctaLabel }` per spec Section 7.3. Unit tests cover 17 rows plus null institution fallback.

**Steps:**

- [ ] **Step 1: Write failing tests**

  Create `packages/backend/convex/__tests__/errorTaxonomy.test.ts`:

  ```ts
  // packages/backend/convex/__tests__/errorTaxonomy.test.ts
  import { describe, expect, it } from "vitest";
  import { reasonCodeToUserCopy } from "../plaid/errorTaxonomy";

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

    it("permanent_unknown uses Contact support CTA", () => {
      const copy = reasonCodeToUserCopy("permanent_unknown", "Chase");
      expect(copy.ctaLabel).toBe("Contact support");
    });

    // Exhaustive coverage: every ReasonCode returns a defined UserCopy object.
    const allReasons = [
      "healthy", "syncing_initial", "syncing_incremental",
      "auth_required_login", "auth_required_expiration",
      "transient_circuit_open", "transient_institution_down", "transient_rate_limited",
      "permanent_invalid_token", "permanent_item_not_found", "permanent_no_accounts",
      "permanent_access_not_granted", "permanent_products_not_supported",
      "permanent_institution_unsupported", "permanent_revoked", "permanent_unknown",
      "new_accounts_available",
    ] as const;
    for (const r of allReasons) {
      it(`returns a defined UserCopy for ${r}`, () => {
        const copy = reasonCodeToUserCopy(r, "TestBank");
        expect(copy.title).toBeTruthy();
        expect(copy.description).toBeTruthy();
        expect(typeof copy.ctaLabel === "string" || copy.ctaLabel === null).toBe(true);
        // No em-dashes anywhere in copy (U+2014)
        expect(copy.title.includes("\u2014")).toBe(false);
        expect(copy.description.includes("\u2014")).toBe(false);
      });
    }
  });
  ```

  Adjust the test path: if `packages/backend/convex/__tests__/` is the convention (from W4.1), keep it there. If tests live alongside source, move to `packages/backend/convex/plaid/errorTaxonomy.test.ts`. Prefer the `__tests__` directory for clarity.

- [ ] **Step 2: Run test; expect fail (red)**

  ```bash
  cd packages/backend && bun run test -- errorTaxonomy
  ```

- [ ] **Step 3: Implement the module**

  Create `packages/backend/convex/plaid/errorTaxonomy.ts`:

  ```ts
  // packages/backend/convex/plaid/errorTaxonomy.ts
  import type { ReasonCode } from "@crowdevelopment/convex-plaid";

  export interface UserCopy {
    title: string;
    description: string;
    ctaLabel: string | null;
  }

  const FALLBACK_INSTITUTION = "your bank";

  function resolve(institutionName: string | null): string {
    return institutionName && institutionName.length > 0 ? institutionName : FALLBACK_INSTITUTION;
  }

  export function reasonCodeToUserCopy(
    reasonCode: ReasonCode,
    institutionName: string | null,
  ): UserCopy {
    const i = resolve(institutionName);
    switch (reasonCode) {
      case "healthy":
        return { title: "Connected", description: "Sync is up to date.", ctaLabel: null };
      case "syncing_initial":
        return {
          title: "Setting up",
          description: `We are pulling your accounts and history from ${i}.`,
          ctaLabel: null,
        };
      case "syncing_incremental":
        return { title: "Syncing", description: `Checking ${i} for updates.`, ctaLabel: null };
      case "auth_required_login":
        return {
          title: "Reconnect needed",
          description: `${i} needs you to re-enter your credentials.`,
          ctaLabel: "Reconnect",
        };
      case "auth_required_expiration":
        return {
          title: "Credentials expiring",
          description: `Your connection to ${i} will expire soon. Reconnect to stay in sync.`,
          ctaLabel: "Reconnect",
        };
      case "transient_circuit_open":
        return {
          title: "Temporarily paused",
          description: `${i} returned too many errors in a row. We will retry automatically.`,
          ctaLabel: null,
        };
      case "transient_institution_down":
        return {
          title: "Bank unavailable",
          description: `${i} is not responding right now. We will retry automatically.`,
          ctaLabel: null,
        };
      case "transient_rate_limited":
        return {
          title: "Retrying shortly",
          description: "We are being rate-limited. We will retry shortly.",
          ctaLabel: null,
        };
      case "permanent_invalid_token":
        return {
          title: "Connection broken",
          description: `Your connection to ${i} is broken. Remove and reconnect it.`,
          ctaLabel: "Contact support",
        };
      case "permanent_item_not_found":
        return {
          title: "Connection lost",
          description: `This connection to ${i} can no longer be found. Remove and reconnect it.`,
          ctaLabel: "Contact support",
        };
      case "permanent_no_accounts":
        return {
          title: "No accounts found",
          description: `No eligible accounts were found at ${i}.`,
          ctaLabel: "Contact support",
        };
      case "permanent_access_not_granted":
        return {
          title: "Access denied",
          description: "Access was denied during connection. Reconnect and grant access to all needed data.",
          ctaLabel: "Reconnect",
        };
      case "permanent_products_not_supported":
        return {
          title: "Not supported",
          description: `${i} does not support the features SmartPockets uses.`,
          ctaLabel: "Contact support",
        };
      case "permanent_institution_unsupported":
        return {
          title: "No longer supported",
          description: `${i} is no longer supported by SmartPockets.`,
          ctaLabel: "Contact support",
        };
      case "permanent_revoked":
        return {
          title: "Access revoked",
          description: `You revoked access from ${i}. Reconnect if this was a mistake.`,
          ctaLabel: "Reconnect",
        };
      case "permanent_unknown":
        return {
          title: "Sync error",
          description: `Something went wrong syncing ${i}. Contact support if it continues.`,
          ctaLabel: "Contact support",
        };
      case "new_accounts_available":
        return {
          title: "New accounts available",
          description: `${i} has new accounts you can add to SmartPockets.`,
          ctaLabel: "Update accounts",
        };
    }
  }
  ```

- [ ] **Step 4: Run tests; expect green**

  ```bash
  cd packages/backend && bun run test -- errorTaxonomy
  ```

  Expected: all 22 passing (5 behavior tests + 17 exhaustive).

- [ ] **Step 5: Typecheck**

  ```bash
  bun typecheck
  ```

- [ ] **Step 6: Commit**

  ```bash
  gt create feat/agentic-home/W4-06-user-copy-taxonomy -m "feat(backend): add reasonCodeToUserCopy helper"
  ```

**Test:**
- All 22 test cases pass.
- `bun typecheck` passes.

**Acceptance checklist:**
- [ ] Module created at `packages/backend/convex/plaid/errorTaxonomy.ts`.
- [ ] All 17 `ReasonCode` branches handled.
- [ ] Null institutionName falls back to "your bank".
- [ ] No em-dashes in any copy string.
- [ ] Tests pass.
- [ ] CodeRabbit clean.
- [ ] Reviewed by Codex.

---

## Task W4.7: Webhook branches + error-tracking stamp + reconsent dispatch + welcome dispatch + exchangePublicTokenAction extensions

**Recommended agent:** Codex (uniform pattern; precedent already exists at [http.ts:188](packages/backend/convex/http.ts:188) through [:289](packages/backend/convex/http.ts:289)).
**Rationale:** The existing `ctx.scheduler.runAfter` + internal-mutation pattern is well-established. Each of the 9 new webhook branches follows the same structure. The host-app action extensions (welcome dispatch on first link, error-tracking stamps on transitions, reconsent dispatch on `ITEM_LOGIN_REQUIRED` / `PENDING_EXPIRATION`) are isolated and scriptable.
**Linear issue:** `LIN-W4-07`.

**Files:**
- Modify: [packages/backend/convex/http.ts](packages/backend/convex/http.ts):
  - Add 9 new webhook branches (5 real + 4 stub).
  - Extend `ITEM:ERROR[ITEM_LOGIN_REQUIRED]` and `ITEM:PENDING_EXPIRATION` branches to schedule `internal.email.dispatch.dispatchReconsentRequired` after `markNeedsReauthInternal`.
  - Extend `ITEM:ERROR` (all sub-codes) and `ITEM:PENDING_EXPIRATION` to call `markFirstErrorAtInternal` before the status patch.
- Modify: [packages/backend/convex/plaidComponent.ts:80](packages/backend/convex/plaidComponent.ts:80) (`exchangePublicTokenAction`):
  - Call `clearNewAccountsAvailableInternal` when update-mode exchange for an existing item succeeds.
  - Call `internal.users.countActivePlaidItems` on successful exchange; if `priorLinkCount === 0`, schedule `internal.email.dispatch.dispatchWelcomeOnboarding` with `variant: "plaid-linked"`.
- Modify: [packages/backend/convex/plaidComponent.ts:177](packages/backend/convex/plaidComponent.ts:177) (`completeReauthAction`):
  - After status patch back to `active`, call `clearErrorTrackingInternal`.

**Scope:**
- Acceptance: `curl` against `/webhooks-plaid` with a sandbox-bypassed fixture for each of the 9 new codes produces the correct side effect (verifiable via Convex dashboard logs in dev). First Plaid link for a user schedules `dispatchWelcomeOnboarding`. Second Plaid link for the same user schedules zero welcome dispatches. `ITEM_LOGIN_REQUIRED` and `PENDING_EXPIRATION` transitions schedule `dispatchReconsentRequired` with the correct `reason` enum. `markFirstErrorAtInternal` stamps `firstErrorAt` on first transition into error-class status and is a no-op on subsequent observations. `clearErrorTrackingInternal` fires on successful re-auth and wipes both fields. No regression in existing 8 HANDLED branches.

**Steps:**

- [ ] **Step 1: Confirm prerequisites**

  Task W4.2 landed the dispatch stubs at `internal.email.dispatch.dispatchWelcomeOnboarding`, `dispatchReconsentRequired`, `dispatchItemErrorPersistent` plus the host-app `internal.users.countActivePlaidItems` query plus the three new component mutations (`markFirstErrorAtInternal`, `clearErrorTrackingInternal`, `markItemErrorDispatchedInternal`). This task uses them; no helper files to create.

  Verify by typechecking:

  ```bash
  bun typecheck
  ```

  Expected: all green before any further edits.

- [ ] **Step 2: Write the new webhook-branch code in `http.ts`**

  Edit [packages/backend/convex/http.ts:186](packages/backend/convex/http.ts:186). Add new branches within the existing `if (webhook_type === "TRANSACTIONS")` block and below the existing `ITEM` block. Example patch structure (final code adheres to existing formatting):

  ```ts
  // Existing TRANSACTIONS branch; add DEFAULT_UPDATE:
  if (webhook_type === "TRANSACTIONS") {
    if (webhook_code === "SYNC_UPDATES_AVAILABLE") {
      // existing
    } else if (webhook_code === "INITIAL_UPDATE" || webhook_code === "HISTORICAL_UPDATE") {
      // existing
    } else if (webhook_code === "RECURRING_TRANSACTIONS_UPDATE") {
      // existing
    } else if (webhook_code === "DEFAULT_UPDATE") {
      console.log("[Webhook] TRANSACTIONS DEFAULT_UPDATE: scheduling transaction sync (mirror of SYNC_UPDATES_AVAILABLE)...");
      await ctx.scheduler.runAfter(0, internal.plaidComponent.syncTransactionsInternal, {
        plaidItemId: plaidItem._id,
        trigger: "webhook",
      });
      await ctx.scheduler.runAfter(500, internal.plaidComponent.refreshAccountsAndSyncCreditCardsInternal, {
        plaidItemId: plaidItem._id,
        userId: plaidItem.userId,
        trigger: "webhook",
      });
    }
  }

  // Existing ITEM branch; add LOGIN_REPAIRED and NEW_ACCOUNTS_AVAILABLE:
  else if (webhook_type === "ITEM") {
    // existing cases...
    else if (webhook_code === "LOGIN_REPAIRED") {
      console.log("[Webhook] ITEM LOGIN_REPAIRED: log-only (see spec Section 3.4)");
      // No status mutation; no scheduler call. webhookLogs row already written upstream.
    }
    else if (webhook_code === "NEW_ACCOUNTS_AVAILABLE") {
      console.log("[Webhook] ITEM NEW_ACCOUNTS_AVAILABLE: stamping plaidItems.newAccountsAvailableAt");
      await ctx.runMutation(
        components.plaid.private.setNewAccountsAvailableInternal,
        { plaidItemId: plaidItem._id },
      );
    }
    // existing WEBHOOK_UPDATE_ACKNOWLEDGED...
    else {
      // existing "Unhandled ITEM code" log
    }
  }

  // NEW: stub branches
  else if (webhook_type === "HOLDINGS") {
    console.log(`[Webhook] HOLDINGS ${webhook_code}: log-only (investments deferred; see spec Section 3.1)`);
  }
  else if (webhook_type === "INVESTMENTS_TRANSACTIONS") {
    console.log(`[Webhook] INVESTMENTS_TRANSACTIONS ${webhook_code}: log-only (investments deferred)`);
  }
  else if (webhook_type === "AUTH") {
    console.log(`[Webhook] AUTH ${webhook_code}: log-only (AUTH product not in MVP)`);
  }
  else if (webhook_type === "IDENTITY") {
    console.log(`[Webhook] IDENTITY ${webhook_code}: log-only (identity merge deferred to post-MVP)`);
  }

  // Existing UNKNOWN catch-all...
  ```

- [ ] **Step 3: Extend ITEM:ERROR and PENDING_EXPIRATION to stamp `firstErrorAt` and schedule `dispatchReconsentRequired`**

  Inside the existing `ITEM:ERROR` case, BEFORE the existing `markNeedsReauthInternal` / `setItemErrorInternal` calls, stamp the error-transition clock:

  ```ts
  await ctx.runMutation(
    components.plaid.private.markFirstErrorAtInternal,
    { plaidItemId: plaidItem._id },
  );
  ```

  Then AFTER `markNeedsReauthInternal` when `errorCode === "ITEM_LOGIN_REQUIRED"`, schedule the reconsent dispatch per contracts §15:

  ```ts
  await ctx.scheduler.runAfter(0, internal.email.dispatch.dispatchReconsentRequired, {
    userId: plaidItem.userId,
    plaidItemId: plaidItem._id,
    institutionName: plaidItem.institutionName ?? "your bank",
    reason: "ITEM_LOGIN_REQUIRED",
  });
  ```

  Inside `ITEM:PENDING_EXPIRATION`, stamp `firstErrorAt` (same pattern as above), then after `markNeedsReauthInternal`:

  ```ts
  await ctx.scheduler.runAfter(0, internal.email.dispatch.dispatchReconsentRequired, {
    userId: plaidItem.userId,
    plaidItemId: plaidItem._id,
    institutionName: plaidItem.institutionName ?? "your bank",
    reason: "PENDING_EXPIRATION",
  });
  ```

  Note: the dispatch payload does NOT include `reconnectUrl`; contracts §15 `dispatchReconsentRequired` takes exactly `{ userId, plaidItemId, institutionName, reason }`. The reconnect URL is constructed inside the W7 template.

  Import `internal` at the top of `http.ts` if not already imported (existing imports reference it for the scheduler calls).

- [ ] **Step 4: Extend `exchangePublicTokenAction` to clear `newAccountsAvailableAt` on update-mode and dispatch welcome on first link**

  Edit [packages/backend/convex/plaidComponent.ts:80](packages/backend/convex/plaidComponent.ts:80):

  ```ts
  export const exchangePublicTokenAction = action({
    args: { publicToken: v.string(), userId: v.string() },
    returns: /* existing */,
    handler: async (ctx, args) => {
      const plaid = getPlaidClient();
      const result = await plaid.exchangePublicToken(ctx, args);
      // result.plaidItemId is the component's Id<"plaidItems">.

      // 1. Fetch the item we just exchanged.
      const item = await ctx.runQuery(components.plaid.public.getItem, {
        plaidItemId: result.plaidItemId,
      });

      // 2. If this was an update-mode exchange (item already had newAccountsAvailableAt), clear it.
      if (item?.newAccountsAvailableAt != null) {
        await ctx.runMutation(
          components.plaid.private.clearNewAccountsAvailableInternal,
          { plaidItemId: result.plaidItemId },
        );
      }

      // 3. Welcome-onboarding trigger per contracts §13.
      // Count prior active items BEFORE this link was counted (check if this was
      // the first link). Use countActivePlaidItems which filters out status=deleting.
      const priorLinkCount = await ctx.runQuery(
        internal.users.countActivePlaidItems.countActivePlaidItems,
        { userId: args.userId },
      );
      // priorLinkCount is the count AFTER the new item is persisted; subtract 1 to
      // get the pre-link count. If the exchange created a net-new item, priorLinkCount
      // >= 1 (at least the just-created item). If the exchange was update-mode for an
      // existing item, priorLinkCount includes that existing item. Only dispatch welcome
      // when the count equals 1 AND the item's _creationTime is within the last 60 seconds.
      const isFirstLinkEver = priorLinkCount === 1
        && item != null
        && (Date.now() - item._creationTime) < 60_000;
      if (isFirstLinkEver) {
        const institutionName = item?.institutionName ?? "your bank";
        await ctx.scheduler.runAfter(0, internal.email.dispatch.dispatchWelcomeOnboarding, {
          userId: args.userId,
          variant: "plaid-linked",
          firstLinkedInstitutionName: institutionName,
        });
      }

      return result;
    },
  });
  ```

  The "first link ever" test uses `priorLinkCount === 1` (meaning the just-created item is the only one) AND a fresh `_creationTime` to distinguish update-mode exchanges (which do not create a new item) from net-new link exchanges. Update-mode exchanges against an existing item that is the user's only item would also match `priorLinkCount === 1` but the `_creationTime` would not be fresh; the 60 s check rejects those. Adjust the time window based on what exchangePublicToken typically takes (upper bound; most exchanges complete in a few seconds).

- [ ] **Step 5: Extend `completeReauthAction` to clear error-tracking fields**

  Edit [packages/backend/convex/plaidComponent.ts:177](packages/backend/convex/plaidComponent.ts:177):

  ```ts
  export const completeReauthAction = action({
    args: { plaidItemId: v.id("plaidItems") },
    returns: /* existing */,
    handler: async (ctx, args) => {
      const plaid = getPlaidClient();
      const result = await plaid.completeReauth(ctx, args);
      // Clear error-tracking on successful recovery.
      await ctx.runMutation(
        components.plaid.private.clearErrorTrackingInternal,
        { plaidItemId: args.plaidItemId },
      );
      return result;
    },
  });
  ```

- [ ] **Step 6: Typecheck and manual smoke**

  ```bash
  bun typecheck
  ```

  Manual smoke: `bun dev:backend`; then from the Plaid Sandbox MCP (or `curl` with signature bypass), fire `TRANSACTIONS:DEFAULT_UPDATE` against a dev item. Confirm the Convex dashboard logs show the new branch executing and schedulers dispatching. Trigger `ITEM:ERROR[ITEM_LOGIN_REQUIRED]`; confirm the `[email/dispatch:W7-stub] dispatchReconsentRequired` log line with `reason: "ITEM_LOGIN_REQUIRED"`. Link a new sandbox institution; confirm `[email/dispatch:W7-stub] dispatchWelcomeOnboarding` log line with `variant: "plaid-linked"`.

- [ ] **Step 7: Commit**

  ```bash
  gt create feat/agentic-home/W4-07-webhook-branches-and-dispatches -m "feat(webhook): close 7 NOT FOUND codes; dispatch reconsent and welcome per contracts"
  ```

**Test:**
- `bun typecheck` passes.
- Manual smoke: each of the 9 new codes triggers the expected log line and (for the 3 real handlers + reconsent dispatch + welcome dispatch) schedules the correct internal action. Integration tests in W4.9 formalize this.
- Existing 8 HANDLED branches unchanged.

**Acceptance checklist:**
- [ ] 5 real branches added (`TRANSACTIONS:DEFAULT_UPDATE`, `ITEM:LOGIN_REPAIRED` log-only, `ITEM:NEW_ACCOUNTS_AVAILABLE`; plus `ITEM:ERROR` / `ITEM:PENDING_EXPIRATION` branches extended with `markFirstErrorAtInternal` + `dispatchReconsentRequired`).
- [ ] 4 stub branches added (`HOLDINGS:*`, `INVESTMENTS_TRANSACTIONS:*`, `AUTH:*`, `IDENTITY:*`).
- [ ] `exchangePublicTokenAction` clears `newAccountsAvailableAt` on update-mode AND dispatches `dispatchWelcomeOnboarding` on first link (per contracts §13).
- [ ] `completeReauthAction` calls `clearErrorTrackingInternal` on recovery.
- [ ] `dispatchReconsentRequired` scheduled with `reason: "ITEM_LOGIN_REQUIRED"` or `"PENDING_EXPIRATION"` per contracts §15 (not the old `reasonCode` field).
- [ ] `dispatchWelcomeOnboarding` scheduled only when `countActivePlaidItems === 1` AND `_creationTime` is fresh.
- [ ] `markFirstErrorAtInternal` called before error-status patches.
- [ ] Typecheck passes.
- [ ] Manual Sandbox smoke green for all 5 real handlers + welcome dispatch on first link.
- [ ] CodeRabbit clean.
- [ ] Reviewed by Claude Code.

---

## Task W4.8: Capture JWT-signed Plaid webhook fixtures for 9 codes

**Recommended agent:** Codex (deterministic, repetitive; Sandbox MCP interaction follows a recipe).
**Rationale:** Each fixture is a JSON file with the webhook body and either a valid JWT or `bypassSignature: true`. Research task 7 identified which codes fire via the Plaid Sandbox MCP and which require manual construction.
**Linear issue:** `LIN-W4-08`.

**Files:**
- Create 9 JSON fixtures under `packages/backend/convex/__tests__/fixtures/plaid-webhooks/`:
  - `transactions_default_update.json`
  - `item_login_repaired.json`
  - `item_new_accounts_available.json`
  - `holdings_default_update.json`
  - `investments_transactions_default_update.json`
  - `auth_default_update.json`
  - `identity_default_update.json`
  - `transactions_sync_updates_available.json` (regression-guard)
  - `item_error_login_required.json` (regression-guard)

**Scope:**
- Acceptance: 9 fixture files present; each loads as valid JSON; each `body.webhook_type` and `body.webhook_code` match the filename; each has either a real JWT (captured from a live sandbox webhook delivery) or `bypassSignature: true`.

**Steps:**

- [ ] **Step 1: Verify Plaid Sandbox MCP availability**

  ```
  # Via the MCP interface or agent tooling:
  # List available tools; confirm plaid-sandbox MCP is connected and exposes a
  # "simulate_webhook" or equivalent tool.
  ```

  If unavailable, proceed with manual fixtures per Step 3.

- [ ] **Step 2: Attempt MCP-driven capture for each code**

  For each of the 9 codes, invoke the Sandbox MCP `simulate_webhook` (or call `/sandbox/item/fire_webhook` directly). Capture the emitted webhook body and the `Plaid-Verification` JWT if the webhook delivery is routed to a reverse-proxy endpoint you control.

  Alternative: use Convex dashboard logs to capture the body of any webhook that reaches `/webhooks-plaid` during sandbox simulation.

- [ ] **Step 3: Fall back to manually-constructed fixtures for codes the MCP cannot fire**

  For any code the MCP does not support, construct the fixture with `bypassSignature: true`:

  ```json
  {
    "body": {
      "webhook_type": "ITEM",
      "webhook_code": "LOGIN_REPAIRED",
      "item_id": "test_item_id_placeholder",
      "error": null
    },
    "jwt": null,
    "bypassSignature": true
  }
  ```

- [ ] **Step 4: Verify each fixture loads**

  Add a sanity check (can be inline in the W4.9 test setup or a standalone script):

  ```bash
  cd packages/backend
  for f in convex/__tests__/fixtures/plaid-webhooks/*.json; do
    node -e "const d = require('./' + '$f'); if (!d.body.webhook_type) throw '$f missing webhook_type'; console.log('$f ok');"
  done
  ```

- [ ] **Step 5: Commit**

  ```bash
  gt create feat/agentic-home/W4-08-webhook-fixtures -m "test(webhook): add 9 Plaid webhook fixtures for integration tests"
  ```

**Test:**
- All 9 fixtures load as valid JSON.
- For each fixture, `body.webhook_type` and `body.webhook_code` are non-empty strings.

**Acceptance checklist:**
- [ ] 9 fixture files exist with correct naming.
- [ ] Each fixture has either a valid JWT or `bypassSignature: true`.
- [ ] README explains which fixtures were captured via MCP vs manual.
- [ ] Commit includes per-fixture capture-source notes in the commit body.
- [ ] CodeRabbit clean.
- [ ] Reviewed by Claude Code.

---

## Task W4.9: Write host-app webhook integration tests

**Recommended agent:** Codex (cases are enumerated and well-specified; pattern is repetitive).
**Rationale:** One test per webhook branch, both new and regression-guard; one clock-manipulation test for the cron dedup pattern; one test for the 24h email dedup.
**Linear issue:** `LIN-W4-09`.

**Files:**
- Create: `packages/backend/convex/__tests__/plaidWebhooks.test.ts`.
- May modify: `packages/backend/vitest.config.ts` if clock-manipulation requires `fakeTimers` config.

**Scope:**
- Acceptance: 17+ test cases cover new handlers, regression guards for existing handlers, cron dedup, and email dedup. Tests replay fixtures from W4.8.

**Steps:**

- [ ] **Step 1: Write the test file scaffolding**

  Create `packages/backend/convex/__tests__/plaidWebhooks.test.ts`:

  ```ts
  // packages/backend/convex/__tests__/plaidWebhooks.test.ts
  import { describe, expect, it, vi, beforeEach } from "vitest";
  import { convexTest } from "convex-test";
  import schema from "../schema";
  import { api, internal } from "../_generated/api";
  import fs from "node:fs";
  import path from "node:path";

  const FIXTURE_DIR = path.join(__dirname, "fixtures/plaid-webhooks");

  function loadFixture(name: string) {
    return JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, name), "utf8"));
  }

  async function postWebhook(t: ReturnType<typeof convexTest>, fixture: any) {
    // Call the http action directly with a Request object. If bypassSignature is true,
    // set an env flag (or mock verifyPlaidWebhook via vi.mock) so the signature check is skipped.
    const body = JSON.stringify(fixture.body);
    const request = new Request("https://test.convex.site/webhooks-plaid", {
      method: "POST",
      headers: fixture.jwt ? { "Plaid-Verification": fixture.jwt } : {},
      body,
    });
    // The test harness replays the Request against the httpAction handler.
    // convex-test exposes a way to invoke httpActions; see its docs.
    return await t.fetch(request);
  }
  ```

- [ ] **Step 2: Add tests for 5 new real handlers**

  For each of `transactions_default_update`, `item_login_repaired`, `item_new_accounts_available`, `holdings_default_update`, `investments_transactions_default_update`:

  Example case:

  ```ts
  describe("TRANSACTIONS:DEFAULT_UPDATE", () => {
    it("schedules syncTransactionsInternal and refreshAccountsAndSyncCreditCardsInternal with 500ms offset", async () => {
      const t = convexTest(schema);
      // Seed a plaidItem matching fixture's item_id
      // Call postWebhook with transactions_default_update.json
      // Assert that two scheduler runs exist; offsets match 0 and 500.
      const fixture = loadFixture("transactions_default_update.json");
      const resp = await postWebhook(t, fixture);
      expect(resp.status).toBe(200);
      // Inspect scheduler queue via convex-test's API
      const scheduled = await t.finishInProgressScheduledFunctions();
      const calls = scheduled.filter(s => s.name.includes("syncTransactionsInternal") || s.name.includes("refreshAccountsAndSyncCreditCardsInternal"));
      expect(calls).toHaveLength(2);
    });
  });
  ```

  Follow convex-test's API for scheduler introspection. If the exact method names differ, adjust to the library's current surface.

- [ ] **Step 3: Add tests for 4 stubs**

  For each of `auth_default_update`, `identity_default_update`, plus `holdings` and `investments_transactions` (already covered above under "5 new real handlers" even though 2 of them are log-only):

  Assert:
  - Response status 200.
  - No scheduler calls made.
  - `webhookLogs` row exists for the item.

- [ ] **Step 4: Add regression-guard tests for 6 existing HANDLED branches**

  Replay fixtures for `transactions_sync_updates_available`, `transactions_recurring_transactions_update`, `liabilities_default_update`, `item_error_login_required`, `item_pending_expiration`, `item_user_permission_revoked`, `item_pending_disconnect`. Each assertion confirms the existing scheduler dispatch, validating no regression.

- [ ] **Step 5: Add dispatchReconsentRequired emission tests**

  ```ts
  describe("dispatchReconsentRequired emission", () => {
    it("schedules dispatchReconsentRequired with reason=ITEM_LOGIN_REQUIRED on ITEM_LOGIN_REQUIRED webhook", async () => {
      const t = convexTest(schema);
      // Seed a plaidItem, institutionName="Acme Bank", status=active
      const fixture = loadFixture("item_error_login_required.json");
      await postWebhook(t, fixture);
      const scheduled = await t.finishInProgressScheduledFunctions();
      const dispatches = scheduled.filter(s => s.name.includes("dispatchReconsentRequired"));
      expect(dispatches).toHaveLength(1);
      expect(dispatches[0].args).toMatchObject({
        institutionName: "Acme Bank",
        reason: "ITEM_LOGIN_REQUIRED",
      });
    });

    it("schedules dispatchReconsentRequired with reason=PENDING_EXPIRATION on PENDING_EXPIRATION webhook", async () => {
      // similar, with reason: "PENDING_EXPIRATION"
    });

    it("firstErrorAt is stamped on first error transition and preserved on second error observation", async () => {
      const t = convexTest(schema);
      const fixture = loadFixture("item_error_login_required.json");
      await postWebhook(t, fixture);
      const item1 = /* read item */; expect(item1.firstErrorAt).toBeDefined();
      const t1 = item1.firstErrorAt;
      await postWebhook(t, fixture);
      const item2 = /* read item */; expect(item2.firstErrorAt).toBe(t1); // monotonic
    });

    it("two rapid ITEM_LOGIN_REQUIRED webhooks schedule TWO dispatchReconsentRequired calls (W4 does not dedup; W7 does)", async () => {
      // W4 emits each transition; W7 workflow's content-hash dedup prevents actual duplicate sends.
      // Test documents the producer-side contract per contracts §9 and the idempotency spike.
    });
  });
  ```

- [ ] **Step 6: Add dispatchWelcomeOnboarding emission test**

  ```ts
  describe("dispatchWelcomeOnboarding emission", () => {
    it("schedules one welcome on first Plaid link for a user", async () => {
      const t = convexTest(schema);
      // Seed user with zero plaidItems.
      // Invoke exchangePublicTokenAction (mocked Plaid client returns item_id_1).
      const scheduled = await t.finishInProgressScheduledFunctions();
      const welcomes = scheduled.filter(s => s.name.includes("dispatchWelcomeOnboarding"));
      expect(welcomes).toHaveLength(1);
      expect(welcomes[0].args).toMatchObject({ variant: "plaid-linked" });
    });

    it("schedules zero welcomes on second Plaid link for the same user", async () => {
      // Seed user with one pre-existing plaidItem.
      // Invoke exchangePublicTokenAction; assert welcomes array is empty.
    });
  });
  ```

- [ ] **Step 7: Add cron 72h debounce test (W4.11 lands the cron; write the test now as `it.skip` and unblock in W4.11)**

  ```ts
  describe("dispatchItemErrorPersistent cron (unblock in W4.11)", () => {
    it.skip("follows the lastDispatchedAt-gated 6-hour cadence", async () => {
      // 1. Seed an item with status="error", errorAt, errorCode, lastSyncedAt = now-48h,
      //    firstErrorAt = now-48h, lastDispatchedAt = undefined.
      // 2. Run the cron action. Assert dispatchItemErrorPersistent scheduled once.
      //    Assert item.lastDispatchedAt is now set.
      // 3. Advance 6h. Run cron. Assert zero new dispatches (lastDispatchedAt < 72h).
      // 4. Advance 6h (12h total). Run cron. Assert zero new dispatches.
      // ... repeat through 66h.
      // 5. Advance 6h (72h total since last dispatch). Run cron. Assert one new dispatch.
    });
  });
  ```

- [ ] **Step 8: Run full suite**

  ```bash
  cd packages/backend && bun run test
  ```

- [ ] **Step 9: Commit**

  ```bash
  gt create feat/agentic-home/W4-09-webhook-integration-tests -m "test(webhook): add Plaid webhook + dispatch integration tests"
  ```

**Test:**
- `cd packages/backend && bun run test` shows the new suite passing (with one `it.skip` for the cron test unblocked in W4.11).
- `bun typecheck` passes.

**Acceptance checklist:**
- [ ] Tests for 5 new real handlers.
- [ ] Tests for 4 stub handlers.
- [ ] Regression tests for 6 existing HANDLED branches.
- [ ] `dispatchReconsentRequired` emission tests (two `reason` values + firstErrorAt monotonic + producer-side emits on every transition).
- [ ] `dispatchWelcomeOnboarding` emission tests (first link schedules once; second link schedules zero).
- [ ] Cron `dispatchItemErrorPersistent` test (`it.skip` now; unblock in W4.11).
- [ ] All non-skipped tests pass.
- [ ] CodeRabbit clean.
- [ ] Reviewed by Claude Code.

---

## Task W4.10: Migrate `getConnectedBanks` and Settings > Institutions callers to consume `getItemHealth`

**Recommended agent:** Codex (mechanical refactor; type-guarded by the new query shape).
**Rationale:** Single consumer rewrite per file. Types flow from `ItemHealth` so any missed field fails `bun typecheck`. No runtime behavior change beyond the new banner CTA.
**Linear issue:** `LIN-W4-10`.

**Files:**
- Modify: [packages/backend/convex/dashboard/queries.ts:313](packages/backend/convex/dashboard/queries.ts:313) (`getConnectedBanks` extends its return shape to include `{ state, recommendedAction, reasonCode }`).
- Modify: [apps/app/src/app/(app)/dashboard/components/ConnectedBanks.tsx](apps/app/src/app/(app)/dashboard/components/ConnectedBanks.tsx) (consume the new fields; swap `bank.status === "needs_reauth" || bank.status === "error"` boolean for `recommendedAction != null`).
- Modify: [apps/app/src/app/(app)/settings/institutions/page.tsx](apps/app/src/app/(app)/settings/institutions/page.tsx) and [apps/app/src/app/(app)/settings/institutions/[itemId]/institution-detail-content.tsx](apps/app/src/app/(app)/settings/institutions/[itemId]/institution-detail-content.tsx) (similar consumer updates).
- Optionally refactor: `apps/app/src/features/institutions/hooks/useTogglePlaidItem.ts` and related hooks to pass `mode` through to `createUpdateLinkTokenAction`.

**Scope:**
- Acceptance: `ConnectedBanks.tsx` renders a banner CTA per `recommendedAction` (Reconnect / Update accounts / disabled wait / Contact support). Settings > Institutions page does the same. No regression in the non-alert path. `bun typecheck` passes. Manual dev-mode smoke: a connected sandbox bank transitioning to `needs_reauth` shows a "Reconnect" CTA that opens update-mode Link.

**Steps:**

- [ ] **Step 1: Extend `getConnectedBanks` to include health fields**

  Edit [packages/backend/convex/dashboard/queries.ts:313](packages/backend/convex/dashboard/queries.ts:313):

  ```ts
  export const getConnectedBanks = query({
    args: {},
    returns: v.array(
      v.object({
        itemId: v.string(),
        institutionId: v.optional(v.string()),
        institutionName: v.string(),
        status: v.string(),
        lastSyncedAt: v.optional(v.number()),
        // NEW fields (additive; existing callers ignore them)
        state: v.union(
          v.literal("syncing"), v.literal("ready"), v.literal("error"), v.literal("re-consent-required"),
        ),
        recommendedAction: v.union(
          v.literal("reconnect"),
          v.literal("reconnect_for_new_accounts"),
          v.literal("wait"),
          v.literal("contact_support"),
          v.null(),
        ),
        reasonCode: v.string(),
        accounts: v.array( /* unchanged */ ),
      }),
    ),
    async handler(ctx) {
      const viewer = ctx.viewerX();
      const healths = await ctx.runQuery(components.plaid.public.getItemHealthByUser, {
        userId: viewer.externalId,
      });
      return await Promise.all(
        healths.map(async (h) => {
          const accounts = await ctx.runQuery(
            components.plaid.public.getAccountsByItem,
            { plaidItemId: h.plaidItemId },
          );
          return {
            itemId: h.plaidItemId,
            institutionId: h.institutionId ?? undefined,
            institutionName: h.institutionName ?? "Unknown Bank",
            status: /* keep the legacy string for back-compat; derive from state if needed */,
            lastSyncedAt: h.lastSyncedAt ?? undefined,
            state: h.state,
            recommendedAction: h.recommendedAction,
            reasonCode: h.reasonCode,
            accounts: accounts.map((a) => ({
              accountId: a.accountId, name: a.name, type: a.type, subtype: a.subtype,
              balance: a.balances?.current, mask: a.mask,
            })),
          };
        }),
      );
    },
  });
  ```

- [ ] **Step 2: Update `ConnectedBanks.tsx` to consume `recommendedAction` + `reasonCodeToUserCopy`**

  Replace the existing `needsAttention` boolean with a CTA derived from `recommendedAction`. Use the `reasonCodeToUserCopy` helper for copy:

  ```tsx
  import { reasonCodeToUserCopy } from "@repo/backend/convex/plaid/errorTaxonomy";

  // Inside the render loop:
  const copy = reasonCodeToUserCopy(bank.reasonCode as any, bank.institutionName);
  const needsAttention = bank.recommendedAction != null;
  ```

  Render the CTA button keyed on `recommendedAction`. The button handler opens `react-plaid-link` update-mode with `mode: "reauth"` or `mode: "account_select"` per `recommendedAction` value. Wire via the existing plaid-link-button pattern at [apps/app/src/features/institutions/components/plaid-link-button.tsx](apps/app/src/features/institutions/components/plaid-link-button.tsx).

- [ ] **Step 3: Update Settings > Institutions page**

  Similar refactor. Use `api.plaidComponent.getPlaidItemHealthByUser` directly for the list page and `api.plaidComponent.getPlaidItemHealth` for the detail page. Pipe `reasonCode` through `reasonCodeToUserCopy` for title / description / ctaLabel.

- [ ] **Step 4: Typecheck and manual dev smoke**

  ```bash
  bun typecheck
  bun dev:app   # manual: navigate to dashboard and settings; verify CTAs render
  ```

- [ ] **Step 5: Commit**

  ```bash
  gt create feat/agentic-home/W4-10-ui-callers -m "feat(dashboard): consume getItemHealth in ConnectedBanks and Settings"
  ```

**Test:**
- `bun typecheck` passes.
- Manual dev smoke confirms:
  - A sandbox bank with healthy status shows no CTA.
  - A sandbox bank in `needs_reauth` shows "Reconnect" CTA.
  - A sandbox bank with `newAccountsAvailableAt` stamped shows "Update accounts" CTA.

**Acceptance checklist:**
- [ ] `getConnectedBanks` returns the extended shape.
- [ ] `ConnectedBanks.tsx` consumes `recommendedAction` and `reasonCodeToUserCopy`.
- [ ] Settings pages do the same.
- [ ] No regression in healthy-state rendering.
- [ ] `mode: "account_select"` wired through to `react-plaid-link` for `reconnect_for_new_accounts` case.
- [ ] `bun typecheck` passes.
- [ ] CodeRabbit clean.
- [ ] Reviewed by Claude Code.

---

## Task W4.11: Add 6-hour `dispatchItemErrorPersistent` cron with `lastDispatchedAt` gating

**Recommended agent:** Codex (scheduled function; well-specified query filter and dispatch shape).
**Rationale:** One new cron entry in [packages/backend/convex/crons.ts](packages/backend/convex/crons.ts); one new internal action that queries items, filters, dispatches, stamps `lastDispatchedAt`. Cadence 6 hours per contracts §14; dedup via the `lastDispatchedAt` field per spec Section 8.2.
**Linear issue:** `LIN-W4-11`.

**Files:**
- Modify: [packages/backend/convex/crons.ts](packages/backend/convex/crons.ts) (add `crons.interval("plaid-persistent-error-check", { hours: 6 }, ...)`).
- Create: `packages/backend/convex/plaid/persistentError.ts` (the cron's internal action).
- Add (if not already present): component-side internal query that returns items with `status === "error"` across all users. See Step 2 below.

**Scope:**
- Acceptance: Cron runs every 6 hours. Scans items with `status === "error"` AND `lastSyncedAt < now() - 24h` AND `(lastDispatchedAt == null OR lastDispatchedAt < now() - 72h)`. For each matching item, schedules `internal.email.dispatch.dispatchItemErrorPersistent` with payload matching contracts §15 exactly (`{ userId, plaidItemId, institutionName, firstErrorAt, lastSeenErrorAt, errorCode }`), then calls `markItemErrorDispatchedInternal` to stamp `lastDispatchedAt`. Clock-manipulation unit test unblocks the W4.9 `it.skip` and confirms the hour-0 dispatch, hours 6/12/.../66 silent, hour 72 dispatch pattern.

**Steps:**

- [ ] **Step 1: Unblock the W4.9 cron test**

  Edit `packages/backend/convex/__tests__/plaidWebhooks.test.ts`. Change the `describe("dispatchItemErrorPersistent cron (unblock in W4.11)", () => { ... })` block's `it.skip` to `it`. Fill in the implementation with `vi.useFakeTimers`:

  ```ts
  it("follows the lastDispatchedAt-gated 6-hour cadence", async () => {
    vi.useFakeTimers();
    const t0 = Date.now();
    vi.setSystemTime(t0);
    const t = convexTest(schema);
    // Seed an item with status=error, errorAt=t0-48h, errorCode, lastSyncedAt=t0-48h,
    // firstErrorAt=t0-48h, lastDispatchedAt=undefined.
    await t.action(internal.plaid.persistentError.runPersistentErrorCheckInternal, {});
    // Assert one dispatchItemErrorPersistent scheduled.
    // Assert item.lastDispatchedAt is now ~t0.

    for (let hour = 6; hour <= 66; hour += 6) {
      vi.setSystemTime(t0 + hour * 3600_000);
      await t.action(internal.plaid.persistentError.runPersistentErrorCheckInternal, {});
      // Assert no new dispatches.
    }

    vi.setSystemTime(t0 + 72 * 3600_000);
    await t.action(internal.plaid.persistentError.runPersistentErrorCheckInternal, {});
    // Assert one new dispatch.
    vi.useRealTimers();
  });
  ```

- [ ] **Step 2: Add a component internal query for cross-user error items**

  The component's existing `getItemsByUser` is per-user. The cron needs a "items in error across all users" query. Add to `packages/convex-plaid/src/component/private.ts`:

  ```ts
  export const listErrorItemsInternal = internalQuery({
    args: {
      olderThanLastSyncedAt: v.number(),
      dispatchedBefore: v.number(),
    },
    returns: v.array(/* subset of plaidItems needed by cron; see below */),
    handler: async (ctx, args) => {
      // Use by_status index; filter in memory for MVP (cardinality expected to be small).
      const items = await ctx.db
        .query("plaidItems")
        .withIndex("by_status", (q) => q.eq("status", "error"))
        .collect();
      return items
        .filter((i) => (i.lastSyncedAt ?? 0) < args.olderThanLastSyncedAt)
        .filter((i) => (i.lastDispatchedAt ?? 0) < args.dispatchedBefore)
        .map((i) => ({
          plaidItemId: i._id,
          userId: i.userId,
          institutionName: i.institutionName ?? null,
          firstErrorAt: i.firstErrorAt ?? null,
          errorAt: i.errorAt ?? null,
          errorCode: i.errorCode ?? null,
        }));
    },
  });
  ```

  Add to the component's internal API surface (exported via `private.*` path that the host app can `runQuery` against).

- [ ] **Step 3: Write the cron action**

  Create `packages/backend/convex/plaid/persistentError.ts`:

  ```ts
  // packages/backend/convex/plaid/persistentError.ts
  //
  // 6-hour persistent-error cron per contracts §14 row 7 (item-error-persistent).
  // Filters items by status=error, stale sync, and field-level dedup.
  // Dispatches internal.email.dispatch.dispatchItemErrorPersistent per contracts §15.

  import { components, internal } from "../_generated/api";
  import { internalAction } from "../_generated/server";
  import { v } from "convex/values";

  const STALE_SYNC_MS = 24 * 3600 * 1000;    // 24h
  const DISPATCH_COOLDOWN_MS = 72 * 3600 * 1000; // 72h

  export const runPersistentErrorCheckInternal = internalAction({
    args: {},
    returns: v.null(),
    handler: async (ctx) => {
      const now = Date.now();
      const items = await ctx.runQuery(
        components.plaid.private.listErrorItemsInternal,
        {
          olderThanLastSyncedAt: now - STALE_SYNC_MS,
          dispatchedBefore: now - DISPATCH_COOLDOWN_MS,
        },
      );

      for (const item of items) {
        // Skip items missing required payload fields (first-time dispatches must have firstErrorAt stamped).
        if (item.firstErrorAt == null || item.errorAt == null || item.errorCode == null) {
          console.warn(`[plaid/persistentError] skipping ${item.plaidItemId}: missing tracking fields`);
          continue;
        }

        // Schedule dispatch per contracts §15.
        await ctx.scheduler.runAfter(0, internal.email.dispatch.dispatchItemErrorPersistent, {
          userId: item.userId,
          plaidItemId: item.plaidItemId,
          institutionName: item.institutionName ?? "your bank",
          firstErrorAt: item.firstErrorAt,
          lastSeenErrorAt: item.errorAt,
          errorCode: item.errorCode,
        });

        // Stamp lastDispatchedAt so subsequent cron runs within 72h skip this item.
        await ctx.runMutation(
          components.plaid.private.markItemErrorDispatchedInternal,
          { plaidItemId: item.plaidItemId },
        );
      }

      return null;
    },
  });
  ```

  Note: the component's `listErrorItemsInternal` returns `plaidItemId` as `Id<"plaidItems">` inside the component boundary; when passed across to the host app's action, it becomes a string per the component-boundary convention. Host-app passes strings to the dispatch action.

- [ ] **Step 4: Wire the cron with 6-hour cadence**

  Edit [packages/backend/convex/crons.ts](packages/backend/convex/crons.ts). Add:

  ```ts
  crons.interval(
    "plaid-persistent-error-check",
    { hours: 6 },
    internal.plaid.persistentError.runPersistentErrorCheckInternal,
  );
  ```

  `crons.interval` spaces runs 6 h apart from the first trigger after deploy. An alternative is `crons.cron("plaid-persistent-error-check", "0 */6 * * *", ...)` for fixed-clock 6-hour boundaries; pick whichever matches the repo's existing cron style. The existing entries in `crons.ts` use `crons.daily`; confirm the library exposes `interval` before committing and fall back to `crons.cron` otherwise.

- [ ] **Step 5: Rebuild component**

  ```bash
  cd packages/convex-plaid && bun run build && cd -
  ```

- [ ] **Step 6: Run the cron test + full suite**

  ```bash
  cd packages/backend && bun run test
  bun typecheck
  ```

  Expected: the previously-skipped cron test now passes. Full suite green.

- [ ] **Step 7: Commit**

  ```bash
  gt create feat/agentic-home/W4-11-persistent-error-cron -m "feat(plaid): add 6-hour persistent-error cron per contracts"
  ```

**Test:**
- Cron `it` case passes (hour-0 dispatch, hours 6 through 66 silent, hour-72 dispatch).
- `bun typecheck` passes.
- Manual dev smoke: advance clock via test, confirm `[email/dispatch:W7-stub] dispatchItemErrorPersistent` log line with the correct payload shape.

**Acceptance checklist:**
- [ ] Cron entry added with 6-hour cadence (`crons.interval` or `crons.cron` equivalent).
- [ ] `runPersistentErrorCheckInternal` filters on `status === "error"` AND `lastSyncedAt < now - 24h` AND `(lastDispatchedAt == null OR lastDispatchedAt < now - 72h)`.
- [ ] Dispatches `internal.email.dispatch.dispatchItemErrorPersistent` with exact payload per contracts §15.
- [ ] Stamps `lastDispatchedAt` on dispatch via `markItemErrorDispatchedInternal`.
- [ ] W4.9 cron test unblocked and passes.
- [ ] Component `listErrorItemsInternal` query added.
- [ ] Component rebuilt.
- [ ] `bun typecheck` passes.
- [ ] CodeRabbit clean.
- [ ] Reviewed by Claude Code.

---

## Graphite stack submission

Once all 11 PRs are green and cross-reviewed:

```bash
gt submit --stack
```

This pushes every branch and opens all 11 PRs in a Graphite stack. Merge order is bottom-up: W4.1 first, W4.11 last. Each PR must pass CI plus CodeRabbit plus cross-agent review before the next unlocks.

---

## Acceptance checklist (end-to-end)

Once the full stack merges:

- [ ] W0 Section 9 webhook matrix reports 0 NOT FOUND (5 real handlers + 4 log-only stubs close the 7 original NOT FOUNDs).
- [ ] `getPlaidItemHealth` returns the full shape from spec Section 6.3 for every sandbox item.
- [ ] `getPlaidItemHealthByUser` filters out `status === "deleting"` items.
- [ ] `ConnectedBanks.tsx` renders the correct CTA per `recommendedAction` for each of the 17 reason codes (manual QA via Plaid Sandbox state transitions).
- [ ] Update-mode Plaid Link opens with `mode: "account_select"` when the bank has `newAccountsAvailableAt` stamped.
- [ ] Sandbox fire of `ITEM:NEW_ACCOUNTS_AVAILABLE` stamps the field.
- [ ] Sandbox fire of `TRANSACTIONS:DEFAULT_UPDATE` schedules both expected internal actions with the 500 ms offset.
- [ ] Sandbox fire of each stub webhook returns 200 OK and writes to `webhookLogs` without scheduling anything.
- [ ] Regression: Sandbox fire of each existing HANDLED webhook still schedules the same internal actions it did before W4.
- [ ] First Plaid link for a user schedules exactly one `internal.email.dispatch.dispatchWelcomeOnboarding` per contracts §13 (variant `"plaid-linked"`).
- [ ] Second Plaid link for the same user schedules zero welcome dispatches.
- [ ] `ITEM_LOGIN_REQUIRED` webhook schedules `internal.email.dispatch.dispatchReconsentRequired` with `reason: "ITEM_LOGIN_REQUIRED"` per contracts §15.
- [ ] `PENDING_EXPIRATION` webhook schedules `internal.email.dispatch.dispatchReconsentRequired` with `reason: "PENDING_EXPIRATION"` per contracts §15.
- [ ] `firstErrorAt` stamped on first error transition; preserved on subsequent observations.
- [ ] `lastDispatchedAt` stamped on every persistent-error dispatch; cleared on recovery.
- [ ] 6-hour persistent-error cron dispatches `dispatchItemErrorPersistent` with exact payload per contracts §15 (`{ userId, plaidItemId, institutionName, firstErrorAt, lastSeenErrorAt, errorCode }`).
- [ ] Cron cadence is 6 hours (not daily; per contracts §14 row 7).
- [ ] Dispatch pattern for an item in persistent error: hour 0 dispatch, hours 6 through 66 silent, hour 72 dispatch.
- [ ] `completeReauthAction` calls `clearErrorTrackingInternal`; both `firstErrorAt` and `lastDispatchedAt` cleared after recovery.
- [ ] All component and host-app tests pass (`bun run test` in both).
- [ ] `bun typecheck` passes at repo root.
- [ ] `bun build` succeeds for `apps/app` and `apps/web`.
- [ ] CodeRabbit clean on every PR in the stack.
- [ ] Cross-agent review complete on every PR (Codex-authored PRs reviewed by Claude Code, and vice versa).
- [ ] JWE at rest, ES256 JWT verification, circuit breaker behavior unchanged (regression-guard tests prove).
- [ ] All three dispatch action signatures at `internal.email.dispatch.*` match contracts §15 verbatim (W7 replaces bodies later; signatures are the W4 / W7 boundary).
- [ ] Linear issues LIN-W4-01 through LIN-W4-11 marked Done.

---

**End of W4 implementation plan.**
