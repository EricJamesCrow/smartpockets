# W7: Email System Extension

**Milestone:** M3 Agentic Home
**Workstream:** W7 (Track F per master brief Section 11)
**Phase:** 2 (`/plan` authoritative spec)
**Author:** Claude Opus 4.7 (Obra Superpowers `/plan` phase)
**Date:** 2026-04-20
**Brainstorm input:** [specs/W7-email.brainstorm.md](W7-email.brainstorm.md)
**Research input:** [specs/W7-email.research.md](W7-email.research.md)
**Shared research:** [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) §4 (W7 is spike owner; this spec cites rather than duplicates)
**Cross-workstream contract reference:** [specs/00-contracts.md](00-contracts.md) (authoritative; if this spec disagrees, contracts wins). W7 owns four contract rows per §0: `notificationPreferences`, `emailEvents`, `emailSuppressions`, dispatch action signatures. W6 consumes for triggers; W4 consumes for welcome / reconsent / item-error dispatch calls.
**Writing convention:** No em-dashes (repo rule).

---

## 1. Goal

Extend the existing `@convex-dev/resend` 0.2.3 + React Email foundation with eight new MVP templates, a typed dispatch API for W4 and W6 to call against, RFC 8058 one-click unsubscribe, a preferences page, a unified `emailEvents` log with suppression handling, and the production rollout steps (env vars, DNS, logo hosting, webhook route, Inngest cleanup). Every new template is triggered by scheduled functions or webhook handlers; no client-initiated sends. Ship on top of the existing wiring at [packages/backend/convex/email/{resend,send,templates,clerk,events}.ts](../packages/backend/convex/email/); do not replace it.

---

## 2. Non-goals (preserved, must not regress)

- 22 existing React Email templates in [packages/email/emails/](../packages/email/emails/).
- 4 Clerk-triggered templates wired through `email/clerk.ts` (`verification`, `password-reset`, `magic-link`, `invite`).
- `@convex-dev/resend` 0.2.3 wiring at [packages/backend/convex/email/resend.ts](../packages/backend/convex/email/resend.ts) with `testMode: false`.
- Three existing internal send actions (`sendTemplatedEmail`, `sendHtmlEmail`, `sendTextEmail`) at [packages/backend/convex/email/send.ts](../packages/backend/convex/email/send.ts). These stay; W7 adds dispatch actions alongside, not replacing.
- Brand tokens and theme in [packages/email/emails/_theme/](../packages/email/emails/_theme/).
- `bun typecheck` passes across all workspaces.
- `EmailBrandConfig` shape at [packages/email/emails/_config/email-config.ts](../packages/email/emails/_config/email-config.ts) (fields added, never removed).

---

## 3. Decisions (locked during brainstorm and reconciliation)

### 3.1 Template count: 8 (was 7)

Reconciliation M18 added `subscription-detected` as the 8th MVP template. Canonical list in [specs/00-contracts.md](00-contracts.md) §14 and brainstorm §17.1.

### 3.2 Welcome is one template with compound trigger

Brainstorm Flag 1. Single template file `welcome-onboarding.tsx`, `variant: "signup-only" | "plaid-linked"` prop, 24h class-level dedup via idempotency key `{userId, scope: "welcome-class"}` (no date bucket; lifetime dedup).

### 3.3 W4 owns reconsent + item-error dispatch; W6 owns digest/promo/statement/anomaly/subscription

Brainstorm Flag 2 + contracts §13. W7 publishes typed dispatch actions; W4 and W6 call them. W7 owns only: weekly-digest Sunday cron, welcome-onboarding 48h signup-only fallback cron, daily `cleanupOldEmailEvents` cron, inbound `/resend-webhook` route, `/email/unsubscribe` route.

### 3.4 Architecture: Approach 3 (typed wrappers over producer-insert pattern)

Brainstorm §3.1 selected Approach 3. Spike §4.4 refined: the dispatch action IS the producer (not a separate middleware helper). Shape: (1) compute idempotencyKey via shared util, (2) `get("idempotencyKey", key)` to short-circuit on duplicate, (3) insert `emailEvents` row with `status: "pending"`, (4) `workflow.start` for the per-template workflow.

### 3.5 Idempotency: Strategy C-prime with unique-field dedup

Spike §4.4. `emailEvents.idempotencyKey` is `{ unique: true }` on the Ents field definition. Insert race closed by the database-level constraint. `workflow.start` only fires on successful (new) insert. Shared hash utility at [packages/backend/convex/notifications/hashing.ts](../packages/backend/convex/notifications/hashing.ts).

