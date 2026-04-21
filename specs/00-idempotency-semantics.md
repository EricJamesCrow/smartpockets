# M3 Agentic Home: Idempotency Semantics Research Spike

**Role:** Shared research output cited by W5, W6, and W7. Resolves the idempotency-layering question identified as reconciliation M4.

**Status:** OPEN. Blocks W5 `/plan`, W6 `/plan`, W7 `/plan`. Does not block W1, W2, W3, W4.

**Owner:** W7 (per W7 §13 research spike item 2); W5 and W6 consume.

**Milestone:** M3 Agentic Home
**Author:** Claude Opus 4.7 (reconciliation scaffold, Obra Superpowers)
**Date:** 2026-04-20
**Writing convention:** No em-dashes.

> This document is a scaffold. The actual research answers land here as the spike runs. W5, W6, and W7 block their `/plan` emission until Section 4 of this file contains committed answers (not TBD).

---

## 0. Why this spike exists

Three workstreams surfaced idempotency as a blocking unknown:

- **W5** §17 research task 2: "Idempotency patterns in Convex Ents. Idempotency key in mutation args; scheduled dedup; content-hash approach; natural key upsert pattern."
- **W6** §9 assumption 6: "`@convex-dev/workflow` installation: shared responsibility." Workflow retries and step durability have idempotency implications for downstream `emailEvents` inserts.
- **W7** §13 research spike item 2 (`/plan` blocker): "`@convex-dev/resend` idempotency semantics. Confirm: (a) what `idempotencyKey` param does, (b) TTL, (c) whether skipping the component key in favor of our content-hash pre-check introduces any correctness risk."

Separately, the reconciliation review (M4) noted that W5's `agentProposals.contentHash` (W2 §6.4), W6's `notificationEvents.dedupKey` (now merged into `emailEvents.idempotencyKey` per M17), and W7's `emailEvents.idempotencyKey` use related but potentially divergent hash inputs.

A single shared answer prevents divergent implementations. This file is the canonical output.

---

## 1. Questions the spike answers

### 1.1 `@convex-dev/resend` component idempotency

1. What does the `idempotencyKey` argument on `sendEmail` actually do? Is it stored in a component-owned table keyed by (user, key) or (email, key)?
2. What is the TTL of the idempotency record? 24h, 7d, permanent?
3. What does the component do on a duplicate key? Silent skip, explicit skip return, or error?
4. Does the idempotency scope across `testMode: true` vs `testMode: false`? Across environments?
5. Does it interact with the retry logic? If Resend returns a transient 5xx, does the component's retry check the key or just resend?

### 1.2 `@convex-dev/workflow` idempotency

