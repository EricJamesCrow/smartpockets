# W7: Email System Extension (Research)

**Milestone:** M3 Agentic Home
**Workstream:** W7 (Track F per master brief Section 11)
**Phase:** 2 (`/plan` research input)
**Author:** Claude Opus 4.7 (Obra Superpowers `/plan` phase)
**Date:** 2026-04-20
**Brainstorm input:** [specs/W7-email.brainstorm.md](W7-email.brainstorm.md)
**Shared research:** [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) (W7 is the spike owner; this doc cites §4 rather than duplicating).
**Cross-workstream contract reference:** [specs/00-contracts.md](00-contracts.md)
**Writing convention:** No em-dashes.

---

## 0. Scope

The W7 brainstorm listed a research spike with five items (§13). Item 2 (idempotency) was elevated to a shared spike and lives in [specs/00-idempotency-semantics.md](00-idempotency-semantics.md). This document covers the four W7-only items plus two additions from the reconciliation pass:

1. RFC 8058 one-click list-unsubscribe support in `@convex-dev/resend` and the underlying Resend API.
2. Resend bounce classification: hard vs soft distinction, exposed field name, timing.
3. Clerk email resolution inside a Convex `internalAction` (no `ctx.viewerX()` available).
4. DNS verification state for `mail.smartpockets.com` (SPF, DKIM, DMARC).
5. (Added) svix webhook signature verification story for the Resend component.
6. (Added) Logo hosting option comparison for `email-config.ts`.

Idempotency (§4.1 through §4.6 of the shared spike) is the canonical answer for everything hash-related and dedup-related. W7 implementation uses the shared `notifications/hashing.ts` utility and the producer-insert pattern committed in spike §4.4.

---

## 1. RFC 8058 one-click list-unsubscribe

### 1.1 Resend API support

