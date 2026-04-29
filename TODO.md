# TODO

## Alpha Launch Checklist

### 1. Landing Page & Brand Identity

- [x] Define SmartPockets aesthetic (clean & approachable, green brand, confident tone)
- [x] Finish customizing landing page (LandingPage07 template) in `apps/web`
    - [x] Products dropdown: Credit card management active, Transactions and Form 568 as "coming soon" (greyed out, non-interactive)
    - [x] Remove Services dropdown
    - [x] Remove Pricing from header/footer/landing page
    - [x] Remove Careers, Help from footer
    - [x] Remove "Get the app" section with Apple/Google badges
    - [x] Remove 30-day free trial CTA
    - [x] Replace placeholder names with "Eric Crow"
    - [x] Extract Header + Footer into shared layout.tsx
    - [x] Add Privacy Policy page (`/privacy`)
    - [x] Add Terms & Conditions page (`/terms`)
- [x] Add alpha banner/badge making it clear the app is in early access
- [x] Add custom SmartPockets favicons to `apps/web` and `apps/app`

### 2. Marketing → App Architecture

- [x] Move landing page from `apps/app` to `apps/web`
- [ ] Configure subdomain routing (www → marketing, app → authenticated app)
- [ ] Set up Clerk auth handoff between domains
- [ ] Remove marketing components from `apps/app`
- [x] Update Vercel deployment config for both apps (preview deployments now use consistent Convex deployment)
- [x] Document Graphite PR preview verification and Clerk preview environment requirements

### 3. App UI Refresh

- [ ] Apply SmartPockets aesthetic to authenticated app
- [ ] Update dashboard, card detail, wallet views
- [ ] Ensure consistency between marketing and app styling

### 4. Transactional Emails

- [x] Apply SmartPockets branding to email templates (green palette, company name, text logo fallback)
- [x] Set up Resend domain (`mail.smartpockets.com`) DNS pending verification
- [x] Update Convex env vars (`EMAIL_DOMAIN`, `RESEND_API_KEY`) for dev
- [x] Remove stale `INNGEST_EVENT_KEY` from Convex dev
- [x] W7 stack shipped: 8 agentic templates, dispatch API, workflows,
      preferences page, unsubscribe route, suppression, crons
      (see docs/W7-email-rollout.md for prod preconditions)
- [ ] Update Convex env vars for production (`RESEND_WEBHOOK_SECRET`,
      `EMAIL_UNSUBSCRIBE_SIGNING_KEY`) once W7 PRs merge
- [ ] Remove stale `INNGEST_EVENT_KEY` from Convex production
- [ ] Drop SP logo PNGs in apps/web/public/email-assets/
- [ ] Register Resend webhook at prod convex.site/resend-webhook
- [ ] Run internal.email.internal.backfillEmailsFromClerk once in prod
- [ ] Smoke send weekly-digest to verify end-to-end

### 5. Clerk Pro Setup

- [ ] Ensure all Clerk Pro features are utilized and wired up correctly
- [ ] Apply SmartPockets branding to Clerk auth screens
- [ ] Verify MFA configuration

### 6. Newsletter Setup

- [ ] Research midday repo newsletter pattern (identify which service they use)
- [ ] Wire up landing page newsletter subscription form
- [ ] Test newsletter signup and delivery end-to-end

### 7. Blog (Optional)

- [ ] Decide whether to include blog section for launch
    - Post idea: Plaid Convex component — secure fintech via vibe coding, how it isolates security concerns so builders don't have to worry about common pitfalls
    - Good for Hacker News / Convex community traction and doubles as a portfolio piece

### 8. Alpha UX Polish

- [ ] Audit Plaid connection flow error states and edge cases (2FA failures, timeouts, etc.)
    - First-run bank connection experience is make-or-break for alpha testers
    - [ ] Integrate personal `analytics-sdk` package with PostHog
    - Use PostHog's survey/feedback features for alpha user feedback collection
    - This replaces the need for a separate feedback form/button