### 3.6 Dev-mode three-state env gating

Brainstorm §6.1. `EMAIL_DEV_LIVE` unset = log to `emailEvents` with `source: "dev-capture"`, no Resend call. `EMAIL_DEV_LIVE=true` = live send. `EMAIL_DEV_OVERRIDE_TO=<addr>` additionally rewrites `to`. Prod: both unset.

### 3.7 Suppression tier split

Brainstorm §7. Essential (welcome-onboarding, reconsent-required, item-error-persistent, Clerk auth flows): bypass `notificationPreferences`; bypass complaint suppression; honor hard-bounce suppression. Non-essential (weekly-digest, promo-warning, statement-closing, anomaly-alert, subscription-detected): honor all.

### 3.8 Clerk email resolution: Option A (mirror on users table)

Research §3.4. Add `email: v.optional(v.string())` to `users` schema. Populate via Clerk `user.created` and `user.updated` webhooks. Helper `internal.email.internal.getUserEmail` is the single read surface inside `internalAction`.

### 3.9 Unsubscribe tokens: HMAC-SHA256, 30-day TTL, single key

Brainstorm Flag 4. Format: `base64url(JSON.stringify({ u: userId, t: templateKey, ts }))` + `.` + `base64url(hmacSha256(payload, key))`. `/email/unsubscribe` POST idempotent per RFC 8058; GET fallback renders a confirm page.

### 3.10 Logo hosting: apps/web static

Research §6.2. `apps/web/public/email-assets/logo.png` served at `https://www.smartpockets.com/email-assets/logo.png`. `email-config.ts` `logoUrl` updated in the same PR.

---

## 4. Template catalog (authoritative)

Eight MVP templates. All live at `packages/email/emails/{name}.tsx`. Each has a draft at `packages/email/emails/drafts/{name}.draft.md` (W7 plan tasks W7.3 and W7.4).

| # | Template key | Tier | Trigger owner | Dispatch action | Idempotency key inputs |
|---|---|---|---|---|---|
| 1 | `welcome-onboarding` | essential | W4 (plaid-linked); W7 (signup-only cron) | `dispatchWelcomeOnboarding` | `{userId, scope: "welcome-class"}` |
| 2 | `weekly-digest` | non-essential | W7 Sunday 09:00 UTC cron | `dispatchWeeklyDigest` | `{userId, scope: "weekly-digest", dateBucket: YYYY-MM-DD}` |
| 3 | `promo-warning` | non-essential | W6 promo countdown cron | `dispatchPromoWarning` | `{userId, scope: "promo-warning", cadence, ids: sortedPromoIds, dateBucket: YYYY-MM-DD}` |
| 4 | `statement-closing` | non-essential | W6 statement reminder cron | `dispatchStatementReminder` | `{userId, scope: "statement-closing", cadence, ids: sortedCardIds, dateBucket: YYYY-MM-DD}` |
| 5 | `anomaly-alert` | non-essential | W6 per-anomaly call (W7 workflow coalesces 15 min) | `dispatchAnomalyAlert` | `{userId, scope: "anomaly-alert", ids: [anomalyId]}` |
| 6 | `reconsent-required` | essential | W4 Plaid webhook handler | `dispatchReconsentRequired` | `{userId, scope: "reconsent-required", ids: [plaidItemId], dateBucket: YYYY-MM-DD}` |
| 7 | `item-error-persistent` | essential | W4 24h sustained-error cron | `dispatchItemErrorPersistent` | `{userId, scope: "item-error-persistent", ids: [plaidItemId], dateBucket: YYYY-MM-DD}` |
| 8 | `subscription-detected` | non-essential | W6 subscription catch-up scan | `dispatchSubscriptionDigest` | `{userId, scope: "subscription-detected", ids: sortedSubIds, dateBucket: YYYY-MM-DD}` |

---

## 5. Schema additions

All in [packages/backend/convex/schema.ts](../packages/backend/convex/schema.ts). All additive. Edges wired to existing `users` ent.

### 5.1 `users.email` (new field; research §3.4)

```ts
users: defineEnt({
  name: v.optional(v.string()),
  connectedAccounts: v.array(v.any()),
  email: v.optional(v.string()),   // NEW; mirrored from Clerk
})
  .field("externalId", v.string(), { unique: true })
  // ... existing edges preserved
```

Populate on `user.created` and `user.updated` Clerk webhook. Backfill cron one-time on first deploy.

### 5.2 `notificationPreferences`

