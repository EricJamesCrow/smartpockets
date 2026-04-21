# W7: Email System Extension (Brainstorm)

**Milestone:** M3 Agentic Home
**Workstream:** W7 Email System Extension
**Phase:** `/brainstorm` (exploratory; spec and plan follow on approval)
**Author:** Claude (Obra Superpowers, Opus 4.7 [1M context])
**Date:** 2026-04-20
**Scope:** Reconcile the seven MVP agentic-home emails against the 22 existing React Email templates, design the send pipeline extension on top of the existing `@convex-dev/resend` 0.2.1 foundation, and surface every open contract question before `/plan` runs.
**Writing convention:** No em-dashes. Use colons, parentheses, semicolons, or fresh sentences.
**Source of truth for current state:** [specs/W0-existing-state-audit.md](W0-existing-state-audit.md) Section 15 (email infrastructure) and Section 16.2 (TODO.md blockers).

---

## 0. Executive summary

W7 is transport-and-policy work on top of an already-solid send layer. `@convex-dev/resend` 0.2.1 is wired, 22 branded templates exist, four Clerk-triggered sends are live, and the component already emits bounce, complaint, open, and click events into a handler that logs them but takes no further action. The seven MVP agentic emails (which this brainstorm expands to eight, see Section 2) are all new work. The pipeline needs: a typed dispatch API for W6 and W4 to call against, a shared middleware helper that owns preferences / suppression / idempotency, three new Ents tables (`notificationPreferences`, `emailEvents`, `emailSuppressions`), a preferences page at `/settings/notifications`, RFC 8058 one-click unsubscribe, and a dev-mode routing story that does not burn Resend quota during iteration. The pre-plan unknowns are the interaction between `@convex-dev/resend`'s built-in idempotency and the content-hash layer, the 2026 state of Resend's RFC 8058 support, and the concrete payload shapes W6 will emit. Section 13 captures those as a research spike that must resolve before `/plan`.

---

## 1. Context anchors (what W7 is not starting from zero on)

### 1.1 Existing wiring (verified against the repo)

- [packages/backend/convex/email/resend.ts](packages/backend/convex/email/resend.ts): `new Resend(components.resend, { testMode: false, onEmailEvent: internal.email.events.handleEmailEvent })`. Provides `EMAIL_CONFIG.from.{default, support, billing}`.
- [packages/backend/convex/email/send.ts](packages/backend/convex/email/send.ts): three internal actions already exist, `sendTemplatedEmail`, `sendHtmlEmail`, `sendTextEmail`. Each returns `{ success, emailId, error }`. W7 extends this surface, it does not replace it.
- [packages/backend/convex/email/templates.ts](packages/backend/convex/email/templates.ts): Node action that renders React Email templates via `@react-email/render`. Current `TemplateType` union enumerates the 22 existing templates; W7 adds new entries for the eight MVP templates (Section 2).
- [packages/backend/convex/email/events.ts](packages/backend/convex/email/events.ts): `handleEmailEvent` internal mutation, dispatches on `email.sent | delivered | delivery_delayed | bounced | complained | opened | clicked`. Today it only `console.log`s. Commented-out schema for an `emailEvents` table is embedded in the file. W7 activates the table and the behavior.
- [packages/backend/convex/email/clerk.ts](packages/backend/convex/email/clerk.ts): `handleClerkEmail` maps seven Clerk slugs to four templates (`verification`, `password-reset`, `magic-link`, `invite`). Untouched by W7.
- [packages/email/emails/_config/email-config.ts](packages/email/emails/_config/email-config.ts): `logoUrl: ""` at line 54 with a TODO. `unsubscribe` and `preferences` link slots are declared on the `EmailBrandConfig` type but not populated.
- 22 templates in [packages/email/emails/](packages/email/emails/). W0 Section 15.1 enumerates them all. None match the seven fintech MVP use cases.

### 1.2 TODO.md blockers relevant to shipping (from W0 Section 16.2)

- `mail.smartpockets.com` DNS verification pending.
- Production Convex env vars not set (`RESEND_API_KEY`, `EMAIL_DOMAIN`, `APP_NAME`).
- Production `INNGEST_EVENT_KEY` still present (stale, to be removed).
- `logoUrl` empty; logo not hosted.
- `RESEND_WEBHOOK_SECRET` not configured; no `/resend-webhook` HTTP route exists yet.
- End-to-end tests for each template pending.

None of these block writing the spec. All of them block the ship. W7's plan must include them.

### 1.3 Hard constraints from the master brief Sections 13 and 14

- Do not replace `@convex-dev/resend`; extend it.
- Clerk is the source of truth for user email addresses (read via `users.externalId` → Clerk identity → `email_addresses[0]` on the identity payload).
- All triggers come from Convex scheduled functions or webhook handlers. No client-initiated sends.
- No em-dashes anywhere, in code or copy.
- Convex HTTP actions for webhooks and unsubscribe; no Next.js API routes.
- Derive `userId` from `ctx.viewerX()` (or from the Clerk webhook payload for pre-user events); never accept it from function args.
- Import `query`, `mutation` from `./functions`; `internalAction` from `./_generated/server`.
- Graphite stacked PRs; Codex-heavy execution with Claude Code review.

---

## 2. Template reconciliation: eight MVP, 22 existing

The original brief says seven MVP templates. Question 2 during brainstorming expanded Welcome into two variants (signup-time and first-Plaid-link-time), then Flag 1 from review collapsed them back into one `welcome-onboarding` template with a compound trigger. Net count: eight MVP templates if we split Promo Warning and Statement Closing into their cadences, or five parameterised templates if we fold cadences into a prop.

This brainstorm recommends the parameterised count: five template files, nine distinct trigger points.

### 2.1 Final template list and reuse posture