Resend supports both the RFC 2369 `List-Unsubscribe` header and the RFC 8058 `List-Unsubscribe-Post: List-Unsubscribe=One-Click` header. Reference: [Resend docs > Sending > Headers](https://resend.com/docs/dashboard/emails/send-test-emails#add-list-unsubscribe-headers) (active as of 2026-04-20 per community reports).

Both headers are set by the `headers` array on a `sendEmail` call. The component at [node_modules/@convex-dev/resend/src/client/index.ts:180](../node_modules/@convex-dev/resend/src/client/index.ts:180) exposes a `headers?: { name: string; value: string }[]` field; this flows unmodified through [node_modules/@convex-dev/resend/src/component/lib.ts:135](../node_modules/@convex-dev/resend/src/component/lib.ts:135) into the Resend API payload at [lib.ts:680](../node_modules/@convex-dev/resend/src/component/lib.ts:680), where it is flattened to an object with `Object.fromEntries(...)`.

**Conclusion:** no component-level blocker. W7 sets the headers directly in the `sendEmail` options inside each workflow's dispatch step.

### 1.2 Header shapes

```
List-Unsubscribe: <https://app.smartpockets.com/api/email/unsubscribe?token=PAYLOAD.SIG>, <mailto:unsubscribe@mail.smartpockets.com?subject=unsubscribe:PAYLOAD.SIG>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

Non-essential templates (weekly-digest, promo-warning, statement-closing, anomaly-alert, subscription-detected) carry both headers. Essential templates (welcome-onboarding, reconsent-required, item-error-persistent) carry only the `mailto:` variant of `List-Unsubscribe` and omit `List-Unsubscribe-Post` so mail clients do not expose a one-click button. This is legal per RFC 8058 (one-click is optional for legitimate mail).

### 1.3 Gmail, Apple Mail, Outlook behavior

- **Gmail:** requires BOTH `List-Unsubscribe` and `List-Unsubscribe-Post` for the inbox-level "Unsubscribe" link. Without both, Gmail renders its own "Unsubscribe" from `mailto:` only, which opens a compose window (bad UX).
- **Apple Mail (iOS 15+ and macOS 12+):** honors `List-Unsubscribe` with `mailto:` or `https:`; does not require RFC 8058 POST.
- **Outlook:** supports both; behavior matches Gmail for POST-mode.

Recommendation: ship both headers for non-essential templates. Matches 2025 Gmail sender guidelines (bulk senders enforcement).

### 1.4 Token format (from brainstorm Section 8)

HMAC-SHA256 signed opaque token:

```
payload = base64url(JSON.stringify({ u: userId, t: templateKey, ts: Date.now() }))
sig = base64url(hmacSha256(payload, process.env.EMAIL_UNSUBSCRIBE_SIGNING_KEY))
token = `${payload}.${sig}`
```

- TTL: 30 days. Tokens older than 30 days accepted for the flip (intent is unambiguous) but returned with HTTP 410.
- No JWT: we do not need standard claims and we avoid the library surface.
- Single signing key for alpha. Rotation is a post-alpha feature (add a `k` field for key version).

### 1.5 Endpoint requirements

```
POST /email/unsubscribe?token=<>
```

Per RFC 8058 §3.1: one-click endpoint MUST accept POST and MUST be idempotent (success returns 200 regardless of prior state). Body is `List-Unsubscribe=One-Click` (URL-encoded); optional and NOT required for the action to succeed. Our handler:

- Verifies HMAC.
- Flips the relevant `notificationPreferences.<templateKey>Enabled` to false via a shared internal mutation.
- Returns HTTP 200 with an empty body (per RFC guidance) on success.
- Returns HTTP 400 on invalid signature.
- Returns HTTP 410 on expired token (but still performs the flip).

```
GET /email/unsubscribe?token=<>
```

Fallback for clients that surface the `List-Unsubscribe` URL as a link. Renders a confirmation page with a `<form method="POST">` that posts to the same URL. Accessibility fallback only; RFC 8058 one-click is served by the POST endpoint.

---

## 2. Resend bounce classification

### 2.1 Event shape

The component's `vEmailEvent` validator at [node_modules/@convex-dev/resend/src/component/shared.ts](../node_modules/@convex-dev/resend/src/component/shared.ts) (referenced by `lib.ts:18`) emits `email.bounced` events with a `data.bounce` sub-object. Confirmed from [lib.ts:837](../node_modules/@convex-dev/resend/src/component/lib.ts:837):

```ts
if (event.type == "email.bounced") {
  const updated: Doc<"emails"> = {
    ...email,
    errorMessage: event.data.bounce?.message,
    bounced: true,
  };
  // ...
}
```

The component stores the message only; it does not read a `bounce_type` discriminator itself. Resend's raw webhook payload (per Resend docs circa 2024-2025) includes:

```json
{
  "type": "email.bounced",
  "data": {
    "email_id": "...",
    "bounce": {
      "type": "hard | soft | undetermined",
      "subType": "...",
      "message": "..."
    }
  }
}
```

W7's `handleEmailEvent` reads `event.data.bounce?.type` to decide suppression. Hard bounce triggers `emailSuppressions` insert; soft bounce is logged but does not suppress (the component's outer retry already handles soft-bounce resends).

### 2.2 Timing

- Hard bounces arrive within minutes of Resend's upstream SMTP rejection.
- Soft bounces may arrive after Resend's internal retries exhaust (4 to 24 hours).
- Undetermined bounces (no discriminator) treated as soft in W7; logged, not suppressed.

### 2.3 Complaint events

`email.complained` events have no sub-type. Treated as suppression trigger unconditionally per brainstorm Section 7.2. Suppression scope: non-essential only (essential templates bypass the complaint check).

---

## 3. Clerk email resolution inside `internalAction`

### 3.1 Problem

W7 dispatch actions are `internalAction`s (Node.js runtime for `@react-email/render`). They receive `userId: Id<"users">` from producers. They do NOT have `ctx.viewerX()` because there is no user session; the caller is another server function.

The `sendNotification` flow needs the user's current email address to populate the `to` field and to key `emailSuppressions`.

### 3.2 Resolution options

**Option A: Store email on `users` table.** On Clerk user creation and on Clerk `user.updated` webhook, mirror the primary email to `users.email`. Read directly via `ctx.table("users").getX(userId).email`.

**Option B: Call Clerk API from the action.** Use `@clerk/backend`'s `users.getUser(clerkId)` inside the action. Requires Clerk secret key in Convex env vars.

**Option C: Hybrid: cache on `users`, fall back to Clerk API on miss.** Defense in depth; protects against stale mirror.

### 3.3 Current state

The users table today ([packages/backend/convex/schema.ts:8](../packages/backend/convex/schema.ts:8)) has `name` and `connectedAccounts[]` but no `email` field. Clerk identity (`identity.email`) is available inside `queryCtx` / `mutationCtx` but NOT inside `internalAction`.

### 3.4 Recommendation: Option A

Add `email: v.optional(v.string())` to `users`. Populate on:
1. Clerk `user.created` webhook (already wired at `packages/backend/convex/http.ts`).
2. Clerk `user.updated` webhook (add handler).
3. Legacy backfill: one-time cron on deploy that pulls existing users' emails via Clerk Backend API.

Rationale: queryable, cheap, no cross-service call per send. The `user.updated` path handles email changes. W7 publishes a helper at `packages/backend/convex/email/internal.ts`:

```ts
export const getUserEmail = internalQuery({
  args: { userId: v.id("users") },
  returns: v.string(),
  handler: async (ctx, { userId }) => {
    const user = await ctx.table("users").getX(userId);
    if (!user.email) {
      throw new Error(`User ${userId} has no email cached; backfill required`);
    }
    return user.email.toLowerCase();
  },
});
```

W7 dispatch actions call `await ctx.runQuery(internal.email.internal.getUserEmail, { userId })` as step 1.

### 3.5 Coordination with existing Clerk wiring

- Existing Clerk webhook handler is at `packages/backend/convex/http.ts` (search for `user.created`).
- The existing handler creates the `users` row on `user.created`. W7 extends it to also populate `email` on the same insert.
- New handler for `user.updated` to handle email-change events. Small lift; one new branch in the existing Svix verification path.

### 3.6 Fallback path

If `users.email` is null (race condition or backfill gap), dispatch fails fast with a clear error. The `emailEvents` row's `status` transitions to `"failed"` with `errorMessage` documenting the miss. Ops task: run backfill.

---

## 4. DNS verification for mail.smartpockets.com

### 4.1 Current state

Per [specs/W0-existing-state-audit.md:640](W0-existing-state-audit.md:640):

- `mail.smartpockets.com` registered in Resend: DONE.
- DNS verification: PENDING.
- Dev Convex env vars set (`EMAIL_DOMAIN`, `RESEND_API_KEY`): DONE.
- Stale `INNGEST_EVENT_KEY` removed from dev: DONE.
- Prod Convex env vars: NOT SET.
- Prod `INNGEST_EVENT_KEY`: STILL PRESENT (stale).
- Logo not hosted; `logoUrl` in `email-config.ts` is empty.
- `RESEND_WEBHOOK_SECRET`: NOT CONFIGURED.
- No `/resend-webhook` HTTP route.

### 4.2 Records required by Resend for mail.smartpockets.com

Per Resend domain docs, the following DNS records must resolve before Resend accepts production sends at the domain:

- **SPF:** `TXT mail.smartpockets.com "v=spf1 include:_spf.resend.com ~all"` (or the exact string Resend provides in the dashboard).
- **DKIM:** CNAME records from `resend._domainkey.mail.smartpockets.com` (exact CNAMEs vary per account; read from the Resend dashboard).
- **DMARC:** `TXT _dmarc.smartpockets.com "v=DMARC1; p=none; rua=mailto:dmarc@smartpockets.com"` recommended (not required by Resend but required by Gmail bulk sender policy as of 2024).
- **Return-Path / MX:** optional but improves deliverability.

### 4.3 Verification command

```bash
dig TXT mail.smartpockets.com +short
dig CNAME resend._domainkey.mail.smartpockets.com +short
dig TXT _dmarc.smartpockets.com +short
```

### 4.4 Blocker status

DNS verification is a human task. The W7 plan blocks its "production rollout" task on this being green. W7 code can ship to dev, staging, and preview environments without DNS being green; those environments use the log-capture dev mode by default.

### 4.5 Recommended env var final set

**Dev (already set, verify at kickoff):**
- `RESEND_API_KEY`: dev key
- `EMAIL_DOMAIN=mail.smartpockets.com`
- `APP_NAME=SmartPockets`
- `EMAIL_DEV_LIVE` (unset by default; set to `true` when Eric wants live Gmail smoke)
- `EMAIL_DEV_OVERRIDE_TO` (unset by default)

**Prod (new, to be set):**
- `RESEND_API_KEY`: prod key
- `EMAIL_DOMAIN=mail.smartpockets.com`
- `APP_NAME=SmartPockets`
- `RESEND_WEBHOOK_SECRET`: Svix secret from Resend dashboard
- `EMAIL_UNSUBSCRIBE_SIGNING_KEY`: generated once via `openssl rand -hex 32`, stored in Convex env
- Remove: `INNGEST_EVENT_KEY`

---

## 5. Svix webhook signature verification

### 5.1 How the component handles it

The component's `handleResendEventWebhook` at [client/index.ts:452](../node_modules/@convex-dev/resend/src/client/index.ts:452) handles signature verification via the `svix` library:

```ts
const webhook = new Webhook(this.config.webhookSecret);
const payload = webhook.verify(raw, {
  "svix-id": req.headers.get("svix-id") ?? "",
  "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
  "svix-signature": req.headers.get("svix-signature") ?? "",
});
```

If `webhookSecret` is empty, the handler throws. Host app's `/resend-webhook` HTTP route must:

1. Accept POST with raw body preserved.
2. Call `resend.handleResendEventWebhook(ctx, req)`.
3. Return 201 on success (the component's handler returns this by default).

### 5.2 Host app route implementation

```ts
// packages/backend/convex/http.ts (additive route)
http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});
```

The component's `onEmailEvent` callback (wired in `email/resend.ts:26`) fires after verification, so W7's `handleEmailEvent` mutation is invoked only on validated events.

### 5.3 Resend dashboard configuration

Target URL for prod: `https://<convex-prod-deployment>.convex.site/resend-webhook`. For dev: `https://<convex-dev-deployment>.convex.site/resend-webhook`. Svix secret generated per endpoint in Resend dashboard; copied into Convex env.