```ts
notificationPreferences: defineEnt({
  weeklyDigestEnabled: v.boolean(),
  promoWarningEnabled: v.boolean(),
  statementReminderEnabled: v.boolean(),
  anomalyAlertEnabled: v.boolean(),
  subscriptionDetectedEnabled: v.boolean(),
  welcomeOnboardingEnabled: v.boolean(),   // cosmetic; essential-tier override applies
  masterUnsubscribed: v.boolean(),
  updatedAt: v.number(),
})
  .edge("user"),  // one-to-one via edge uniqueness
```

Lazy-created on first read with all booleans `true` and `masterUnsubscribed: false`.

### 5.3 `emailEvents`

```ts
emailEvents: defineEnt({
  email: v.string(),                       // lowercased recipient
  templateKey: v.string(),
  cadence: v.optional(v.number()),
  source: v.union(
    v.literal("send"),
    v.literal("dev-capture"),
    v.literal("webhook-sent"),
    v.literal("webhook-delivered"),
    v.literal("webhook-bounced"),
    v.literal("webhook-complained"),
    v.literal("webhook-opened"),
    v.literal("webhook-clicked"),
    v.literal("webhook-delayed"),
    v.literal("webhook-failed"),
  ),
  resendEmailId: v.optional(v.string()),
  workflowId: v.optional(v.string()),
  payloadJson: v.any(),
  errorMessage: v.optional(v.string()),
  status: v.union(
    v.literal("pending"),
    v.literal("running"),
    v.literal("sent"),
    v.literal("skipped_pref"),
    v.literal("skipped_dedup"),   // only written by post-hoc audit; insert itself dedups
    v.literal("skipped_suppression"),
    v.literal("failed"),
  ),
  attemptCount: v.number(),
  createdAt: v.number(),
  processedAt: v.optional(v.number()),
})
  .field("idempotencyKey", v.string(), { unique: true })
  .edge("user", { optional: true })        // nullable for pre-user or orphan webhook rows
  .index("by_user_created", ["userId", "createdAt"])
  .index("by_resendEmailId", ["resendEmailId"])
  .index("by_template_created", ["templateKey", "createdAt"])
  .index("by_status_created", ["status", "createdAt"])
  .index("by_workflowId", ["workflowId"]),
```

**`idempotencyKey` is a unique Ents field**, not just an index. The constraint is enforced atomically on insert. This is the spike §4.4 commitment.

### 5.4 `emailSuppressions`

```ts
emailSuppressions: defineEnt({
  reason: v.union(v.literal("hard_bounce"), v.literal("complaint")),
  firstEventAt: v.number(),
  lastEventAt: v.number(),
  eventCount: v.number(),
})
  .field("email", v.string(), { unique: true })
  .edge("user", { optional: true })
  .index("by_user", ["userId"]),
```

Keyed by email, not userId, so Clerk email-change events do not reset suppression.

---

## 6. Dispatch API contract (W4 and W6 consume)

All at [packages/backend/convex/email/dispatch.ts](../packages/backend/convex/email/dispatch.ts). All `internalAction` (Node runtime for `@react-email/render`). Zod-validated at the action boundary.

Canonical signatures from [specs/00-contracts.md](00-contracts.md) §15. Reproduced here for completeness:

```ts
internal.email.dispatch.dispatchWelcomeOnboarding({
  userId: Id<"users">,
  variant: "signup-only" | "plaid-linked",
  firstLinkedInstitutionName?: string,
});

internal.email.dispatch.dispatchWeeklyDigest({
  userId: Id<"users">,
  weekStart: number,                  // epoch ms, Sunday 00:00 UTC
  topSpendByCategory: Array<{ category: string, amountCents: number, changeVsPriorWeekPct: number }>,
  upcomingStatements: Array<{ cardName: string, closingDate: string, projectedBalanceCents: number }>,
  activeAnomalies: Array<{ anomalyId: string, merchantName: string, amountCents: number }>,
  expiringPromos: Array<{ promoId: string, cardName: string, expirationDate: string, balanceCents: number }>,
  expiringTrials: Array<{ merchantName: string, renewsOn: string }>,
});

internal.email.dispatch.dispatchPromoWarning({
  userId: Id<"users">,
  cadence: 30 | 14 | 7 | 1,
  promos: Array<{ promoId: string, cardName: string, expirationDate: string, balanceCents: number, daysRemaining: number }>,
});

internal.email.dispatch.dispatchStatementReminder({
  userId: Id<"users">,
  cadence: 3 | 1,
  statements: Array<{ cardId: string, cardName: string, closingDate: string, projectedBalanceCents: number, minimumDueCents: number, dueDate: string }>,
});

internal.email.dispatch.dispatchAnomalyAlert({
  userId: Id<"users">,
  anomalyId: Id<"anomalies">,
});
// NB: single anomaly; workflow coalesces sibling pending rows within 15-min window.

internal.email.dispatch.dispatchReconsentRequired({
  userId: Id<"users">,
  plaidItemId: string,
  institutionName: string,
  reason: "ITEM_LOGIN_REQUIRED" | "PENDING_EXPIRATION",
});

internal.email.dispatch.dispatchItemErrorPersistent({
  userId: Id<"users">,
  plaidItemId: string,
  institutionName: string,
  firstErrorAt: number,
  lastSeenErrorAt: number,
  errorCode: string,
});

internal.email.dispatch.dispatchSubscriptionDigest({
  userId: Id<"users">,
  batchDate: string,                  // YYYY-MM-DD
  detected: Array<{
    subscriptionId: Id<"detectedSubscriptions">,
    normalizedMerchant: string,
    averageAmountCents: number,
    frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "annual",
  }>,
});
```

