# Email Infrastructure Roadmap

This roadmap documents the complete email infrastructure implementation, including the migration from Inngest + Resend SDK to the unified Convex Resend Component.

## Architecture Overview

### Target Architecture (Convex Resend Component)

```
┌─────────────────┐    ┌─────────────────────────────────────────┐    ┌──────────┐
│  Clerk Webhook  │───▶│              Convex Backend              │───▶│  Resend  │
│  (email.created)│    │  ┌────────────────────────────────────┐  │    │  API     │
└─────────────────┘    │  │     @convex-dev/resend component   │  │    └──────────┘
                       │  │  • Built-in queueing & batching    │  │
                       │  │  • Automatic retries               │  │
                       │  │  • Idempotency management          │  │
                       │  │  • Rate limit handling             │  │
                       │  └────────────────────────────────────┘  │
                       └─────────────────────────────────────────┘
                                           │
                                  ┌────────▼────────┐
                                  │ Resend Webhook  │ (optional)
                                  │ (status events) │
                                  └─────────────────┘
```

### Current Architecture (to be migrated)

```
┌─────────────────┐    ┌───────────────┐    ┌────────────────┐    ┌──────────┐
│  Clerk Webhook  │───▶│ Convex HTTP   │───▶│ Inngest Cloud  │───▶│  Resend  │
│  (email.created)│    │ (forward)     │    │ (queue/retry)  │    │  API     │
└─────────────────┘    └───────────────┘    └────────────────┘    └──────────┘
                                                    │
                                           ┌────────▼────────┐
                                           │  Next.js App    │
                                           │  (send logic)   │
                                           └─────────────────┘
```

### Benefits of Migration

| Aspect | Before (Inngest) | After (Convex Component) |
|--------|------------------|--------------------------|
| Services | 3 (Convex, Inngest, Resend) | 2 (Convex, Resend) |
| Monthly cost | Inngest free tier + overages | $0 additional |
| Code location | Split (Next.js + Convex) | Unified (Convex only) |
| Queueing | Inngest managed | Convex workpools (built-in) |
| Idempotency | Manual | Automatic |
| Rate limiting | Manual | Automatic |
| Debugging | Two dashboards | One dashboard |
| Type safety | Partial | Full (Convex types) |

---

## Progress Summary

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Foundation Setup (templates, components, brand config) | ✅ Complete |
| 2 | Inngest Integration (queue, Clerk forwarding) | ✅ Complete (migrated away) |
| 3 | Template Suite (22 templates) | ✅ Complete |
| 4 | Convex Resend Component Setup | ✅ Complete |
| 5 | Email Service Layer Migration | ✅ Complete |
| 6 | Clerk Webhook Migration | ✅ Complete |
| 7 | Application Email Functions | ⏳ Optional (convenience wrappers) |
| 8 | Resend Webhook Integration | ⏳ Partial (handler ready, needs dashboard config) |
| 9 | Development Workflow | ⏳ Not verified |
| 10 | Cleanup & Testing | ✅ Complete (Inngest removed) |
| 11 | Loops Marketing Integration | 🔮 Future |

### Migration Status: Core Complete

The core email infrastructure has been migrated from Inngest to `@convex-dev/resend`:

**Implemented Files:**
- `convex/email/resend.ts` - Resend component client with config
- `convex/email/events.ts` - Delivery status event handler
- `convex/email/templates.ts` - React Email template renderer
- `convex/email/send.ts` - Core sending functions (`sendTemplatedEmail`, `sendHtmlEmail`, `sendTextEmail`)
- `convex/email/clerk.ts` - Clerk webhook email handler

**Cleanup Complete:**
- ❌ `apps/app/src/lib/inngest/` - Deleted
- ❌ `apps/app/src/lib/email/` - Deleted
- ✅ `packages/backend/convex/http.ts` - Updated to use new handler

---

## What's Already Built

### Email Templates (22 total)

Located in `packages/email/emails/`:

**Authentication (4):**
- `simple-verification.tsx` - OTP verification
- `password-reset.tsx` - Password reset link
- `magic-link.tsx` - Passwordless login
- `simple-invite.tsx` - Team/org invitation

**Billing (10):**
- `receipt.tsx` - Payment receipt
- `payment-failed.tsx` - Failed payment notification
- `payment-expiring.tsx` - Card expiring soon
- `subscription-created.tsx` - New subscription
- `subscription-upgraded.tsx` - Plan upgrade
- `subscription-downgraded.tsx` - Plan downgrade
- `subscription-cancelled.tsx` - Cancellation confirmation
- `trial-starting.tsx` - Trial began
- `trial-ending.tsx` - Trial ending soon
- `trial-ended.tsx` - Trial expired

**Welcome/Demo (8):**
- `simple-welcome-01.tsx` - Basic welcome
- `simple-welcome-02.tsx` - Welcome with features
- `image-welcome.tsx` - Welcome with image
- `video-welcome-01/02/03.tsx` - Welcome with video
- `mockup-01/02.tsx` - Product mockups