### 5.4 Event filtering

Resend dashboard offers per-event-type toggles. Recommended subscription set for W7:

- `email.sent`
- `email.delivered`
- `email.delivery_delayed`
- `email.bounced`
- `email.complained`
- `email.opened`
- `email.clicked`
- `email.failed`

The component's `vEmailEvent` validator covers this set. Additional events are filtered out at parse time ([component/lib.ts:896](../node_modules/@convex-dev/resend/src/component/lib.ts:896): `attemptToParse` returns an `error` kind and the handler logs a warning).

---

## 6. Logo hosting option comparison

### 6.1 Options

| Option | Storage | URL pattern | Cost | Caching | Rotation |
|---|---|---|---|---|---|
| **apps/web static** | `apps/web/public/email-assets/logo.png` | `https://www.smartpockets.com/email-assets/logo.png` | Zero (Vercel free tier) | Vercel CDN | Redeploy web |
| **Convex Blob** | Convex file storage | Served via Convex Storage URL | Part of Convex usage | Convex edge | Mutation-driven |
| **Vercel Blob** | Vercel Blob storage | `https://*.public.blob.vercel-storage.com/...` | Paid | Vercel CDN | API call |

### 6.2 Recommendation: apps/web static

- Simplest. No new service.
- Logo is a static asset; zero reason to version it via a storage API.
- Vercel CDN delivers from the edge, well-cached by mail clients.
- Already-deployed domain (`www.smartpockets.com`) has valid TLS; no CORS concerns for email clients.