Each dispatch action body:

```ts
export const dispatch<Template> = internalAction({
  args: <TypedPayload>,
  returns: v.object({
    status: v.union(v.literal("queued"), v.literal("skipped_duplicate")),
    emailEventId: v.id("emailEvents"),
  }),
  handler: async (ctx, args) => {
    const idempotencyKey = computeIdempotencyKey(args);
    const existing = await ctx.runQuery(internal.email.queries.getByIdempotencyKey, { idempotencyKey });
    if (existing) return { status: "skipped_duplicate", emailEventId: existing._id };

    const email = await ctx.runQuery(internal.email.internal.getUserEmail, { userId: args.userId });

    const emailEventId = await ctx.runMutation(internal.email.mutations.insertPending, {
      idempotencyKey,
      userId: args.userId,
      email,
      templateKey: "<templateKey>",
      cadence: args.cadence,
      payloadJson: args,
    });

    const workflowId = await workflow.start(
      ctx,
      internal.email.workflows.send<Template>,
      { emailEventId },
    );

    await ctx.runMutation(internal.email.mutations.patchWorkflowId, { emailEventId, workflowId });

    return { status: "queued", emailEventId };
  },
});
```

---

## 7. Workflow bodies (8 workflows)

Each template gets one workflow at [packages/backend/convex/email/workflows/send<Template>.ts](../packages/backend/convex/email/workflows/). Pattern (see `sendPromoWarning.ts` exemplar):

```ts
export const sendPromoWarning = workflow.define({
  args: { emailEventId: v.id("emailEvents") },
  returns: v.null(),
  handler: async (step, { emailEventId }): Promise<void> => {
    // 1. Load the pending row.
    const row = await step.runQuery(internal.email.queries.getEventInternal, { emailEventId }, { inline: true });
    if (!row || row.status !== "pending") return;

    // 2. Preference + suppression check (tier-aware).
    const preCheck = await step.runMutation(internal.email.middleware.preCheck, {
      emailEventId,
      tier: "non-essential",
      preferenceKey: "promoWarningEnabled",
    }, { inline: true });
    if (preCheck.skipped) return;

    // 3. Render the HTML.
    const html = await step.runAction(internal.email.templates.renderTemplate, {
      template: "promo-warning",
      props: { ...row.payloadJson, theme: "light" },
    });

    // 4. Patch status to running.
    await step.runMutation(internal.email.mutations.patchRunning, { emailEventId, attemptCount: 1 }, { inline: true });

    // 5. Build List-Unsubscribe headers.
    const headers = await step.runMutation(internal.email.middleware.buildUnsubscribeHeaders, {
      userId: row.userId!,
      templateKey: "promo-warning",
      tier: "non-essential",
    }, { inline: true });

    // 6. Dispatch via existing sendTemplatedEmail-style action, but raw to Resend here.
    const resendResult = await step.runAction(internal.email.send.sendResendRaw, {
      to: row.email,
      subject: buildSubject("promo-warning", row.payloadJson),
      html,
      headers,
    });

    // 7. Patch status to sent.
    await step.runMutation(internal.email.mutations.patchSent, {
      emailEventId,
      resendEmailId: resendResult.emailId,
    }, { inline: true });
  },
});
```