| # | Template key | Cadences / trigger | Shell source | Gap level |
|---|---|---|---|---|
| 1 | `welcome-onboarding` | Fires on first successful Plaid item link; 48h fallback fires post-Clerk-signup if no link has happened. | Adapt `simple-welcome-01` shell; fresh copy. | Content gap (shell exists). |
| 2 | `weekly-digest` | Sunday cron (weekday configurable, alpha uses Sun 09:00 UTC). Skip if zero signal. | Fresh template. | Full gap. |
| 3 | `promo-warning` | Consolidated per user per cadence (30 / 14 / 7 / 1 days). Cadence passed as prop. | Fresh template. | Full gap. |
| 4 | `statement-closing` | Consolidated per user per cadence (3 / 1 days). Cadence prop. | Fresh template. | Full gap. |
| 5 | `anomaly-alert` | Immediate-ish: 15-minute batch window aggregates anomalies per user. | Fresh template. | Full gap. |
| 6 | `reconsent-required` | Immediate on Plaid `ITEM_LOGIN_REQUIRED` or `PENDING_EXPIRATION`. Per item. | Fresh template. | Full gap. |
| 7 | `item-error-persistent` | Per item, fires when item has been in sustained error state for >= 24 hours. W4 owns the detection cron (see Section 10, Flag 2 resolution). | Fresh template. | Full gap. |

`welcome-onboarding` is one template file with a prop that switches between "you just signed up, here is how to connect your first bank" copy and "you just linked your first bank, here is how the agent works" copy. Brainstorm flag 1 resolved this as a merged template with compound triggering (Section 8) and 24h dedup on the trigger class.

Seven template files. Nine trigger combinations (welcome x 2 variants, promo x 4 cadences, statement x 2 cadences, plus anomaly / reconsent / item-error / digest).

### 2.2 What about the existing 22

None of the existing 22 match a fintech MVP use case functionally. `image-welcome`, `simple-welcome-01/02`, `video-welcome-01/02/03` are welcome shells. `simple-welcome-01` is the closest fit for `welcome-onboarding`'s structure (hero, primary CTA, feature list). The remaining 16 (Clerk auth flows, subscription billing lifecycle, receipts, trial-ending, etc.) stay put and are not part of W7's surface.

The four Clerk-triggered templates stay wired through `handleClerkEmail`. W7 does not touch `email/clerk.ts`.

### 2.3 Alternative considered: two separate welcome templates

Brainstorm question 2 initially locked on two files (`welcome-signup` + `welcome-plaid-linked`). Review flag 1 caught the double-email risk: Clerk signup and first Plaid link typically happen minutes apart. Two sends in three minutes is poor UX and looks like a bug. Mitigations considered:

- Keep two templates but add a 24h dedup on the welcome class via idempotency key `{userId, "welcome-class"}`. Drawback: two copy bodies to maintain for a scenario that almost always collapses into one.
- Merge into one `welcome-onboarding` template with a `variant: "signup-only" | "plaid-linked"` prop. First Plaid link fires it as `plaid-linked`. If no Plaid link happens within 48 hours of signup, a W7 cron fires it as `signup-only`. Single template, single idempotency class, two copy states.

Recommendation: **merge**. Fewer files, fewer code paths, cleaner copy ownership.

---

## 3. Architecture: Approach 3 (typed per-template wrappers over a shared helper)

### 3.1 Three approaches considered

1. **Flat per-template internal actions.** One action per template, each re-implementing preference / suppression / idempotency. Rejected: policy drift is guaranteed; 7 template files times 5 policy concerns is 35 drift opportunities.
2. **Single string-keyed gateway.** `dispatchNotification({ userId, templateKey: string, payloadJson: any })`. Rejected: loses type safety at the W6/W7 and W4/W7 boundary. The master brief's discipline (typed contracts, Zod schemas) rejects untyped payload blobs.
3. **Typed per-template wrappers over a shared middleware helper.** Seven thin dispatch actions, each with a Zod-validated typed payload, each calling a shared `sendNotification` helper. **Selected.**

### 3.2 Selected architecture

```
W6 cron, W4 webhook, or W7 internal cron
        |
        v
internal.email.dispatch.dispatch<Template>({ userId, ...typedPayload })
   (Zod-validated at the action boundary)
        |
        v
sendNotification(ctx, { userId, templateKey, payload, tier, idempotencyInput })
   1. Resolve user + Clerk email (read users Ent, then Clerk API if the webhook payload is missing it)
   2. Check emailSuppressions for the resolved email
      - tier "essential": skip check, always send
      - tier "non-essential": honor suppression
   3. Check notificationPreferences for the user
      - tier "essential": skip check
      - tier "non-essential": honor per-template boolean and masterUnsubscribed
   4. Derive idempotencyKey = hash({ userId, templateKey, cadence?, payloadIds, dateBucket })
   5. Look up emailEvents by idempotencyKey; if exists and source === "send", return { skipped: "duplicate" }
   6. Dev-mode branch:
      - EMAIL_DEV_LIVE unset: insert emailEvents row with source "dev-capture", payloadJson.renderedHtml, return
      - EMAIL_DEV_LIVE=true: proceed, optionally override `to` via EMAIL_DEV_OVERRIDE_TO
      - Production: proceed
   7. Render template via internal.email.templates.renderTemplate
   8. Attach List-Unsubscribe + List-Unsubscribe-Post headers (if Resend supports; see research)
   9. Call internal.email.send.sendTemplatedEmail (existing action)
   10. Insert emailEvents row with source "send", resendEmailId, idempotencyKey
   11. Return { success, emailId, idempotencyKey, skipped: null }
        |
        v
@convex-dev/resend delivers, retries, fires webhooks to /resend-webhook HTTP route
        |
        v
handleEmailEvent
   - email.sent / delivered: update existing emailEvents row, add source "webhook-delivered" child row
   - email.bounced (hard): upsert emailSuppressions row, insert "webhook-bounced" event row
   - email.bounced (soft): Resend retries; optionally log but do not suppress
   - email.complained: upsert emailSuppressions with reason "complaint", insert "webhook-complained" row
   - email.opened / clicked: insert analytics event row
```