### Reusable Components

Located in `packages/email/emails/_components/`:
- `header.tsx`, `footer.tsx`, `button.tsx`, `text.tsx`
- `pricing-table.tsx`, `line-items.tsx`
- `head.tsx`, `body.tsx`, `tailwind.tsx`

### Current Inngest Integration

Located in `apps/app/src/lib/inngest/`:
- `client.ts` - Inngest client configuration
- `functions/send-email.ts` - Generic email sending
- `functions/clerk-email.ts` - Clerk webhook routing

### Convex Webhook Handler

Located in `packages/backend/convex/`:
- `http.ts` - Routes `email.created` to Inngest
- `email.ts` - `forwardToInngest` action

---

## Remaining Work: Atomic Session Breakdown

This migration should be broken into **atomic sessions** - each session is a self-contained unit of work that can be completed, tested, and committed independently.

### Session 1: Component Setup (~30 min)

**Goal:** Install and configure @convex-dev/resend

**Tasks:**
1. Install `@convex-dev/resend` in packages/backend
2. Update `convex/convex.config.ts` to register component
3. Set environment variables in Convex Dashboard:
   - `RESEND_API_KEY`
   - `EMAIL_DOMAIN`
   - `APP_NAME`
4. Deploy to verify configuration

**Commit:** `feat(email): add @convex-dev/resend component`

**Verification:** `npx convex deploy` succeeds

---

### Session 2: Resend Client & Event Handler (~45 min)

**Goal:** Create core Resend module

**Tasks:**
1. Create `packages/backend/convex/email/resend.ts`:
   - Initialize Resend component client
   - Configure test mode
   - Export client for other modules
2. Create `packages/backend/convex/email/events.ts`:
   - `handleEmailEvent` internal mutation
   - Log delivery status events

**Commit:** `feat(email): add Resend client and event handler`

**Verification:** Module exports correctly, no type errors

---

### Session 3: Template Renderer (~1.5 hours)

**Goal:** Create Node.js action to render React Email templates

**Tasks:**
1. Ensure `@repo/email` package is properly configured for import
2. Create `packages/backend/convex/email/templates.ts`:
   - Add `"use node"` directive
   - Import all 22 templates from `@repo/email`
   - Use `@react-email/render` to convert to HTML
   - Create template mapping

**Commit:** `feat(email): add template renderer action`

**Verification:** Can render a template to HTML string

---

### Session 4: Email Sending Actions (~1 hour)

**Goal:** Create core email sending functions

**Tasks:**
1. Create `packages/backend/convex/email/send.ts`:
   - `sendTemplatedEmail` - renders template then sends
   - `sendHtmlEmail` - sends raw HTML
   - Email configuration constants

**Commit:** `feat(email): add email sending actions`

**Verification:** Can send a test email

---

### Session 5: Clerk Email Handler (~1 hour)

**Goal:** Handle Clerk webhook emails in Convex

**Tasks:**
1. Create `packages/backend/convex/email/clerk.ts`:
   - `handleClerkEmail` internal action
   - Route slugs to templates:
     - `verification_code` → `simple-verification`
     - `reset_password_link` → `password-reset`
     - `magic_link` → `magic-link`
     - `organization_invitation` → `simple-invite`

**Commit:** `feat(email): add Clerk email handler`

**Verification:** Handler correctly maps slugs to templates

---

### Session 6: HTTP Webhook Migration (~45 min)

**Goal:** Update Convex HTTP routes

**Tasks:**
1. Modify `packages/backend/convex/http.ts`:
   - Change `email.created` case to call new handler
   - Add `/resend-webhook` route for delivery status
2. Remove Inngest forwarding logic

**Commit:** `feat(email): migrate Clerk webhook to Convex handler`

**Verification:** Clerk webhook calls new handler (test in development)

---

### Session 7: Application Email Functions (~1.5 hours)

**Goal:** Create reusable email actions for app use

**Tasks:**
1. Create `packages/backend/convex/email/actions.ts`:
   - `sendWelcomeEmail`
   - `sendTeamInvite`
   - `sendReceipt`
   - `sendPaymentFailed`
   - `sendTrialEnding`
   - `sendSubscriptionChange`

**Commit:** `feat(email): add application email actions`

**Verification:** Actions are callable from other Convex functions

---

### Session 8: Resend Webhook Integration (~30 min)

**Goal:** Enable delivery tracking

**Tasks:**
1. Set `RESEND_WEBHOOK_SECRET` in Convex Dashboard
2. Configure Resend Dashboard:
   - Add webhook endpoint
   - Select events: delivered, bounced, complained
3. Verify event handler receives events

**Commit:** `feat(email): configure Resend webhook integration`

**Verification:** Delivery events are logged

---

### Session 9: Development Workflow (~30 min)

**Goal:** Set up email preview server