### 9. Pricing & Payments

- [ ] Configure Clerk billing for ~$5/month alpha pricing
- [ ] Add pricing page to marketing site
- [ ] Set up payment flow and subscription management
- [ ] Add "Alpha" badge/disclaimer on pricing
- [ ] Test billing end-to-end (signup → payment → subscription active)

### 10. Open Source Prep

- [x] Add AGPLv3 LICENSE file
- [x] Rewrite README.md (11-section design — hero, features, tech stack, roadmap, getting started, etc.)
- [x] Create CONTRIBUTING.md (commit conventions, code style, PR guidelines)
- [x] Clean up stale git branches (19 branches deleted — local + remote)
- [x] Fix outdated doc references (shadcn → UntitledUI, pnpm/npm → bun)
- [x] Design open source positioning (personal finance platform, not just churning tracker)
- [ ] Verify wallet drag-and-drop, pin, lock/autopay toggles are fully functional
- [ ] Add screenshots/video to README hero section
- [x] Landing page redesign — updated copy reflecting personal finance platform positioning
- [ ] Figma UI Kit — full design system artifact
- [ ] Self-hosting guide (Docker setup)
- [ ] Set up GitHub Discussions
- [ ] Hosted version — managed deployment with Plaid costs included
- [x] Document safe Codex Cloud install/check/propose environment

---

## Credit Cards Feature

### Enhanced Details Tab — Follow-ups

Branch: `enhanced-credit-card-details-tab` (pending PR)

**Bugs/polish:**
- [x] APR Breakdown: Show all 3 standard rows (Purchase, Cash Advance, Balance Transfer) even when balance is $0 — establishes visual expectation
- [x] APR Breakdown: Add weighted average APR headline ("Effective APR: X.XX%") above the table
- [x] ISB messaging: Check purchase APR before showing "pay in full to avoid interest" — at 0% APR the urgency is misleading

**Next priority:**
- [x] Build promo rate create form (replace "Coming soon" button with inline form)
- [ ] Build installment plan create/edit form
  - Must support Chase Equal Pay promos and installment plans from real statements
  - Reference: Chase Amazon statement with 2 promos + 2 installment plans

### Editable Card Details

Branch: `editable-card-details`

- [x] Override Map pattern — `userOverrides` field on creditCards schema
- [x] InlineEditableField component (Figma-style double-click to edit)
- [x] Editable Account Details (Official Name, Account Name, Issuer)
- [x] Editable APR fields (APR %, Balance Subject, Interest Charged)
- [x] Editable promo expiration dates with override tracking
- [x] Manual promo rate creation (Add button functional)
- [x] Provider Dashboard link in card header
- [x] Right-click "Revert to Plaid value" context menu
- [x] Sync-safe — Plaid syncs preserve user overrides

**Follow-ups:**
- [ ] Extend override pattern to transactions (merchant names, categories)
- [ ] Add manual installment plan creation (similar to manual promos)

### Swipeable Card Carousel

Enable users to swipe between credit card detail pages horizontally, similar to the American Express app carousel experience.

#### Requirements

- **Swipe Navigation**: Users can swipe left/right on the credit card component to navigate between cards
- **Visual Indicators**: Pagination dots or similar indicator showing current position and total cards
- **Smooth Transitions**: Fluid animations between card transitions
- **Gesture Support**: Touch swipe on mobile, drag on desktop, keyboard arrow navigation for accessibility
- **State Preservation**: Maintain scroll position and tab state when returning to a card

#### Implementation Considerations

- Use a gesture library (e.g., `framer-motion`, `react-swipeable`, or native touch events)
- Preload adjacent card data for instant transitions
- Consider URL updates on swipe (e.g., `/credit-cards/[cardId]`) vs. client-side state
- Handle edge cases: single card (no swipe), loading states, error states

#### Reference