### 3.3 Dispatch API surface (W6 and W4 contract)

All in `packages/backend/convex/email/dispatch.ts`, all `internalAction`:

- `dispatchWelcomeOnboarding({ userId, variant: "signup-only" | "plaid-linked", firstLinkedInstitutionName?: string })`
- `dispatchWeeklyDigest({ userId, weekStart: number, topSpendByCategory, upcomingStatements, activeAnomalies, expiringPromos, expiringTrials })` (shape finalised in `/plan`)
- `dispatchPromoWarning({ userId, cadence: 30 | 14 | 7 | 1, promos: Array<{ promoId, cardName, expirationDate, balance, daysRemaining }> })`
- `dispatchStatementReminder({ userId, cadence: 3 | 1, statements: Array<{ cardId, cardName, closingDate, projectedBalance, minimumDue, dueDate }> })`
- `dispatchAnomalyAlert(...)` **[SUPERSEDED by §17.2 and specs/00-contracts.md §15: canonical signature is `({ userId: Id<"users">, anomalyId: Id<"anomalies"> })`; W7 workflow coalesces sibling pending rows in a 15-minute window. Ignore the array-shaped signature below.]** `dispatchAnomalyAlert({ userId, windowStart: number, windowEnd: number, anomalies: Array<{ anomalyId, merchantName, amount, comparisonBaseline, transactionDate }> })`
- `dispatchReconsentRequired({ userId, plaidItemId, institutionName, reason: "ITEM_LOGIN_REQUIRED" | "PENDING_EXPIRATION" })`
- `dispatchItemErrorPersistent({ userId, plaidItemId, institutionName, firstErrorAt: number, lastSeenErrorAt: number, errorCode: string })`