`sendAnomalyAlert` deviates: step 1 is a 15-minute wait (`{ runAfter: 15 * 60 * 1000 }`) on a noop mutation, then a query that collects sibling pending rows, then the merge into a coalesced payload. See Section 9 for the full workflow.

`sendWeeklyDigest` skips if `row.payloadJson.topSpendByCategory.length === 0 && activeAnomalies.length === 0 && expiringPromos.length === 0 && upcomingStatements.length === 0 && expiringTrials.length === 0` (zero-signal skip per brainstorm Section 12).

---

## 8. `handleEmailEvent` suppression logic

Expansion of existing [packages/backend/convex/email/events.ts](../packages/backend/convex/email/events.ts). Today it only logs. Post-W7:

```ts
export const handleEmailEvent = internalMutation({
  args: { id: vEmailId, event: vEmailEvent },
  returns: v.null(),
  handler: async (ctx, { id, event }) => {
    const resendEmailId = id as string;

    // Insert webhook event row linked by resendEmailId.
    await ctx.table("emailEvents").insert({
      idempotencyKey: `webhook:${resendEmailId}:${webhookEventToSource(event.type)}`,
      email: (event.data as { to?: string[] | string }).to
        ? (Array.isArray((event.data as any).to) ? (event.data as any).to[0] : (event.data as any).to).toLowerCase()
        : "",
      templateKey: "",
      source: webhookEventToSource(event.type),
      resendEmailId,
      status: "sent",
      attemptCount: 0,
      payloadJson: event,
      createdAt: Date.now(),
    }).catch(err => {
      if (isUniqueConstraintError(err)) return; // dedup replay safely
      throw err;
    });

    // Suppression on hard bounce or complaint.
    if (event.type === "email.bounced" && (event.data as any).bounce?.type === "hard") {
      await upsertSuppression(ctx, event, "hard_bounce");
    } else if (event.type === "email.complained") {
      await upsertSuppression(ctx, event, "complaint");
    }
  },
});

async function upsertSuppression(ctx: MutationCtx, event: EmailEvent, reason: "hard_bounce" | "complaint") {
  const toRaw = (event.data as { to?: string[] | string }).to;
  const email = (Array.isArray(toRaw) ? toRaw[0] : toRaw ?? "").toLowerCase();
  if (!email) return;

  const existing = await ctx.table("emailSuppressions").get("email", email);
  if (existing) {
    await existing.patch({
      reason,
      lastEventAt: Date.now(),
      eventCount: existing.eventCount + 1,
    });
  } else {
    await ctx.table("emailSuppressions").insert({
      email,
      reason,
      firstEventAt: Date.now(),
      lastEventAt: Date.now(),
      eventCount: 1,
      // userId resolution via emailEvents.by_resendEmailId if available; otherwise null
    });
  }
}
```

Pre-send check (inside `preCheck` middleware step):

```ts
export const preCheck = internalMutation({
  args: { emailEventId: v.id("emailEvents"), tier: v.union(v.literal("essential"), v.literal("non-essential")), preferenceKey: v.optional(v.string()) },
  returns: v.object({ skipped: v.boolean(), reason: v.optional(v.string()) }),
  handler: async (ctx, { emailEventId, tier, preferenceKey }) => {
    const row = await ctx.table("emailEvents").getX(emailEventId);

    // 1. Hard bounce check (applies to all tiers including essential; cannot deliver to dead address).
    const suppression = await ctx.table("emailSuppressions").get("email", row.email);
    if (suppression && suppression.reason === "hard_bounce") {
      await row.patch({ status: "skipped_suppression", processedAt: Date.now() });
      return { skipped: true, reason: "hard_bounce" };
    }

    // 2. Complaint check (non-essential only).
    if (tier === "non-essential" && suppression && suppression.reason === "complaint") {
      await row.patch({ status: "skipped_suppression", processedAt: Date.now() });
      return { skipped: true, reason: "complaint" };
    }

    // 3. Preference check (non-essential only).
    if (tier === "non-essential" && preferenceKey && row.userId) {
      const prefs = await ensurePreferences(ctx, row.userId);
      if (prefs.masterUnsubscribed || !(prefs as any)[preferenceKey]) {
        await row.patch({ status: "skipped_pref", processedAt: Date.now() });
        return { skipped: true, reason: "preference" };
      }
    }

    return { skipped: false };
  },
});
```

---

## 9. `sendAnomalyAlert` coalesce logic (§9.2 of contracts)

W6 inserts one `emailEvents` row per anomaly. W7's workflow coalesces inside step 1.