- **Amex App**: Horizontal card carousel with swipe between accounts
- Similar patterns: Apple Wallet, Google Pay card switcher

---

### Export Transactions (Coming Soon)

The export transactions feature is currently disabled pending research.

#### Research Required

Before implementing transaction exports / statement downloads, research is needed to understand what information each credit card provider includes in their statements:

- **Chase** - What fields are included in Chase statement exports?
- **American Express** - What fields are included in Amex statement exports?
- **Capital One** - What fields are included in Capital One statement exports?
- **Discover** - What fields are included in Discover statement exports?
- **Citi** - What fields are included in Citi statement exports?
- **Bank of America** - What fields are included in BofA statement exports?
- **Wells Fargo** - What fields are included in Wells Fargo statement exports?

#### Goal

Ensure our transaction exports and statement downloads contain all of the information that each individual credit card provider includes in their exports. Users should be able to get the same (or more) data from SmartPockets as they would from their card issuer directly.

#### Fields to Compare

- Transaction date
- Post date
- Merchant name
- Merchant category
- Amount
- Running balance
- Reference/confirmation numbers
- Rewards earned
- Foreign transaction fees
- Statement period
- Payment due date
- Minimum payment
- Interest charges

---

## UI/UX Fixes & Cleanup

- [x] Fix money-unit display bug by standardizing Plaid/account/card amounts on milliunits with boundary conversion

### Sidebar Logo

- [x] Fix logo to minimize and change to "SP" when sidebar is collapsed
    - Reference: Currently shows full "Smart" text even when collapsed (see attached screenshot)

### Dashboard Aesthetic

- [ ] Cleanup SmartPockets dashboard to look more aesthetic
    - Run brainstorming session to identify specific improvements

### Settings Cleanup

- [x] Thoroughly cleanup settings page - remove all non-functional items
- [x] Remove dead links and unnecessary options
- [x] Decide on search settings functionality:
    - **Option A**: Remove "search settings" entirely ✓ (implemented)
    - **Option B**: Improve aesthetics/UX in a superpowers session
    - **Option C**: Integrate settings search as a subtab/subsearch within main search
    - Research: Is unified search with settings subsection better UX than separate settings search?

---

## Technical Debt

### UntitledUI Migration

- [ ] Remove and replace all references to untitledui
    - Audit all component imports
    - Identify replacement components/patterns
- [ ] Convert to using `@untitledui/icons` package
    - Replace any custom or third-party icon usage with UntitledUI icons
    - Audit all icon imports across `apps/app` and `packages/ui`
    - Ensure bunfig.toml registry auth is working (`$UNTITLEDUI_TOKEN`)

### Plaid Production Fix

- [ ] Fix Plaid Convex component not working in production
    - Debug production-specific issues
    - Verify environment variables and webhook configuration

---

## Multi-Profile / Organizations Architecture

> **Requires Deep Research Session**

### Problem Statement

Need to figure out the best way to implement multiple profiles (personal vs. business) and how organizations fit in.

### Research Questions

- [ ] Should organizations be optional or required?
- [ ] Use Clerk Organizations vs. Convex Ents for multi-profile?
- [ ] How to structure profiles so users can have:
    - Personal profile (default)
    - Business profile (optional)
    - Organization access (higher subscription tiers)
- [ ] What pricing tiers make sense?
    - Free tier capabilities
    - Paid tier with multi-profile
    - Premium tier with organizations

### Implementation Options to Research

1. **Clerk Organizations** - Built-in org management, roles, invitations
2. **Convex Ents "profiles"** - Custom implementation, more flexibility
3. **Hybrid** - Personal profiles in Convex, orgs via Clerk for collaboration

### Session Plan

- [ ] Deep research session with Claude on architecture
- [ ] Consult on pricing tier structure
- [ ] Document decision and rationale

### Implementation

- [ ] Implement optimal multi-profile setup based on research findings