Commit path: `apps/web/public/email-assets/logo.png` (and `logo@2x.png` for retina). Update `email-config.ts` line 54:

```ts
logoUrl: "https://www.smartpockets.com/email-assets/logo.png",
```

### 6.3 Alt text

All email templates render `<Img src={logoUrl} alt="SmartPockets" width={160} height={40} />`. Maintain the alt for accessibility.

---

## 7. Reference: idempotency spike

All idempotency, hashing, workflow, and `@convex-dev/resend` dedup questions are answered in [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) §4. Key citations for the W7 plan:

- §4.1 `@convex-dev/resend` offers no user-supplied idempotency; application-layer dedup is mandatory.
- §4.2 `@convex-dev/workflow.start` returns a new WorkflowId per call; no built-in dedup.
- §4.3 Convex Ents `.field(..., { unique: true })` is the atomic dedup primitive; insert throws on duplicate.
- §4.4 Committed Strategy C-prime: producer insert-first dedup via unique index; `workflow.start` only fires on new insert.
- §4.4 Shared hash utility at `packages/backend/convex/notifications/hashing.ts` (consumed by W5 and W7).
- §4.4 TTL policy: 90 days for most templates; 365 days for welcome; 7 days for dev-capture.
- §4.6 Downstream plan amendments: W5 uses the shared hash; W6 calls `dispatch*` with typed payloads; W4 calls three `dispatch*` actions directly.