```ts
export const sendAnomalyAlert = workflow.define({
  args: { emailEventId: v.id("emailEvents") },
  returns: v.null(),
  handler: async (step, { emailEventId }): Promise<void> => {
    // Step 0: check if this is a "leader" (first pending row in the window). If not, early-return.
    const leadershipCheck = await step.runMutation(internal.email.middleware.anomalyLeadershipCheck, {
      emailEventId,
    }, { inline: true });
    if (!leadershipCheck.isLeader) return;

    // Step 1: wait 15 minutes to coalesce sibling anomalies.
    await step.runMutation(internal.utils.noop, {}, { runAfter: 15 * 60 * 1000 });

    // Step 2: gather all pending anomaly rows for this user in the window.
    const coalesced = await step.runMutation(internal.email.middleware.anomalyCoalesce, {
      leaderId: emailEventId,
    }, { inline: true });
    // coalesced: { userId, anomalies: [...], siblingIds: [...] }

    // Step 3: tier check (non-essential).
    const preCheck = await step.runMutation(internal.email.middleware.preCheck, {
      emailEventId,
      tier: "non-essential",
      preferenceKey: "anomalyAlertEnabled",
    }, { inline: true });
    if (preCheck.skipped) {
      // Patch all siblings with same skip reason.
      await step.runMutation(internal.email.middleware.patchSiblingsSkipped, {
        siblingIds: coalesced.siblingIds,
        reason: preCheck.reason!,
      }, { inline: true });
      return;
    }

    // Step 4: render with the full anomaly array.
    const html = await step.runAction(internal.email.templates.renderTemplate, {
      template: "anomaly-alert",
      props: { anomalies: coalesced.anomalies, theme: "light" },
    });

    // Step 5: patch leader to running; mark siblings as coalesced-into-leader.
    await step.runMutation(internal.email.middleware.patchCoalescedRunning, {
      leaderId: emailEventId,
      siblingIds: coalesced.siblingIds,
    }, { inline: true });

    // Step 6: build headers + dispatch.
    const headers = await step.runMutation(internal.email.middleware.buildUnsubscribeHeaders, {
      userId: coalesced.userId,
      templateKey: "anomaly-alert",
      tier: "non-essential",
    }, { inline: true });

    const resendResult = await step.runAction(internal.email.send.sendResendRaw, {
      to: (await step.runQuery(internal.email.queries.getEventInternal, { emailEventId }, { inline: true }))!.email,
      subject: `${coalesced.anomalies.length} unusual transaction${coalesced.anomalies.length === 1 ? "" : "s"} detected`,
      html,
      headers,
    });

    // Step 7: patch leader + siblings to sent with shared resendEmailId.
    await step.runMutation(internal.email.middleware.patchCoalescedSent, {
      leaderId: emailEventId,
      siblingIds: coalesced.siblingIds,
      resendEmailId: resendResult.emailId,
    }, { inline: true });
  },
});
```

**Leadership rule.** `anomalyLeadershipCheck` returns `isLeader: true` only if the current `emailEventId` is the OLDEST pending anomaly row for the user without a `workflowId` attached. Second concurrent `dispatchAnomalyAlert` calls become non-leaders and exit. Prevents fan-out into N workflows per batch.

---

## 10. Preferences page

Location: [apps/app/src/app/(app)/settings/notifications/page.tsx](../apps/app/src/app/(app)/settings/notifications/page.tsx) (new). Uses existing `/settings` layout. UntitledUI toggle components. React Server Component shell + one client component for the toggles.

Queries consumed:

- `api.email.queries.getNotificationPreferences` (public query, returns lazy-created preferences for viewer).
- `api.email.queries.getBounceStatus` (public query, returns the contracts §0 bounce status).

Mutations:

- `api.email.mutations.updateNotificationPreference({ templateKey, enabled })` (public mutation, validates key).

Copy:

- Page title: "Notifications"
- Page subtitle: "Choose which emails from SmartPockets you want to receive."
- Sections:
  1. "Financial alerts" (promo-warning, statement-closing, anomaly-alert, subscription-detected)
  2. "Digests" (weekly-digest)
  3. "Account" (welcome-onboarding: locked, shown for UI symmetry with a tooltip "We always send this one so you can get set up.")
