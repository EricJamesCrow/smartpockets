# W7 email production rollout

> Source-of-truth spec: [specs/W7-email.md §15](../specs/W7-email.md). This doc
> is the operator checklist; keep the two in sync.

## Preconditions (all must be green before final merge)

1. **DNS.** `mail.smartpockets.com` SPF + DKIM + DMARC verified; Resend
   domain status "verified".
2. **Prod Convex env vars** (`vercel env` or Convex dashboard):
   - `RESEND_API_KEY`
   - `RESEND_WEBHOOK_SECRET`
   - `EMAIL_DOMAIN=mail.smartpockets.com`
   - `APP_NAME=SmartPockets`
   - `EMAIL_UNSUBSCRIBE_SIGNING_KEY` (64 hex chars; generate with
     `openssl rand -hex 32`)
   - `CLERK_SECRET_KEY` (for backfill action)
   - Optionally: `EMAIL_DEV_OVERRIDE_TO` (only for smoke tests)
3. **Remove** stale `INNGEST_EVENT_KEY` from prod Convex.
4. **Resend webhook endpoint** registered at
   `https://<prod-deployment>.convex.site/resend-webhook` with events:
   `email.sent, email.delivered, email.bounced, email.complained, email.opened,
   email.clicked, email.delivery_delayed`.
5. **Logo hosted** at `https://smartpockets.com/email-assets/logo.png`
   (`Content-Type: image/png`, 200). Redeploy `apps/web` after dropping the PNG.
6. **Clerk email backfill** executed once:
   `await internal.email.internal.backfillEmailsFromClerk({})` returns
   `{ updated: N, missing: 0 }`.
7. **Smoke send**: live weekly-digest to `EricCrow@pm.me` with
   `EMAIL_DEV_LIVE=true` verifies delivery, logo render, list-unsubscribe.
8. **CodeRabbit** clean on every PR in the W7 stack.

## Env gating cheat sheet

| `EMAIL_DEV_LIVE` | `EMAIL_DEV_OVERRIDE_TO` | Behavior                     |
| ---------------- | ----------------------- | ---------------------------- |
| unset            | (ignored)               | dev-capture (synthetic id)   |
| `true`           | unset                   | live send to real recipient  |
| `true`           | `<addr>`                | live send, rewritten to addr |

Production auto-detected via `CONVEX_DEPLOYMENT` starting with `prod:`.

## Post-merge rollback

All schema changes are additive. Rolling back means reverting the
Graphite stack and leaving the new ents tables populated (harmless).
Unsubscribe tokens signed by the rolled-back key become invalid; clients
with queued links see 400.

## Known TODOs after stack lands

- Replace the `email/workflow.ts` shim with
  `new WorkflowManager(components.workflow)` when W2's
  `@convex-dev/workflow` install PR merges. Workflow step ordering is
  already correct; migration is an import swap and a helper shape change.
- Wire W4 consumers: `exchangePublicTokenAction` calls
  `dispatchWelcomeOnboarding`; Plaid webhook calls
  `dispatchReconsentRequired`; 24h sustained-error cron calls
  `dispatchItemErrorPersistent`.
- Wire W6 consumers: promo countdown cron calls `dispatchPromoWarning`;
  statement reminder scan calls `dispatchStatementReminder`; anomaly
  detector calls `dispatchAnomalyAlert` per event; subscription catch-up
  calls `dispatchSubscriptionDigest`; weekly digest cron assembles
  payload from W6 intelligence tables.
