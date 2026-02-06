# TODO

## Alpha Launch Checklist

### 1. Landing Page & Brand Identity
- [x] Define SmartPockets aesthetic (clean & approachable, green brand, confident tone)
- [ ] Finish customizing landing page (LandingPage07 template) in `apps/web`
  - Services dropdown: Credit card management active, Transactions and Form 568 as "coming soon" (greyed out)
- [ ] Add alpha banner/badge making it clear the app is in early access
- [ ] Add custom SmartPockets favicons to `apps/web` and `apps/app`

### 2. Marketing → App Architecture
- [ ] Move landing page from `apps/app` to `apps/web`
- [ ] Configure subdomain routing (www → marketing, app → authenticated app)
- [ ] Set up Clerk auth handoff between domains
- [ ] Remove marketing components from `apps/app`
- [x] Update Vercel deployment config for both apps (preview deployments now use consistent Convex deployment)

### 3. App UI Refresh
- [ ] Apply SmartPockets aesthetic to authenticated app
- [ ] Update dashboard, card detail, wallet views
- [ ] Ensure consistency between marketing and app styling

### 4. Transactional Emails
- [x] Apply SmartPockets branding to email templates (green palette, company name, text logo fallback)
- [x] Set up Resend domain (`mail.smartpockets.com`) — DNS pending verification
- [x] Update Convex env vars (`EMAIL_DOMAIN`, `RESEND_API_KEY`) for dev
- [x] Remove stale `INNGEST_EVENT_KEY` from Convex dev
- [ ] Update Convex env vars for production once PR merges
- [ ] Remove stale `INNGEST_EVENT_KEY` from Convex production
- [ ] Host SP logo image and update `logoUrl` in email-config.ts
- [ ] Test each email end-to-end (verification, password reset, magic link, invite)
- [ ] Set up Resend webhook for delivery tracking (`RESEND_WEBHOOK_SECRET`)

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

---

## Credit Cards Feature

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