- Master toggle: "Pause all non-essential SmartPockets email"
- If `getBounceStatus().status !== "active"`, render a warning banner above the toggles with the reason and a CTA to update the email address (links to Clerk's Account Portal).

---

## 11. HTTP routes

Added to [packages/backend/convex/http.ts](../packages/backend/convex/http.ts):

### 11.1 `POST /resend-webhook`

```ts
http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});
```

### 11.2 `POST /email/unsubscribe`

Idempotent per RFC 8058. Verifies HMAC, flips preference, returns 200 empty.

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

    const { userId, templateKey, expired } = verified.data;
    await ctx.runMutation(internal.email.mutations.flipPreferenceFromToken, {
      userId,
      templateKey,
    });

    return new Response(null, { status: expired ? 410 : 200 });
  }),
});
```

### 11.3 `GET /email/unsubscribe`

Renders a confirmation page with a `<form method="POST">` button. Not required by RFC 8058 but required for clients that follow the header as a link.

---

## 12. Crons owned by W7

Added to [packages/backend/convex/crons.ts](../packages/backend/convex/crons.ts):

### 12.1 Weekly digest

```ts
crons.weekly("weekly digest", { dayOfWeek: "sunday", hourUTC: 9, minuteUTC: 0 }, internal.email.crons.dispatchWeeklyDigestForAllUsers);
```

Handler iterates users, assembles payload from W6's tables, calls `dispatchWeeklyDigest` per user.

### 12.2 Welcome signup-only fallback

```ts
crons.hourly("welcome signup fallback", { minuteUTC: 15 }, internal.email.crons.dispatchWelcomeSignupFallback);
```

Handler scans users where `createdAt <= now - 48h`, no active Plaid items, and no `emailEvents` row with `templateKey: "welcome-onboarding"`. Calls `dispatchWelcomeOnboarding({ variant: "signup-only" })`.

### 12.3 Old event cleanup

```ts
crons.daily("cleanup old email events", { hourUTC: 3, minuteUTC: 30 }, internal.email.crons.cleanupOldEmailEvents);
```

Handler deletes `emailEvents` rows older than the per-source / per-template TTL from spike §4.4 table.

### 12.4 Stuck workflow reconciliation

```ts
crons.hourly("reconcile stuck email workflows", { minuteUTC: 45 }, internal.email.crons.reconcileStuckWorkflows);
```

Handler scans `emailEvents` with `status === "running"` and `processedAt` older than 1 hour. For each, queries `workflow.status`; if workflow is `completed`, patches status to `sent` or `failed` based on the workflow result.

---

## 13. `getBounceStatus()` public query (W1 contract)

At [packages/backend/convex/email/queries.ts](../packages/backend/convex/email/queries.ts):

```ts
export const getBounceStatus = query({
  args: {},
  returns: v.object({
    status: v.union(v.literal("active"), v.literal("suppressed_bounce"), v.literal("suppressed_complaint")),
    lastEventAt: v.union(v.number(), v.null()),
    reason: v.union(v.string(), v.null()),
  }),
  handler: async (ctx) => {
    const viewer = ctx.viewerX();
    if (!viewer.email) return { status: "active", lastEventAt: null, reason: null };
    const suppression = await ctx.table("emailSuppressions").get("email", viewer.email.toLowerCase());
    if (!suppression) return { status: "active", lastEventAt: null, reason: null };
    return {
      status: suppression.reason === "hard_bounce" ? "suppressed_bounce" : "suppressed_complaint",
      lastEventAt: suppression.lastEventAt,
      reason: suppression.reason,
    };
  },
});
```

W1 uses this for an in-app banner. Contract enum matches [specs/00-contracts.md](00-contracts.md) §0.

---

## 14. Dev-mode env gating

Implemented inside the shared `sendResendRaw` action at [packages/backend/convex/email/send.ts](../packages/backend/convex/email/send.ts) (new function; existing `sendTemplatedEmail` preserved):

```ts
export const sendResendRaw = internalAction({
  args: { to: v.string(), subject: v.string(), html: v.string(), headers: v.array(v.object({ name: v.string(), value: v.string() })) },
  returns: v.object({ emailId: v.string() }),
  handler: async (ctx, { to, subject, html, headers }) => {
    const devLive = process.env.EMAIL_DEV_LIVE === "true";
    const isDev = process.env.CONVEX_CLOUD_URL?.includes("dev") || !process.env.CONVEX_DEPLOYMENT?.startsWith("prod:");

    if (isDev && !devLive) {
      // Dev-capture: write the rendered HTML back to the emailEvents source row.
      // The caller is responsible for the source row patch; this action returns a synthetic id.
      return { emailId: `devcap_${Date.now()}_${Math.random().toString(36).slice(2, 10)}` };
    }

    const effectiveTo = process.env.EMAIL_DEV_OVERRIDE_TO ?? to;
    const emailId = await resend.sendEmail(ctx, {
      from: EMAIL_CONFIG.from.default,
      to: [effectiveTo],
      subject,
      html,
      headers,
    });
    return { emailId: emailId as string };
  },
});
```

**Detection of prod vs dev** uses `CONVEX_DEPLOYMENT` prefix (Convex convention: `dev:*` or `prod:*`). Fallback heuristic via `CONVEX_CLOUD_URL`. Conservative: default to "dev" when unsure so a misconfigured env does not silently send.

---

## 15. Production rollout preconditions

Explicit acceptance gates for the last PR in the stack (W7.14):

1. DNS verification green: `mail.smartpockets.com` SPF + DKIM + DMARC.
2. Resend domain status: "verified" in dashboard.
3. Prod Convex env vars set: `RESEND_API_KEY`, `EMAIL_DOMAIN`, `APP_NAME`, `RESEND_WEBHOOK_SECRET`, `EMAIL_UNSUBSCRIBE_SIGNING_KEY`.
4. Prod `INNGEST_EVENT_KEY` removed.
5. Resend webhook endpoint registered at `https://<prod-deployment>.convex.site/resend-webhook` with event types from research §5.4.
6. Logo committed to `apps/web/public/email-assets/logo.png` and `logo@2x.png`; `apps/web` deployed; `email-config.ts` updated; the URL resolves to HTTP 200 with `Content-Type: image/png`.
7. Clerk email backfill run once in prod: all `users.email` populated.
8. Smoke send: one live weekly-digest test send to Eric's prod account.