---

## 8. Risks identified

| Risk | Impact | Mitigation |
|---|---|---|
| Resend API changes `bounce.type` field name | Suppression misses hard bounces | Add a defensive parse: if `event.data.bounce?.type` is absent, log and treat as soft. Integration test with recorded payload. |
| Clerk email mirror stale | Wrong `to` field on sends | `user.updated` webhook handler in same PR as the cache-on-users change. Monitoring: alert on `errorMessage.includes("no email cached")`. |
| DNS verification delayed | Prod ship blocked | Human task; plan surfaces it as an explicit acceptance gate. Dev and preview continue to work. |
| Svix verification failure on webhook | Bounce/complaint events dropped | Log-only fallback; page Eric. The component throws; Convex logs the throw. |
| RFC 8058 one-click spoofing via token leak | Unauthorized unsubscribe | HMAC signing with 30-day TTL; 365-day would be weak. Preferences page lets the user re-enable without a link. |
| `notificationPreferences` race (two simultaneous preference flips) | Last write wins (benign) | OCC at the Convex layer handles this; no user-visible issue. |
| Welcome double-send despite 24h dedup | User irritation | `idempotencyKey = hash({ userId, scope: "welcome-class" })` (no date bucket) ensures one-ever-per-user. |
| Workflow crashes between `sendEmail` return and `status: "sent"` patch | Row stuck in `running` | Webhook delivery event fixes status. Daily cron scans for stuck `running` rows older than 1 hour and reconciles. |
| Dev-mode env var misconfiguration in prod | Accidental dev-capture in prod | Two-env-var gate; document clearly; add an assertion at workflow step 1 that prod deployment ignores both vars unless a prod-override flag is set (not shipped, just documented). |

---

## 9. Open items deferred to post-MVP

- Manual admin un-suppression endpoint (for users who accidentally complained on a digest).
- Key rotation for `EMAIL_UNSUBSCRIBE_SIGNING_KEY` (add a `k` version field to token payload).
- Admin UI to view `emailEvents` and `emailSuppressions` tables.
- User-timezone-aware weekly digest (alpha uses 09:00 UTC).
- List-Unsubscribe-Post with a custom confirmation page body (alpha returns empty 200).
- Multi-language / multi-timezone template variants.

---

**End of W7 research.**