**Tasks:**
1. Verify `packages/email/package.json` has dev script
2. Add root script for convenience:
   ```json
   "email:dev": "npm run dev --workspace=packages/email"
   ```
3. Document usage in CLAUDE.md

**Commit:** `chore(email): configure development workflow`

**Verification:** `npm run email:dev` starts preview server on port 3003

---

### Session 10: Cleanup (~1 hour)

**Goal:** Remove old Inngest-based implementation

**Tasks:**
1. Delete `apps/app/src/lib/inngest/` directory
2. Delete `apps/app/src/lib/email/` directory
3. Delete `apps/app/src/lib/resend.ts`
4. Delete `apps/app/src/config/email.ts`
5. Delete `packages/backend/convex/email.ts` (old forwarder)
6. Uninstall inngest from apps/app
7. Remove unused env vars from Next.js

**Commit:** `chore(email): remove Inngest-based implementation`

**Verification:** App still builds, no unused imports

---

### Session 11: Testing & Documentation (~1 hour)

**Goal:** Verify all email flows work

**Tasks:**
1. Test email flows:
   - Sign up (verification code)
   - Magic link login
   - Password reset
   - Team invitation
2. Update CLAUDE.md Email Infrastructure Status
3. Archive old roadmap documents

**Commit:** `docs(email): update documentation for Convex Resend`

**Verification:** All email types send successfully

---

## Environment Variables

### Convex Dashboard (Required)

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend API key |
| `RESEND_WEBHOOK_SECRET` | For delivery status tracking |
| `EMAIL_DOMAIN` | Verified sending domain |
| `APP_NAME` | App name for "from" field |

### Next.js (To Be Removed)

After migration, remove from `.env`:
- `RESEND_API_KEY` (moved to Convex)
- `INNGEST_EVENT_KEY` (no longer needed)
- `INNGEST_SIGNING_KEY` (no longer needed)

---

## File Changes Summary

### New Files (6)

| File | Purpose |
|------|---------|
| `convex/email/resend.ts` | Resend component client |
| `convex/email/events.ts` | Delivery status handler |
| `convex/email/templates.ts` | Template renderer (Node.js) |
| `convex/email/send.ts` | Core sending actions |
| `convex/email/clerk.ts` | Clerk webhook handler |
| `convex/email/actions.ts` | Application email functions |

### Modified Files (2)

| File | Changes |
|------|---------|
| `convex/convex.config.ts` | Register resend component |
| `convex/http.ts` | Update webhook handlers |

### Deleted Files (6+)

| File | Reason |
|------|--------|
| `apps/app/src/lib/inngest/*` | Replaced by Convex |
| `apps/app/src/lib/email/*` | Moved to Convex |
| `apps/app/src/lib/resend.ts` | Moved to Convex |
| `apps/app/src/config/email.ts` | Moved to Convex |
| `packages/backend/convex/email.ts` | Replaced |

---

## Template Mapping Reference

| Template File | Template Key | Clerk Slug |
|---------------|--------------|------------|
| `simple-verification.tsx` | `verification` | `verification_code` |
| `password-reset.tsx` | `password-reset` | `reset_password_link` |
| `magic-link.tsx` | `magic-link` | `magic_link` |
| `simple-invite.tsx` | `invite` | `organization_invitation` |
| `simple-welcome-01.tsx` | `welcome` | - |
| `simple-welcome-02.tsx` | `welcome-features` | - |
| `receipt.tsx` | `receipt` | - |
| `payment-failed.tsx` | `payment-failed` | - |
| `payment-expiring.tsx` | `payment-expiring` | - |
| `subscription-created.tsx` | `subscription-created` | - |
| `subscription-upgraded.tsx` | `subscription-upgraded` | - |
| `subscription-downgraded.tsx` | `subscription-downgraded` | - |
| `subscription-cancelled.tsx` | `subscription-cancelled` | - |
| `trial-starting.tsx` | `trial-starting` | - |
| `trial-ending.tsx` | `trial-ending` | - |
| `trial-ended.tsx` | `trial-ended` | - |

---

## Future: Loops Marketing Integration

**Status:** Preserved for later implementation

When ready, add marketing automation:
1. Install Loops SDK
2. Configure Clerk → Loops webhook for user sync
3. Set up marketing drip campaigns
4. Create subscriber management

Reference: Original Phase 5 in `docs/resend-email-implementation-roadmap.md`

---

## Rollback Plan

If issues arise during migration:

1. Restore deleted files from git:
   ```bash
   git checkout HEAD~1 -- apps/app/src/lib/inngest
   git checkout HEAD~1 -- apps/app/src/lib/email
   git checkout HEAD~1 -- packages/backend/convex/email.ts
   ```

2. Re-add Inngest dependencies:
   ```bash
   cd apps/app && npm install inngest
   ```

3. Update `convex/http.ts` to forward to Inngest again

4. Remove `@convex-dev/resend` from `convex.config.ts`