---

## 16. Acceptance criteria

The W7 stack is complete when:

1. All eight template files render via `bun dev:email` preview without errors.
2. All eight dispatch actions callable with valid payloads return `{ status: "queued", emailEventId }` OR `{ status: "skipped_duplicate", emailEventId }`.
3. `emailEvents` has an idempotencyKey unique constraint that rejects duplicate inserts at the DB layer (verified by concurrency test).
4. `emailSuppressions` hard-bounce entry blocks all subsequent sends to that email; complaint entry blocks only non-essential.
5. Preferences page at `/settings/notifications` renders, lists six toggles, flips persist, and `getBounceStatus()` banner appears when suppressed.
6. `/email/unsubscribe` POST flips preference idempotently, rejects invalid signatures with 400, accepts expired tokens with 410 (flip still performed).
7. `/resend-webhook` accepts valid svix-signed payloads, rejects unsigned, populates `emailEvents` with `source: "webhook-*"` rows.
8. `handleEmailEvent` on `email.bounced` with `bounce.type: "hard"` creates `emailSuppressions` row; on `email.complained` creates row with reason `complaint`.
9. Weekly digest cron fires Sunday 09:00 UTC; welcome signup fallback cron fires hourly; cleanup cron fires daily at 03:30 UTC; reconcile stuck workflows cron fires hourly.
10. Dev-mode `EMAIL_DEV_LIVE` unset logs to `emailEvents` with `source: "dev-capture"`; setting `EMAIL_DEV_LIVE=true` triggers real sends.
11. `getBounceStatus()` query returns correct status discriminator.
12. All W4 and W6 consumers can call the dispatch actions with types matching [specs/00-contracts.md](00-contracts.md) §15.
13. 22 existing templates still render; 4 Clerk-wired sends still work.
14. `bun typecheck` passes across all workspaces.
15. `bun build` succeeds for `apps/app` and `apps/web`.
16. Production preconditions from Section 15 met before the final merge.
17. CodeRabbit clean on every PR in the stack.

---

## 17. Questions this spec answered

Per the master brief Section 8 W7 brief, the following "Questions the spec must answer" are addressed:

| Question | Section |
|---|---|
| Full audit of existing 22 templates (reconciled with W0) | 4 |
| Template list confirmation | 4 |
| Preferences schema and UI | 5.2, 10 |
| Send pipeline diagram | 6, 7 |
| Idempotency strategy | spike §4.4; summarized in 3.5 |
| Unsubscribe compliance | 11.2, research §1 |
| Bounce and complaint handling | 8, research §2 |
| Copy drafts | W7 plan W7.3; drafts at `packages/email/emails/drafts/*.draft.md` |
| Logo hosting | research §6; confirmed 3.10 |
| Env var final set | research §4.5 |
| Clerk email resolution | research §3.4; schema 5.1 |
| W4 / W6 contract ownership | 3.3; contracts §13, §14, §15 |

---

**End of W7 spec.**