`dispatchWeeklyDigest` is internal to W7 (W7's own Sunday cron calls it); the rest are called by W6 (digest payload assembly, promo / statement / anomaly triggers) or W4 (reconsent on webhook, item-error from the sustained-error cron).

### 3.4 Public query surface (for W1 consumption)

- `getBounceStatus()`: returns `{ status: "active" | "suppressed_bounce" | "suppressed_complaint", lastEventAt: number | null, reason: string | null }` for the current viewer. W1 uses this to render an in-app banner when we cannot reach the user by email. Flag 5 resolution.
- `getNotificationPreferences()`: returns the current viewer's preferences row (lazy-created with all-true defaults if missing).
- `updateNotificationPreference({ templateKey, enabled })`: user-facing mutation for the preferences page. Validates the key is a known MVP template key.

These live in `packages/backend/convex/email/queries.ts` and `packages/backend/convex/email/mutations.ts`.

---

## 4. Schema additions

All in [packages/backend/convex/schema.ts](packages/backend/convex/schema.ts). Full Ents (not legacy-db).

### 4.1 `notificationPreferences`

| Field | Type | Notes |
|---|---|---|
| `userId` | edge to `users` | One row per user. Unique. |
| `weeklyDigestEnabled` | boolean | Default true. |
| `promoWarningEnabled` | boolean | Covers all four cadences. Default true. |
| `statementReminderEnabled` | boolean | Covers 3 / 1 day. Default true. |
| `anomalyAlertEnabled` | boolean | Default true. |
| `welcomeOnboardingEnabled` | boolean | Default true. Essential-tier override still applies, so this is cosmetic; kept for UI symmetry. |
| `masterUnsubscribed` | boolean | Default false. Non-essential sends honor this; essential sends ignore. |
| `updatedAt` | number | |

Index: `by_user` on `[userId]`.

Essential-tier templates (`welcome-onboarding`, `reconsent-required`, `item-error-persistent`) skip the preference check entirely. The preference row still holds a `welcomeOnboardingEnabled` boolean so the UI can show a disabled-toggle explanation, but the middleware ignores it.

### 4.2 `emailEvents`

One unified table for: sends, dev captures, and inbound Resend webhook events. Discriminated by `source`.

| Field | Type | Notes |
|---|---|---|
| `userId` | optional edge to `users` | Nullable for pre-user sends (none planned at MVP but the component does support addressed sends). |
| `email` | string | Resolved lowercased recipient address. |
| `templateKey` | string | e.g., `"promo-warning"`. Null for webhook events that cannot be traced back. |
| `cadence` | optional number | 30 / 14 / 7 / 1 / 3 / etc. |
| `idempotencyKey` | string | Content hash. Null for webhook event rows that reference a prior send via `resendEmailId`. |
| `source` | literal union | `"send" \| "dev-capture" \| "webhook-sent" \| "webhook-delivered" \| "webhook-bounced" \| "webhook-complained" \| "webhook-opened" \| "webhook-clicked" \| "webhook-delayed"` |
| `resendEmailId` | optional string | Links `source: "send"` rows to subsequent webhook rows. |
| `payloadJson` | any | Send rows hold the input payload + renderedHtml (dev-capture only, to keep prod rows small). Webhook rows hold the raw event. |
| `errorMessage` | optional string | For failed sends. |
| `createdAt` | number | |

Indexes: `by_user_created` on `[userId, createdAt]`, `by_idempotencyKey` on `[idempotencyKey]`, `by_resendEmailId` on `[resendEmailId]`, `by_template_created` on `[templateKey, createdAt]`.

### 4.3 `emailSuppressions`

Keyed by email, not userId, so address changes do not reset suppression.

| Field | Type | Notes |
|---|---|---|
| `email` | string | Lowercased. Unique. |
| `reason` | literal union | `"hard_bounce" \| "complaint"` |
| `firstEventAt` | number | |
| `lastEventAt` | number | |
| `eventCount` | number | Incremented on repeat events. |
| `userId` | optional edge to `users` | Populated when we can resolve; kept optional for robustness. |

Index: `by_email` on `[email]`, `by_user` on `[userId]`.

### 4.4 Schema additions NOT in W7

- `emailTriggers` queue table: explicitly rejected (Approach 3 is push, not queue). If a future workstream needs replay or delayed dispatch, revisit.
- `emailCampaigns`: out of scope; W7 is transactional only.

---

## 5. Idempotency strategy

### 5.1 Content hash derivation

`idempotencyKey = sha256(stableStringify({ userId, templateKey, cadence, sortedPayloadIds, dateBucket }))`

Where `dateBucket` is `YYYY-MM-DD` in UTC for daily templates (promo, statement, digest), and `YYYY-MM-DD-HHMM` rounded to the 15-minute batch window for `anomaly-alert`. For per-event templates (`reconsent-required`, `item-error-persistent`), the bucket is simply `plaidItemId` plus a coarse timestamp (e.g., day) so repeat errors on the same item do not re-send within 24 hours.

### 5.2 Why a content-hash layer on top of `@convex-dev/resend` (SUPERSEDED)

**[SUPERSEDED by §18 item 1 and [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) §4. Strategy C-prime is the committed answer: `emailEvents.idempotencyKey` is a `{ unique: true }` Ents field; producer-insert is the dedup primitive; `@convex-dev/resend`'s public `sendEmail` has no user-supplied idempotency key, so the component-layer delegation discussed below is not possible. The two-strategy ambiguity this section explored is resolved. Retained here for historical context only.]**

`@convex-dev/resend` 0.2.1 has its own `idempotencyKey` parameter on `sendEmail`. The component uses it to dedupe at the delivery layer. But our concern is broader: we want to skip a send before rendering, before a preference read, before a network call, when we have already sent the same logical notification today. The content-hash layer runs first; if it hits `emailEvents.by_idempotencyKey`, we return `{ skipped: "duplicate" }` without touching the component at all.

**Flag 3 resolution (from review): this is a pre-plan research task, not a post-plan one.** The research spike in Section 13 must confirm:
- What exactly `@convex-dev/resend` does with the `idempotencyKey` parameter (TTL, scope, dedup behavior).
- Whether skipping the component-layer key while we have a Convex-layer key is redundant or safer (we may want to pass our content hash directly to the component as `idempotencyKey` and skip our own `by_idempotencyKey` lookup, relying on the component).
- Whether there is a scenario where our layer says "new" and the component's layer says "duplicate" or vice versa.

Outcome shapes the `sendNotification` helper: either a two-layer check (our table + component key), or a one-layer delegation (pass through to the component). The plan cannot be written without this answer; the dispatch flow differs between the two.

### 5.3 Edge cases

- User has 3 promos at 30-day today; tomorrow a 4th promo crosses the 30-day threshold. Yesterday's hash and today's hash differ (different `sortedPayloadIds` and `dateBucket`). Two sends, by design.
- W6 retries a dispatch call after a transient failure. Same hash, second call is skipped.
- Timezone: dateBucket is UTC. Users in PST will see the digest around 01:00 or 02:00 local. Deferred to post-alpha; note in the plan.

---

## 6. Dev and production environment stance

### 6.1 Dev-mode three-state switch

| `EMAIL_DEV_LIVE` | `EMAIL_DEV_OVERRIDE_TO` | Behavior |
|---|---|---|
| unset | (ignored) | Log to `emailEvents` with `source: "dev-capture"`. No Resend call. `payloadJson.renderedHtml` holds the full HTML for manual inspection. |
| `true` | unset | Live Resend send to the real recipient. Used for Gmail rendering / DKIM / reply-to smoke tests. |
| `true` | `<addr>` | Live Resend send, but `to` is rewritten to `<addr>`. Used when Eric wants to see real sends without them going to each test user. |

Production deployments have neither env var set. `testMode: false` on the component stays as-is.

### 6.2 Production env vars (TODO.md follow-through)

W7's plan includes these as tasks, not just prerequisites:

- `RESEND_API_KEY` (prod)
- `EMAIL_DOMAIN=mail.smartpockets.com`
- `APP_NAME=SmartPockets`
- `RESEND_WEBHOOK_SECRET` (newly added; inbound webhook verification)
- `EMAIL_UNSUBSCRIBE_SIGNING_KEY` (new; HMAC signing key for the unsubscribe token; see Section 8)
- Remove stale `INNGEST_EVENT_KEY` from prod

DNS verification for `mail.smartpockets.com` is a prerequisite for shipping. The plan flags it as a human step that blocks the final PR merge, not a code task.

### 6.3 Logo hosting

`email-config.ts` line 54 has `logoUrl: ""`. W7's plan hosts the logo (either Convex Blob, Vercel Blob, or a `apps/web/public/` static path served at `https://www.smartpockets.com/email-logo.png`) and sets the URL. The static-path option is simplest and avoids another service. Recommendation: `apps/web/public/email-assets/logo.png` served at `https://www.smartpockets.com/email-assets/logo.png`. Deferred as a `/plan` decision.

---

## 7. Suppression policy and tier split

### 7.1 Template tiers

| Template | Tier | Honors `notificationPreferences`? | Honors `emailSuppressions`? |
|---|---|---|---|
| `welcome-onboarding` | essential | No | No |
| `weekly-digest` | non-essential | Yes | Yes |
| `promo-warning` | non-essential | Yes | Yes |
| `statement-closing` | non-essential | Yes | Yes |
| `anomaly-alert` | non-essential | Yes | Yes |
| `reconsent-required` | essential | No | Yes (hard bounce only) |
| `item-error-persistent` | essential | No | Yes (hard bounce only) |
| Clerk auth flows (verification, etc.) | essential | N/A (goes through `email/clerk.ts`, not W7) | Yes (hard bounce only) |

Rationale: complaint suppression applies to non-essential only (user saying "this is spam" about a digest should not nuke their password-reset path). Hard-bounce suppression applies to everything (no point sending to a dead address).

### 7.2 Suppression triggers

- `email.complained` webhook: upsert `emailSuppressions` with `reason: "complaint"`. Only blocks non-essential.
- `email.bounced` with hard bounce classification: upsert `emailSuppressions` with `reason: "hard_bounce"`. Blocks everything.
- `email.bounced` with soft bounce: `@convex-dev/resend` already retries up to three times with exponential backoff. W7 does not add suppression on soft bounces. The research spike confirms Resend's classification (some providers only differentiate post-retry; the component may expose `event.data.bounce_type`).

### 7.3 Manual un-suppression

Out of scope for MVP; document an admin-only `unsuppressEmail({ email, reason })` as a followup. Until then, suppression is permanent per address. Users who change their Clerk email bypass this naturally because the new address is not in `emailSuppressions`.

### 7.4 `getBounceStatus()` query contract (W1 consumer)

```ts
export const getBounceStatus = query({
  args: {},
  returns: v.object({
    status: v.union(
      v.literal("active"),
      v.literal("suppressed_bounce"),
      v.literal("suppressed_complaint"),
    ),
    lastEventAt: v.union(v.number(), v.null()),
    reason: v.union(v.string(), v.null()),
  }),
  handler: async (ctx) => {
    const viewer = ctx.viewerX();
    const email = /* resolve from Clerk identity */;
    const suppression = await ctx.table("emailSuppressions").get("email", email.toLowerCase());
    if (!suppression) return { status: "active", lastEventAt: null, reason: null };
    return {
      status: suppression.reason === "hard_bounce" ? "suppressed_bounce" : "suppressed_complaint",
      lastEventAt: suppression.lastEventAt,
      reason: suppression.reason,
    };
  },
});
```

W1 reads this to render an in-app banner ("we could not deliver your last email to X; update your address"). Flag 5 resolution.

---

## 8. Unsubscribe and RFC 8058

### 8.1 Token shape

HMAC-SHA256 signed opaque token. Not JWT (we do not need standard claims).

```
payload = base64url(JSON.stringify({ u: userId, t: templateKey, ts: Date.now() }))
sig     = base64url(hmacSha256(payload, EMAIL_UNSUBSCRIBE_SIGNING_KEY))
token   = `${payload}.${sig}`
```

Token TTL: 30 days from `ts`. Tokens older than 30 days return a 410 Gone but still honor the unsubscribe action (the user's intent is clear; we just do not want arbitrarily old tokens replayable forever).

Key rotation for alpha: single key. Rotation is a post-alpha feature (add a `k` field to payload to identify the signing key version).

### 8.2 Unsubscribe endpoint

HTTP route at [packages/backend/convex/http.ts](packages/backend/convex/http.ts):

- `POST /email/unsubscribe` (RFC 8058 one-click). Body: `List-Unsubscribe=One-Click`. Query param: `token`. Always returns 200 if signature verifies, regardless of whether the preference was already false (idempotent per RFC 8058 section 4). Returns 400 if signature fails. Returns 410 if token is >30 days old.
- `GET /email/unsubscribe?token=<>` (fallback for clients that do not POST): renders a confirmation page with a single button that POSTs to the above. Accessibility fallback for clients that do not honor RFC 8058 one-click.

Flag 4 resolution confirmed: HMAC, single key for alpha, idempotent per RFC 8058.

### 8.3 Headers on every non-essential send

```
List-Unsubscribe: <https://app.smartpockets.com/api/email/unsubscribe?token=...>, <mailto:unsubscribe@mail.smartpockets.com?subject=unsubscribe:token>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

Essential sends include only the `mailto:` variant, no one-click (users should not be able to one-click themselves out of reconsent-required notifications).

Flag 3 research task extends to: confirm Resend's current API for setting these headers. If the SDK does not expose them natively, fall back to `@convex-dev/resend`'s escape hatch or raw header injection.

---

## 9. Preferences page (`/settings/notifications`)

Minimal surface at [apps/app/src/app/(app)/settings/notifications/page.tsx](apps/app/src/app/(app)/settings/notifications/page.tsx). Reads `getNotificationPreferences`, renders a list of toggles per non-essential template, and a master unsubscribe. Essential templates render as locked-state rows with an explanation tooltip. Uses the existing UntitledUI settings page layout (matching `/settings/institutions` etc.).

Detailed UI is a `/plan` concern. W7's brainstorm only locks:

- Six toggles visible: weekly digest, promo warning, statement reminder, anomaly alert, master unsubscribe, and a locked welcome (for UI symmetry).
- Toggles call `updateNotificationPreference({ templateKey, enabled })`.
- Master unsubscribe: checking it does not nuke individual toggles; it acts as an override at the middleware layer. Unchecking restores per-template preferences.
- Copy avoids marketing tone: "Promo expiration warnings (30 / 14 / 7 / 1 days before)" not "Important alerts you'll love."

---

## 10. Contract assumptions (flags for W4, W6)

### 10.1 W6 owns dispatch invocation for digest source data, promo, statement, anomaly

- W6's daily and Sunday crons produce data shapes that match the Zod schemas on the W7 dispatch actions.
- W6's research and plan must adopt W7's published schemas as the contract.
- W6 calls `dispatchPromoWarning`, `dispatchStatementReminder`, `dispatchAnomalyAlert`, `dispatchWeeklyDigest` once per user per trigger event. W7's idempotency protects against bugs but W6 should not retry blindly.

### 10.2 W4 owns reconsent and item-error triggers

Flag 2 resolution: W4 (not W7) owns the Plaid domain logic.

- W4 adds a `firstErrorAt` nullable field on `plaidItems` (or equivalent). Cleared when the item returns to healthy.
- W4's Plaid webhook handler for `ITEM_LOGIN_REQUIRED` and `PENDING_EXPIRATION` calls `dispatchReconsentRequired` directly.
- W4 adds a 6-hour cron that scans `plaidItems` where `firstErrorAt` is non-null and `(now - firstErrorAt) >= 24h` and `lastDispatchedAt IS NULL`, calls `dispatchItemErrorPersistent`, and sets `lastDispatchedAt`.
- W7 stays transport-pure. No Plaid table reads in the dispatch layer.

This is a spec-level contract that W4's brainstorm and plan must accept. If W4 resists, the fallback is W7 owns a shallow cron that only checks `plaidItems.status` without understanding Plaid error semantics. Noting this as the BATNA, not the preferred path.

### 10.3 W7's own scheduled work

- Weekly digest cron at Sunday 09:00 UTC. W7 owns the scan (iterate users, check digest preference, call `dispatchWeeklyDigest` with data assembled from W6's tables).
- Welcome-onboarding signup-only fallback cron: hourly scan for users created >48h ago who have not linked a Plaid item and have not already received a welcome. Calls `dispatchWelcomeOnboarding` with `variant: "signup-only"`.

Both live in [packages/backend/convex/crons.ts](packages/backend/convex/crons.ts) and their handlers live in `packages/backend/convex/email/crons.ts` (new file).

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Welcome double-send despite dedup | Merged template with compound trigger (Section 2.3); idempotency key class covers both variants within 24h. |
| RFC 8058 not supported by Resend SDK | Research spike resolves before `/plan`. Fallback: CAN-SPAM minimum (footer unsubscribe link) only, flagged as a deliverability risk. |
| `@convex-dev/resend` idempotency semantics misunderstood | Research spike resolves before `/plan`. Tests in the plan cover both layers. |
| Anomaly-alert burst floods inbox | 15-minute batch window consolidates; per-cadence-per-user-per-dateBucket idempotency caps to one send per 15 min. |
| DNS verification slipping blocks ship | Plan includes a human-step gate; W7 ships conceptually without DNS, but the prod rollout task depends on it. |
| Preferences page ships before dispatch logic | Plan order: schema first, middleware second, dispatch wrappers third, preferences UI fourth. UI ships against a functioning backend. |
| Users marked as suppressed can never recover | Documented as followup; manual admin endpoint deferred. |
| Timezone drift for digest (UTC vs user local) | Deferred; digest fires at 09:00 UTC for alpha. Note in the release. |
| W4 or W6 not accepting the contract | Contract surface is small and typed; push back via spec comments. If W4 insists, BATNA is a W7-owned thin cron that only knows `plaidItems.status`. |
| Clerk identity not resolving inside an `internalAction` | `internalAction` does not carry viewer context by design. Sends receive `userId` as an arg; Clerk email is fetched via `internal.clerk.getUserEmail({ userId })` helper (may need to be added). Confirm in the plan. |

---

## 12. Edge cases to cover in the test plan

- Zero-data weekly digest: skip without sending.
- User with both hard-bounce and complaint event history: `reason` is last-seen; the `eventCount` tracks both. Essential sends still blocked.
- Consolidation: user has 15 promos at 30-day. Template renders a scrolling table; email size stays under 100 KB.
- Cadence collision: same promo hits both 30-day and 14-day on different days. Two separate sends, different idempotency keys. Verified.
- Clerk email change mid-cycle: user changes email on day N; day N+1 send goes to new address; old suppression does not apply to new address (by design).
- Retry storm: W6 bug calls `dispatchPromoWarning` 50 times in a second. Idempotency layer returns `{ skipped: "duplicate" }` from the second call onward. No Resend quota burned.
- Dev-mode transition: `EMAIL_DEV_LIVE` flipped mid-session. In-flight sends honor the env var at time of action execution, not at dispatch enqueue.
- RFC 8058 unsubscribe from an email older than 30 days: endpoint returns 410 but still flips the preference (resilient UX).
- Preference UI optimistic updates: toggle flipped client-side reverts if the mutation fails.
- Hard bounce after first send: second send within the same window returns `{ skipped: "suppressed" }`.

---

## 13. Pre-plan research spike (must complete before `/plan`)

Flag 3 resolution: the following questions block `/plan`. This is a small spike, not a parallel research task that lags the plan.

1. **Resend RFC 8058 one-click support in 2026.** Confirm that Resend SDK sets `List-Unsubscribe` and `List-Unsubscribe-Post` headers. If not, document the workaround (raw header injection via `@convex-dev/resend` escape hatch, or direct `resend` SDK usage in a bypass path).
2. **`@convex-dev/resend` idempotency semantics.** Read the component source or docs. Confirm: (a) what `idempotencyKey` param does, (b) TTL, (c) whether skipping the component key in favor of our content-hash pre-check introduces any correctness risk. Output: a one-paragraph determination that fixes the `sendNotification` flow.
3. **Resend bounce classification.** Confirm what `event.data.bounce_type` looks like in `@convex-dev/resend`'s `vEmailEvent` validator. Distinguish hard vs soft. Output: a code snippet that the `handleEmailEvent` mutation uses for the suppression decision.
4. **Clerk email resolution inside `internalAction`.** Confirm the helper shape. If none exists, `/plan` adds an `internal.clerk.getUserEmail({ userId })` as a prerequisite task.
5. **Deliverability sanity check.** DNS verification for `mail.smartpockets.com` (SPF, DKIM, DMARC). Confirm pending items in the Resend dashboard. Human task but surfacing it here ensures `/plan` does not plan around a broken sender.

Output of the spike lives in [specs/W7-email.research.md](W7-email.research.md) at `/plan` time. The spike itself runs first.

---

## 14. Open decisions deferred to `/plan`

The brainstorm does not need to resolve these; flagging them for plan-level decision:

- Weekly digest content shape in detail (sections, empty-state, maximum length).
- Precise idempotency key encoding (JSON stable-stringify vs manual concatenation).
- Logo hosting location (Convex Blob vs `apps/web/public/` static vs Vercel Blob).
- Whether `getNotificationPreferences` creates the row on read or requires an explicit `ensureNotificationPreferences` mutation.
- Preferences page visual shape (list of toggles vs grouped categories vs card layout). UntitledUI component choice.
- Whether `emailEvents` rows have a TTL / retention policy (log cardinality could grow fast with webhook events).
- Whether to add an admin surface to view `emailEvents` and `emailSuppressions` in MVP or defer.
- Graphite stack shape (estimated 6 to 8 PRs: schema, middleware, each dispatch wrapper, preferences UI, webhook route, unsubscribe route, production rollout).

---

## 15. Recommended next step

1. Run the research spike (Section 13). Deliverable: `specs/W7-email.research.md`.
2. Approve or redirect this brainstorm.
3. Run `/plan` to produce `specs/W7-email.md` (spec), `specs/W7-email.plan.md` (Plan Handoff Header + task list with Claude Code / Codex tags), and the seven draft copy bodies at `packages/email/emails/drafts/{welcome-onboarding, weekly-digest, promo-warning, statement-closing, anomaly-alert, reconsent-required, item-error-persistent}.draft.md`.
4. Executing agent (primarily Codex, reviewed by Claude Code) opens the worktree at `~/Developer/smartpockets-W7-email` on branch `feat/agentic-home/W7-email` and works through the Graphite stack.

W7 is parallelizable with everything except W6 (via contract), W4 (via contract), and the pre-plan research spike (blocker). The contract dependencies are resolved by publishing typed dispatch signatures in this brainstorm and letting W4 and W6 build against them.

---

## 16. Locked decisions summary (for quick reference)

| # | Decision | Source |
|---|---|---|
| 1 | One toggle per template (in `notificationPreferences`). | Q1 |
| 2 | Welcome merged to one template with compound trigger and 24h dedup. | Q2 + Flag 1 |
| 3 | Consolidated per-user per-cadence emails (promo, statement). | Q3 |
| 4 | W6 push model; W7 publishes typed dispatch API. W4 owns reconsent + item-error dispatch calls. | Q4 + Flag 2 |
| 5 | Dev mode: three-state (`unset` logs, `EMAIL_DEV_LIVE=true` sends live, `EMAIL_DEV_OVERRIDE_TO` rewrites `to`). | Q5 |
| 6 | Hard bounce + complaint trigger suppression; essential-vs-non-essential tier split; `emailSuppressions` keyed by email. | Q6 |
| 7 | Architecture: Approach 3 (typed per-template wrappers over shared middleware). | Approach selection |
| 8 | `emailEvents` unified table with `source` discriminator. | Review of Q5 side-check |
| 9 | `getBounceStatus()` query published for W1. | Flag 5 |
| 10 | HMAC-SHA256 unsubscribe token, single key for alpha, idempotent POST endpoint. | Flag 4 |
| 11 | `@convex-dev/resend` idempotency interaction research is a pre-plan blocker. | Flag 3 |

---

---

## 17. Reconciliation appendix (2026-04-20)

Cross-spec reconciliation pass closed the following W7 items. Canonical source: [specs/00-contracts.md](00-contracts.md). W7 `/plan` still blocks on the research spike (§13) AND the consolidated idempotency spike at [specs/00-idempotency-semantics.md](00-idempotency-semantics.md).

### 17.1 Template list expands to 8: `subscription-detected` added (reconciliation M18)

W6 §4.4.3 requires a `subscription-detected` email template for the per-user-per-day catch-up subscription batch. W7's original MVP list of 7 did not include it.

**Resolved:** `subscription-detected` is the 8th MVP template. Tier: non-essential. Trigger: W6 subscription catch-up scan completes; one send per user per day.

Updated Section 2.1 template list:

| # | Template key | Tier | Trigger | Cadence |
|---|---|---|---|---|
| 1 | `welcome-onboarding` | essential | W4 on first Plaid link; W7 48h signup-only fallback | Compound, 24h dedup |
| 2 | `weekly-digest` | non-essential | W7 Sunday cron | Weekly |
| 3 | `promo-warning` | non-essential | W6 promo countdown refresh | Per-user-per-cadence (30/14/7/1) |
| 4 | `statement-closing` | non-essential | W6 statement reminder scan | Per-user-per-cadence (3/1) |
| 5 | `anomaly-alert` | non-essential | W6 anomaly scan (per event), W7 workflow coalesces 15 min | Per-batch-per-user |
| 6 | `reconsent-required` | essential | W4 webhook handler | Immediate; per-plaidItem 24h dedup |
| 7 | `item-error-persistent` | essential | W4 6-hour cron | Max once per item per 24h |
| 8 | `subscription-detected` | non-essential | W6 catch-up scan; one per user per day with array payload | Per-user-per-day |

Added to W7 `/plan` task list: one new template body draft at `packages/email/emails/drafts/subscription-detected.draft.md`.

### 17.2 Anomaly dispatch signature: single event, not array (reconciliation M15)

W7 §3.3 `dispatchAnomalyAlert` signature is updated from:

```ts
dispatchAnomalyAlert({ userId, windowStart, windowEnd, anomalies: Array<{ ... }> });
```

to the canonical form in contracts §15:

```ts
dispatchAnomalyAlert({ userId: Id<"users">, anomalyId: Id<"anomalies"> });
```

Rationale: W6 inserts one `emailEvents` row per `anomalies` row (contracts §9.2). W7's `sendAnomalyAlert` workflow owns the coalesce:

- Step 1 (`waitForMoreAnomaliesStep`, 15 minutes): queries sibling `emailEvents` rows by `(userId, templateKey: "anomaly-alert", status: "pending", createdAt: within-window)` and gathers the full array.
- Step 2 onwards: load preferences, check dedup on the **coalesced batch** (use a batch-level idempotency key derived from the constituent `emailEvents.idempotencyKey` values), render, dispatch, record.
- On dispatch success, all constituent rows are marked `status: "sent"` with the same `resendEmailId`.

The 15-minute window is empirically tuned. Idempotency spike §3 must confirm that workflow step retries do not re-trigger the wait (if the workflow engine restarts mid-wait, the second attempt should see the prior wait's outputs; spike answers this).

### 17.3 `emailEvents` gains `workflowId` (reconciliation M17)

W7 merges W6's `notificationEvents` table into `emailEvents`. The only structural change: add `workflowId: v.optional(v.string())` to the schema. W6 writes this field immediately after `workflow.start` returns; W7 workflow steps use it for observability (all steps in a run share the same id).

Section 4.2 schema updated inline (for `/plan` reference):

```ts
// Add to emailEvents:
workflowId: v.optional(v.string()),   // reconciliation M17
```

No change to the `source` discriminator semantics. W6's pending inserts (`status: "pending"`) now carry `workflowId` once the workflow starts; W7's webhook rows do not (webhook events are not tied to a workflow instance).

### 17.4 W6 coalesce ownership clarification (reconciliation M15)

Section 6.4 workflow steps list for `sendAnomalyAlert` is correct as written (waits in step 1, coalesces in step 3). Reconciliation only changes the **dispatch entry signature** (§17.2). Internal workflow logic stays.

### 17.5 Welcome trigger collaboration with W4 (reconciliation M16)

W4 calls `dispatchWelcomeOnboarding({ userId, variant: "plaid-linked", firstLinkedInstitutionName })` inside the successful `exchangePublicToken` path (contracts §13). W7 §10.3 already owns the signup-only fallback cron. Both paths hit the same `welcome-onboarding` template with different `variant` prop; the 24h dedup key `{userId, "welcome-class"}` suppresses double-send.

### 17.6 Idempotency spike absorbs W7 §13 item 2 (reconciliation M4)

W7 §13 already gates `/plan` on the `@convex-dev/resend` idempotency investigation (item 2). Reconciliation elevates the spike output to a shared document: [specs/00-idempotency-semantics.md](00-idempotency-semantics.md). W5 and W6 plans also block on the spike.

W7 §13 items 1 (RFC 8058), 3 (bounce classification), 4 (Clerk email resolution), 5 (DNS) remain W7-only; they do not affect other workstreams.

### 17.7 Reconciliation table

| ID | Issue | Resolution |
|---|---|---|
| M4 | Idempotency spike shared | §17.6; consolidated at specs/00-idempotency-semantics.md. |
| M15 | Anomaly dispatch signature | §17.2; single anomalyId at producer, workflow coalesces. |
| M16 | Welcome trigger owner | §17.5; W4 fires plaid-linked, W7 owns signup-only cron. |
| M17 | `emailEvents` merges `notificationEvents` | §17.3; add `workflowId`. |
| M18 | Missing `subscription-detected` template | §17.1; 8th MVP template. |

### 17.8 Plan task additions

`/plan` task list adds:

- One new template body draft: `subscription-detected.draft.md`. Codex.
- One new dispatch action: `dispatchSubscriptionDigest`. Codex.
- One new workflow: `sendSubscriptionDigest.ts` (5-step shape per W7 §6.4). Codex.
- `emailEvents.workflowId` field in schema PR. Codex.
- Coordination task with W4 for `dispatchWelcomeOnboarding` call-site. Claude Code reviews.

Total MVP templates: 8. Total dispatch actions: 8. Total workflows: 8 (one per template).

---

**End of W7 brainstorm.**

---

## 18. Idempotency spike resolution (2026-04-20)

Spike closed. Authoritative output at [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) §4. Summary of W7 impact:

1. **Strategy C-prime committed**: insert `emailEvents` row with a unique `idempotencyKey` field; `workflow.start` only fires on successful (new) insert. `@convex-dev/resend` 0.2.3 public `sendEmail` takes NO user-supplied idempotency key, so application-layer dedup is mandatory (not a choice).
2. **`sendNotification` middleware helper collapses into the dispatch action + workflow body.** My original Section 3.2 flow is superseded. New flow:
   - Dispatch action: compute key → `get("idempotencyKey", key)` → if found return skipped, else insert `emailEvents` row (`status: "pending"`) → `workflow.start(internal.email.workflows.send<Template>, { emailEventId })`.
   - Workflow body (per template): load row → check preferences/suppression → render → call `resend.sendEmail` via step → patch row with `resendEmailId` and `status: "sent"`.
3. **Shared hash utility** lives at `packages/backend/convex/notifications/hashing.ts`. W5 reuses for `agentProposals.contentHash`.
4. **`idempotencyKey` is a unique Ents field** (not just an index): `.field("idempotencyKey", v.string(), { unique: true })`. This closes the race window between check and insert. My Section 4.2 schema gains this field marker.
5. **Bounce classification** (my §13 research item 3): resolved via `event.data.bounce` in the component's `vEmailEvent` validator at [node_modules/@convex-dev/resend/src/component/lib.ts:837](../node_modules/@convex-dev/resend/src/component/lib.ts:837). W7 plan's research item 3 narrows to: confirm the exact `bounce_type` enum values and the soft-vs-hard split on live Resend webhooks.
6. **TTL policy for `emailEvents`**: 90 days for most templates; 365 days for `welcome-onboarding`; 7 days for `dev-capture`. W7 owns a daily `cleanupOldEmailEvents` cron. See spike §4.4 table.
7. **`@convex-dev/resend` retry behavior** documented: workpool-outer retry with `maxAttempts: 5, initialBackoffMs: 30000, base: 2`; permanent error codes at [node_modules/@convex-dev/resend/src/component/lib.ts:59](../node_modules/@convex-dev/resend/src/component/lib.ts:59). W7 plan does not add its own retry layer.

`/plan` unblocks. W5 and W6 plans also unblock (via the shared utility and the `emailEvents` producer-insert contract).

---

**End of W7 brainstorm. Stopping here for Eric's review before `/plan`.**