1. If the workflow engine restarts, does it retry a completed step or skip? Are step outputs persisted?
2. If `workflow.start(name, args)` is called twice with the same args, does it dedupe, or does it spawn two instances?
3. Can a workflow be made idempotent via a user-supplied key (similar to Resend's `idempotencyKey`)?
4. What are the visibility guarantees? If step N completes and step N+1 fails, does the retry see step N's output?

### 1.3 Convex mutation idempotency

1. In a `mutation`, if the same arg tuple lands twice (network retry at the client), what is the standard dedup primitive? Is there a component for this, or must it be hand-rolled via natural-key upsert?
2. Can a `mutation` read its own recent writes within the same transaction (for CAS-style idempotency)?
3. Scheduled mutations: if the scheduler fires a job twice (at-least-once delivery), is there a dedup layer?

### 1.4 Application-layer policy

1. Should W5's `agentProposals.contentHash`, W7's `emailEvents.idempotencyKey`, and any other content-hash surface use the **same** hash function and canonical input serialization? Or different functions for different scopes?
2. For `emailEvents.idempotencyKey`, should W7 pass the same hash to the `@convex-dev/resend` component's `idempotencyKey` parameter, or let the two layers run independently?
3. For workflows that dispatch emails: does the workflow instance ID substitute for the content hash, or do both coexist?

---

## 2. Proposed methodology

1. **Read `@convex-dev/resend` source.** Published under `github.com/convex-dev/resend`. Focus on `resend.ts`, any `idempotency.ts`, and the component schema.
2. **Read `@convex-dev/workflow` source.** Published under `github.com/convex-dev/workflow`. Focus on the workflow runner, step runner, and persisted-state schema.
3. **Run a dev smoke test.** On the SmartPockets dev Convex deployment:
   - Call `components.resend.sendEmail({ idempotencyKey: "test-1", ... })` twice in quick succession; observe the second call's return.
   - Call it with a 24h gap (or simulate by manipulating the component table's `createdAt`); observe whether the dedup still fires.
   - Start a workflow, force a restart mid-step, observe resume behavior.
4. **Cross-reference Convex Discord** for Eric's prior idempotency patterns (if any) and community-recommended natural-key upsert templates.

Output lands in Section 4 below.

---

## 3. Decision framework

Once the research produces facts, pick one of the following layering strategies for `emailEvents`:

### 3.1 Strategy A: Delegate to `@convex-dev/resend` only

- W7's `sendNotification` helper computes a content hash and passes it to the component as `idempotencyKey`.
- No application-layer `by_idempotencyKey` pre-check.
- Component owns dedup; `emailEvents` rows are written only on actual send.

**Pros:** Simpler; one layer.
**Cons:** Component TTL may not match SmartPockets' desired TTL. If the component dedups only on `{account, key}` but SmartPockets wants per-user semantics, this strategy fails.
**Fit:** If research shows the component TTL is >= 24h and the scope is per-account (our account), W7 can rely on it.

### 3.2 Strategy B: Two-layer (application-first)

- W7's `sendNotification` helper pre-checks `emailEvents` by `idempotencyKey`; returns `{ skipped: "duplicate" }` without rendering or network call if hit.
- Application layer writes `emailEvents` with `status: "pending"` before calling `@convex-dev/resend`.
- Component's `idempotencyKey` param either reused (defensive) or omitted.

**Pros:** Full control; skip render+network on application-layer duplicates.
**Cons:** Two layers; must reason about the interaction when they disagree.
**Fit:** If research shows component dedup is unreliable or scope is wrong, this is the path.

### 3.3 Strategy C: Idempotency-free at send; dedup at trigger

- W6 / W4 insert `emailEvents` rows with `status: "pending"` and a unique `idempotencyKey`; the unique index on `by_idempotencyKey` makes the insert a no-op on duplicates.
- `sendNotification` pulls pending rows by ID; never passes a key to the component.
- Component retries sends freely; the event log is the source of truth for "did we send this."

**Pros:** Moves dedup to the cheapest surface (index collision).
**Cons:** Workflow step that actually dispatches must be idempotent itself (what if the workflow step retries after a partial send?).
**Fit:** If research shows `@convex-dev/workflow` step retries are guaranteed idempotent (step output persisted) or reversible, Strategy C is the tightest.

### 3.4 `agentProposals.contentHash` (W5's concern, same spike)

Two sub-questions:

1. Do W5's idempotency needs (same-proposal-in-same-thread dedup per W2 §6.4) warrant the same hash function as W7's `emailEvents.idempotencyKey`?
2. If yes, share a utility in `packages/backend/convex/agent/hashing.ts` (or `notifications/hashing.ts`). If no, each workstream owns its own.

Recommendation (pending spike): share. The canonical input is always `(userId, scopeName, sortedKeys, dateBucket?)` and the hash is SHA-256 of stable-stringified input. Sharing keeps the hash-collision surface small.

---

## 4. Research answers

> Committed 2026-04-20 by W7 spike. W5, W6, W7 plans unblocked.
> Source citations inline; primary sources are the installed `@convex-dev/resend` 0.2.3 source in `node_modules/@convex-dev/resend/src/` and the `@convex-dev/workflow` docs fetched via Context7.

### 4.1 `@convex-dev/resend` facts (v0.2.3 installed)

- **Public `sendEmail` does NOT accept a user-supplied `idempotencyKey`.** Signature is `(ctx, { from, to, cc?, bcc?, subject?, html?, text?, template?, replyTo?, headers? })` or positional equivalents. [client/index.ts:170-196](../node_modules/@convex-dev/resend/src/client/index.ts:170). Two calls with identical args produce two separate `emails` rows in the component schema and thus two separate sends.
- **Internal `Idempotency-Key` header IS sent to Resend's REST API**, set to the first Convex `emails._id` in each batch at [component/lib.ts:548](../node_modules/@convex-dev/resend/src/component/lib.ts:548). This is batch-scoped and protects the component's own workpool retries (if the action retries, Resend's API dedupes the batch). It is NOT a user dedup surface.
- **Retention of the component's `emails` docs:** finalized emails cleaned after 7 days (`FINALIZED_EMAIL_RETENTION_MS`, [lib.ts:38](../node_modules/@convex-dev/resend/src/component/lib.ts:38)); abandoned-unfinalized cleaned after 30 days (`ABANDONED_EMAIL_RETENTION_MS`, [lib.ts:40](../node_modules/@convex-dev/resend/src/component/lib.ts:40)).
- **Duplicate behavior on `sendEmail`:** none. Always inserts. The "duplicate prevention" claim in the JSDoc ([client/index.ts:241](../node_modules/@convex-dev/resend/src/client/index.ts:241)) refers to component-internal retry safety, not application-level dedup.
- **`testMode` scoping:** if `testMode: true` on the component config, calls to non-`@resend.dev` addresses throw at mutation time ([lib.ts:147-155](../node_modules/@convex-dev/resend/src/component/lib.ts:147)). SmartPockets uses `testMode: false`; idempotency behavior is identical either way.
- **Retry semantics:** the workpool's outer retry (`maxAttempts: retryAttempts`, default 5, `initialBackoffMs: 30000`, `base: 2`) is how the component handles transient Resend API failures. `PERMANENT_ERROR_CODES` ([lib.ts:59-66](../node_modules/@convex-dev/resend/src/component/lib.ts:59)) bypass retry and mark the email failed. On retry, the same `Idempotency-Key` (first `emails._id` in the batch) is re-sent to Resend, so Resend's own API dedupes.
- **Webhook handler:** `handleResendEventWebhook` uses `svix` to verify signatures ([client/index.ts:452-478](../node_modules/@convex-dev/resend/src/client/index.ts:452)). Host app mounts this on an HTTP route; verification requires `RESEND_WEBHOOK_SECRET` to be set or the handler throws. The handler updates the internal `emails` doc, writes to a component-owned `deliveryEvents` table, and invokes the user's `onEmailEvent` mutation via the callback workpool.
- **Bounce classification:** the component's `vEmailEvent` validator exposes `event.data.bounce` on `email.bounced` events; message text is at `event.data.bounce?.message` ([lib.ts:837](../node_modules/@convex-dev/resend/src/component/lib.ts:837)). Resend distinguishes hard vs soft bounces in the event payload itself; W7 reads `event.data.bounce_type` (or equivalent field; confirm in the W7 plan's research task 3 against the current `vEmailEvent` validator's exact shape).

**Net:** `@convex-dev/resend` offers zero user-exposed idempotency. Application-layer dedup is mandatory; Strategy A ("delegate to the component") is not possible.

### 4.2 `@convex-dev/workflow` facts

Source: `@convex-dev/workflow` README and llms.txt via Context7 (`/get-convex/workflow`), 2026-04-20.

- **`workflow.start(ctx, ref, args)` returns a new `WorkflowId` every call.** Calling it twice with identical args produces two independent workflow instances. No built-in dedup on args.
- **No user-supplied workflow-start key.** The `start` API signature is positional `(ctx, workflowRef, args, { onComplete?, context?, startAsync? })`; no `idempotencyKey` or `workflowKey` field. Dedup must happen outside (in the caller).
- **Step output persistence:** each step (`step.runQuery`, `step.runMutation`, `step.runAction`) is journaled. On workflow resume after a server restart, completed steps are replayed from the journal (output read, not re-executed).
- **Mutation step semantics:** "exactly-once execution for mutations" per the Workflow docs. A `step.runMutation` call that has already succeeded in the journal is not re-run on resume; the journaled output returns.
- **Action step semantics:** at-least-once. Actions can retry (`{ retry: true }` or custom `{ maxAttempts, initialBackoffMs, base }`) and may run multiple times across transient failures. The action body must be idempotent or tolerate re-runs.
- **`runAfter` / `runAt`:** per-step scheduling options on `step.runMutation` / `step.runAction`; these control WHEN a step runs, not dedup.
- **`inline: true`:** runs a query or mutation step within the workflow's Convex transaction (useful for atomic reads with workflow bookkeeping).
- **`onComplete` callback:** fires once per workflow instance when it reaches a terminal state (`success | failed | canceled`).
- **Cancellation:** `workflow.cancel(ctx, workflowId)` halts execution. Already-completed steps do not reverse.

**Implication for `sendAnomalyAlert` wait-step** (W7 §6.4): the 15-minute `step.runMutation(..., { runAfter: 15 * 60 * 1000 })` wait is journaled. If the workflow engine restarts during the wait, the wait resumes correctly (the step is scheduled in Convex's scheduler, which is at-least-once; combined with Workflow's journal, the effect is exactly-once for the downstream mutation).

### 4.3 Convex mutation idempotency primitives

Source: Convex Ents docs via Context7 (`/get-convex/convex-ents`), 2026-04-20.

- **Unique field constraint:** `.field("name", v.string(), { unique: true })` on a `defineEnt(...)` enforces uniqueness AND creates an index. Insert with a duplicate value throws at commit time.
  ```ts
  users: defineEnt({}).field("email", v.string(), { unique: true })
  ```
- **Dedup pattern:** query first via `ctx.table("X").get("uniqueField", key)` (returns `null` if not found); insert only if null. Or insert-and-catch: `try { await ctx.table("X").insert({...}) } catch (err) { if (isUniqueConstraintError(err)) return existing; throw err; }`. Get-then-insert is cleaner and lets the handler return the existing ID for tracing.
- **Optimistic concurrency control (OCC):** mutations retry automatically at the system level on OCC conflicts. This is orthogonal to application-level idempotency.
- **Own-write read within a transaction:** yes, a mutation can insert then query and see the insert. The transaction is atomic.
- **Scheduled mutation semantics:** `ctx.scheduler.runAfter` is at-least-once. The scheduled function may run multiple times under edge conditions. Function bodies that schedule work must be idempotent or deduped externally.
- **`@convex-dev/workflow` wraps mutation steps in exactly-once semantics** (§4.2), so any mutation invoked as a workflow step is deduplicated by the workflow journal; mutations called from a bare cron are not.

### 4.4 Committed layering strategy

**Strategy: C-prime ("producer-insert dedup via unique index").**

Modified Strategy C from §3.3. Reasons C beats B:

1. `@convex-dev/resend` provides no user-keyed dedup (§4.1); Strategy A is off the table.
2. `workflow.start` has no dedup key (§4.2); calling it twice runs twice. Dedup must happen before `workflow.start`.
3. The cheapest, most atomic dedup surface in Convex Ents is the unique-field constraint at insert time (§4.3). It requires zero additional code: the insert IS the dedup.
4. Separating "dedup check" from "insert" (Strategy B) creates a race window (two concurrent calls could both pass the check). The unique constraint closes this window at the database layer.

**The flow:**

```
W6 / W4 producer (cron or webhook handler)
        ↓
1. Compute idempotencyKey = sha256(stableStringify({ userId, templateKey, cadence?, sortedPayloadIds, dateBucket? }))
        ↓
2. const existing = await ctx.table("emailEvents").get("idempotencyKey", key);
   if (existing) return { skipped: "duplicate", emailEventId: existing._id };
        ↓
3. Insert emailEvents row { idempotencyKey, userId, templateKey, cadence?, payloadJson, status: "pending", createdAt, attemptCount: 0 }.
   Insert atomically enforces uniqueness; concurrent duplicate insert throws.
        ↓
4. workflow.start(ctx, internal.email.workflows.send<Template>, { emailEventId })
        ↓
   Workflow steps:
   a. step.runQuery: load emailEvents row, resolve user email from Clerk.
   b. step.runMutation: check notificationPreferences (tier-aware) and emailSuppressions.
      - On skip: patch emailEvents.status = "skipped_pref" | "skipped_suppression"; return early.
   c. step.runAction: render React Email template.
   d. step.runMutation: patch emailEvents.status = "running", attemptCount++, workflowId.
   e. step.runMutation(inline=false): call @convex-dev/resend components.resend.lib.sendEmail (returns emails._id).
   f. step.runMutation: patch emailEvents.status = "sent", resendEmailId.
        ↓
5. Webhook events from Resend fire handleEmailEvent (W7), which:
   - Inserts an emailEvents row with source: "webhook-delivered" | "webhook-bounced" | etc., linked by resendEmailId.
   - Upserts emailSuppressions on hard bounce / complaint.
```

**Hash function shared across W5 and W7.** Single utility module at:

```
packages/backend/convex/notifications/hashing.ts

export function idempotencyKey(input: {
  userId: string;
  scope: string;          // templateKey for W7; toolName or proposal context for W5
  cadence?: number;
  ids?: string[];         // sorted before hashing
  dateBucket?: string;    // YYYY-MM-DD (UTC) for daily, YYYY-MM-DD-HHMM for 15-min windows
}): string {
  const canonical = JSON.stringify({
    u: input.userId,
    s: input.scope,
    c: input.cadence ?? null,
    i: input.ids ? [...input.ids].sort() : null,
    d: input.dateBucket ?? null,
  });
  return sha256Hex(canonical);
}
```

W5 wraps this for `agentProposals.contentHash`:
```
contentHash = idempotencyKey({ userId, scope: `propose_${toolName}`, ids: affectedIdsSorted });
```
W7 wraps for each template's per-cadence or per-event scope (see §4.4 TTL table).

**TTL per scope** (retention policy for the `emailEvents` table, separate from the `@convex-dev/resend` component's internal 7-day retention):

| Scope | TTL | Reason |
|---|---|---|
| `agentProposals.contentHash` (W5) | Until the proposal transitions to `executed` or `cancelled`, then kept for 30 days for audit alongside `auditLog` | Proposal dedup only meaningful within the active thread window |
| `emailEvents.idempotencyKey` per cadence (`promo-warning`, `statement-closing`, `weekly-digest`, `subscription-detected`) | 90 days | Covers a full quarter's re-send protection; daily `dateBucket` ensures no false hits after the bucket boundary |
| `emailEvents.idempotencyKey` per event (`anomaly-alert`) | 90 days | Per-anomaly `ids: [anomalyId]` is naturally unique per event |
| `emailEvents.idempotencyKey` per item (`reconsent-required`, `item-error-persistent`) | 90 days | `{plaidItemId, dateBucket: YYYY-MM-DD}` protects against double-send within a day |
| `emailEvents.idempotencyKey` for `welcome-onboarding` | 365 days | `{userId, scope: "welcome-class"}` with no date bucket; one welcome ever |
| `emailEvents.source: "dev-capture"` | 7 days | Dev-only; prune aggressively |
| `emailEvents.source: "webhook-*"` | 90 days | Operational analytics; prune thereafter |

Retention is enforced by a daily W7-owned cron (`cleanupOldEmailEvents`) that deletes rows by `createdAt` window per `source` and `templateKey`.

**`@convex-dev/workflow` dedup surface.** None needed. `workflow.start` is only ever called after the producer's `emailEvents` insert succeeds (=new row =new workflow). The workflow ID gets patched onto the row as `workflowId` (M17 field) for observability.

### 4.5 Key deltas vs the original §3 strategies

- Strategy A eliminated (§4.1).
- Strategy B eliminated: the "pre-check then insert" race window is real and avoidable with the unique constraint.
- Strategy C adopted with one modification: insert is the dedup primitive, not a unique-index collision fallback. `get("idempotencyKey", key)` first (fast path for duplicate detection with clean return); insert otherwise.
- Shared hash utility confirmed (`packages/backend/convex/notifications/hashing.ts`).
- `workflow.start` never dedupes at its own surface; dedup is upstream.

### 4.6 Open corollaries for downstream plans

- **W5 amendment:** `createProposal` wrapper uses the shared `idempotencyKey` utility; sets `agentProposals.contentHash` via the same function. W5's plan cites this doc's §4.4.
- **W6 amendment:** each scheduled cron (promo countdowns, statement reminder scan, anomaly scan, subscription catch-up, weekly digest assembly) computes the key via the shared utility before calling the matching `dispatch*`. The `dispatch*` action itself handles the `emailEvents` insert-or-skip + `workflow.start` sequence (the action IS the producer here, not the cron). W6 cron just calls `dispatch*` with the typed payload.
- **W7 plan:** the `sendNotification` middleware helper collapses into the dispatch action body (insert `emailEvents`, start workflow). The workflow body is the source of truth for preference/suppression/render/send. The helper is now a few lines, not a large middleware.
- **W4 amendment:** `exchangePublicToken` calls `dispatchWelcomeOnboarding` with `variant: "plaid-linked"`. W4 also calls `dispatchReconsentRequired` from Plaid webhook handlers and `dispatchItemErrorPersistent` from its 24h-sustained-error cron. None of these need their own dedup; the dispatch action's insert path handles it.

---

## 5. Dependent plan blockers

Until Section 4 is committed:

| Workstream | Blocked item |
|---|---|
| W5 | `/plan` emission; specifically the `createProposal` wrapper's `contentHash` input spec and `executeWriteTool`'s retry/idempotency guard |
| W6 | `/plan` emission; specifically `notificationEvents` (now `emailEvents`) insert pattern and workflow start call-site |
| W7 | `/plan` emission; specifically `sendNotification` helper design and the middleware flow in W7 §3.2 |

Once committed:

- W5 updates its brainstorm amendment appendix to cite the committed strategy and the shared hash utility path.
- W6 updates its per-event insert call-site to match (Strategy B or C probably just uses the unique index on `idempotencyKey`).
- W7 updates its `sendNotification` helper design to match (Strategy A skips step 5 of W7 §3.2; Strategy B keeps it; Strategy C removes the application layer and relies on event-row writes).

---

## 6. Spike scheduling

Recommended order:

1. **Read both component source trees.** 1 to 2 hours.
2. **Dev smoke test (Resend).** 30 min.
3. **Dev smoke test (workflow).** 30 min.
4. **Commit answers to Section 4.** 15 min.
5. **Amend W5, W6, W7 brainstorms** with citations to this file. 15 min each.

Total: half a day. Recommended primary agent: Claude Code (architectural research, cross-cutting decision). Execute before the `/plan` phase begins for W5, W6, or W7.

---

**End of idempotency spike scaffold. Section 4 completes the document.**
