# Transaction management in Copilot Money and Monarch Money: the complete feature inventory

SmartPockets can leapfrog both Copilot Money and Monarch Money by combining Copilot's AI-driven categorization and polished daily review UX with Monarch's powerful rules engine, CSV import, and collaboration features — while closing the gaps each app leaves open. **Neither app offers amount-range filtering on transactions, transfer-pair matching, or a true rules management UI combined with ML categorization.** These represent the clearest whitespace opportunities. Below is the exhaustive feature-by-feature inventory across all 15 transaction management dimensions, drawn from official help centers, power-user Reddit threads, independent reviews, and App Store feedback.

**Platform and pricing context:** Copilot is Apple-only (iOS, iPadOS, macOS, web) at **$95/year**. Monarch is cross-platform (web, iOS, Android) at **$99.99/year**. Both require subscriptions with no free tiers.

---

## 1. How each app displays and organizes the transaction feed

**Copilot Money** shows a chronological, date-grouped transaction list across all linked accounts. Each row displays merchant name, amount, category, account, and date, with letter badges marking transaction types: **"I" for income, "R" for recurring, "T" for internal transfer**. Tapping a transaction opens a detail view with editable fields and, on Mac/iPad, a "Similar Transactions" panel showing same-merchant spending totals. New transactions carry a light-blue "unreviewed" indicator, and the Dashboard surfaces a "To Review" section capped at 25 items. The web app (launched September 2025) adds keyboard navigation (arrow keys, ⌘+F search), bulk selection, and filtered transaction metrics showing total spent, total income, and net. Pending transactions appear in the feed, though some users report date issues when pending-to-posted transitions occur, particularly with American Express.

**Monarch Money** similarly presents a unified, date-grouped chronological list. A June 2024 update added category and account columns directly in the main list for faster scanning. A collapsible summary panel on the web shows aggregate totals for any filtered view. Clicking a transaction expands an inline detail view (rather than navigating to a new screen) with all editable fields. Sorting options include date and amount in both directions, with mobile achieving parity with web in mid-2024. Manual transactions can be added to any account with debit/credit toggle. Monarch warns against editing pending transactions — a toggle in Settings > Preferences controls this, off by default — because matching pending to posted versions is unreliable and edits may be lost.

**SmartPockets opportunity:** Neither app supports custom grouping in the main feed (by merchant, category, or tag). Neither offers true infinite scroll with virtualized rendering documentation. Both lack a "compare to bank statement" view that maps split children back to their parent.

---

## 2. Categorization systems differ fundamentally in how AI and customization interact

**Copilot** operates a **two-level hierarchy** (Groups → Categories) that applies exclusively to "Regular" spending transactions. Income and internal transfers cannot be categorized — a significant limitation that forces power users to use tags as a workaround for income tracking. The "Other" category serves as an undeletable catch-all. Users can create unlimited custom categories with custom names, emojis (including Genmoji on supported iPhones since December 2024), and per-category budgets with optional rollover. Categories can be marked "Excluded" to remove them from spending totals.

Copilot's standout is **Copilot Intelligence**, a per-user private ML model that activates after reviewing approximately 30 transactions. It considers transaction name, amount, day of week, card used, and other signals, achieving roughly **85–90% accuracy** according to independent testing. When confident, it auto-applies categories; when uncertain, it surfaces its top two guesses at the front of the category picker. The model improves continuously with each review. This ML works across all categories, including custom ones.

**Monarch** uses the same two-level hierarchy (Groups → Categories) but supports categorization across all three transaction types: **income, expenses, and transfers**. It ships with approximately 60 default categories and supports unlimited custom categories with emoji icons and drag-and-drop reordering. Monarch's ML auto-categorization works well for default categories, but **custom categories do not benefit from machine learning** — users must create rules to sort transactions into custom categories. When investment transactions are enabled (a beta feature), two investment-specific categories are auto-created. Monarch also offers two budgeting paradigms: detailed per-category budgets or a broader "Flex" budgeting system with Fixed/Flexible/Non-monthly groupings.

**SmartPockets opportunity:** Build ML that learns custom categories (Copilot's approach) while also allowing income categorization (Monarch's approach). Neither app supports sub-sub-categories (three levels), which power users request for granular tracking like Food → Restaurants → Business Meals.

---

## 3. Rules and automation reveal the starkest gap between the two apps

**Copilot's rules system is its most criticized weakness.** Rules support only single-condition matching on transaction name — either exact match or partial/substring match. When creating a rule, Copilot previews affected transactions and applies changes retroactively. Rules can change category or transaction type. However, **there is no UI to view, edit, or delete existing rules** after creation. Users must contact support via in-app chat to modify rules. This has been the #1 user complaint for years, with highly upvoted Canny feature requests. Rules cannot match on amount, account, date range, or original statement text. There are no auto-split rules, no auto-tag rules, and no rule-based merchant renaming.

**Monarch's rules engine is dramatically more powerful.** Rules follow an If-Then structure with multiple conditions:

- **If conditions:** Merchant name (exactly matches or contains, against cleaned name or original statement text), amount (equals, greater than, less than, range between), specific categories, specific accounts
- **Then actions:** Rename merchant, update category, add one or more tags, hide transaction, set review status, link to a goal, and — critically — **auto-split transactions** (Smart Split, requiring Amount=Equals condition; splits by dollar or percentage)

Rules are fully managed in Settings > Rules with a **complete UI to view, edit, delete, and reorder** via drag-and-drop (web only for reordering). A preview tab shows what changes a rule would make before saving. The rule widget appears automatically when manually editing any transaction, offering to save the change as a rule. Rules run on every new non-pending transaction and can optionally apply retroactively to existing transactions.

**Key limitations in both:** Neither supports OR logic within a single rule (Monarch workaround: create multiple rules). Neither supports rules based on tags, notes, or date ranges. Monarch's Smart Split requires exact amount matching, so variable-amount transactions cannot be auto-split. Copilot has no compound conditions at all.

**SmartPockets opportunity:** Combine Copilot's ML-first approach (auto-categorize without rules) with Monarch's rule power (multi-condition, multi-action, manageable UI). Add OR logic, tag-based conditions, date-range conditions, and variable-amount Smart Split. A visible, editable rules dashboard is table stakes.

---

## 4. Search and filtering capabilities favor Monarch for power users

**Copilot** offers text search across transaction names and merchants, with ⌘+F global search on Mac. Filters include account, category, date, recurring status, review status, tag, and transaction type — these can be combined simultaneously. Sorting works by date or amount. The web app calculates and displays filtered totals. Copilot Intelligence adds **natural language search** that translates conversational queries into filters. However, Copilot lacks an **amount-range filter** and has **no saved filter presets**.

**Monarch** provides broader filtering with options for: date range, category (multi-select), account (multi-select), amount range, tags, merchant, debit/credit, hidden/not-hidden, synced/manual, has attachments, has splits, has notes, and needs review (by specific person or anyone). Search covers merchant names and notes. While the Transactions page doesn't support saved filters directly, Monarch's **Reports section supports saved reports** with custom filter configurations, interactive charts, and the signature **Sankey cash flow diagram** (web only) — a flow visualization where width represents dollar amounts flowing from income sources to expense categories. Reports can be saved for one-click access and shared with financial planners.

**SmartPockets opportunity:** Offer amount-range filtering (neither has it on the transaction page), saved filter presets on the transaction list itself, and the ability to filter by original statement text directly in the UI (Monarch only supports this in rules). Combine Copilot's natural language search with Monarch's filter breadth.

---

## 5. Split transactions show Monarch pulling ahead with automation and receipt scanning

**Copilot** supports manual splitting from the transaction detail view. Each child transaction gets its own amount, category, and date — enabling both cross-category splits and date-spreading (e.g., splitting a 6-month insurance premium into monthly portions). Splits can be edited or undone by removing children. However, there are **no automatic split rules**, no percentage-based splitting, no split indicator in the transaction list, and no way to split across people natively. Power users request auto-split matching with reimbursement transactions (e.g., splitting rent and auto-matching the Venmo payback).

**Monarch** offers the same manual splitting plus three powerful automated capabilities:

- **Smart Split via rules** (August 2024): Create rules that auto-split transactions by dollar amount or percentage. Requires exact amount matching. Each split can have its own category and tags. Applies retroactively optionally.
- **Receipt Scanning** (late 2024/Winter 2025): Upload a receipt photo on mobile, AI parses line items, and the transaction auto-splits by category. Taxes distribute proportionally; fees split evenly. The receipt image attaches automatically. Mobile-only, one image per upload.
- **Retail Sync Chrome Extension** (May 2025): Syncs Amazon and Target order history, uses AI (Google Gemini) to analyze individual items, auto-splits and categorizes transactions using custom categories, and adds item-level notes. Supports 24-hour background auto-sync.

Monarch also launched **Bill Split** (2025) for social splitting: scan a receipt, share a link or QR code with dining companions, participants claim their items, and Venmo integration handles payment. Non-Monarch users can participate.

**SmartPockets opportunity:** Combine receipt scanning with rule-based auto-splitting for variable amounts (neither app handles this). Add person-level splitting with reimbursement tracking built in. Show a split indicator badge in the transaction list (Copilot users specifically request this).

---

## 6. Recurring transaction management takes different architectural approaches

**Copilot** detects recurring charges during onboarding and lets users confirm suggestions. Each recurring has configurable smart filters: transaction name (partial matching), amount range, expected date range, and frequency. This enables differentiating multiple subscriptions from the same merchant (e.g., two Apple subscriptions with different amounts). At month start, **recurring expected spend is pre-allocated into category budgets**, so discretionary spending reflects reality from day one. The dedicated Recurrings tab shows This Month (paid/unpaid), In the Future, Paused, and Archived views. Recurrings can be paused, archived, or deleted without affecting underlying transactions. A notable limitation: **recurring transactions cannot be excluded from spending**, and recurring income is not supported.

**Monarch** auto-detects recurring items and presents them in a review flow before adding. The Recurring page offers list and calendar views — calendar entries are color-coded green (paid as expected), yellow (different amount), and red (missed/overdue). **Bill Sync via Spinwheel** connects to credit reports for automatic statement balance and due-date syncing on credit cards and loans, with auto-marking as paid when matching transactions appear. However, **each merchant can only have one recurring transaction** — multiple identical-merchant subscriptions require workarounds with variant merchant names. Past-due items are hidden from the calendar, which confuses some users.

**SmartPockets opportunity:** Support multiple recurrings per merchant without workarounds (Monarch's limitation). Allow recurring income tracking (Copilot's gap). Combine Copilot's budget pre-allocation with Monarch's calendar visualization and bill sync. Add customizable payment reminders with configurable lead times.

---

## 7. Tags, notes, and attachments reveal Monarch's richer metadata model

**Copilot** launched tags in June 2024 with custom names and colors. Tags can be applied to all transaction types (Regular, Income, Internal Transfer) — unlike categories, which only work on spending. Multiple tags per transaction are supported, with bulk apply/remove. Tags are filterable in the Transactions tab. However, **tags cannot be applied via rules** (manual only), cannot be used in automation, have no budget tracking, and cannot be added during manual transaction creation (only after saving). Notes are free-text fields included in CSV export, but some users report bugs with notes copying between linked transactions. **Receipt/image attachments are not supported.**

**Monarch** offers a more mature tagging system: multiple tags per transaction with custom colors, manageable in Settings > Tags. Critically, **tags can be auto-applied via rules**, enabling powerful automation (e.g., auto-tag all transactions over $500 as "Large Purchase"). Default tags are auto-created for household members. System tags include "Retail Sync" and "Receipt Import" for automated workflows. Tags are importable via CSV. Notes are searchable in transaction search and auto-populated by Retail Sync with item details and order links. Attachments support up to **3 images per transaction** (web and mobile) plus PDFs (web only), with receipt scanning auto-attaching captured images. A "has attachments" filter exists for finding documented transactions.

**SmartPockets opportunity:** Combine auto-tagging rules (Monarch) with universal tag applicability (both apps do this). Add tag-based budgets and spending reports. Support unlimited attachments with OCR search across receipt text. Allow tags as rule conditions (neither app supports this).

---

## 8. Merchant management is an area where both apps leave significant room for improvement

**Copilot** allows manual editing of transaction display names and shows merchant logos via Plaid's enriched data. The Mac/iPad "Similar Transactions" panel provides basic merchant-level insight by showing same-name transactions and monthly spending totals. However, there is **no dedicated merchant management page**, no merchant merging, no persistent merchant renaming across all transactions (name rules affect categorization only), and no custom merchant logos.

**Monarch** is more capable here. A **merchant merge feature** in Settings > Merchants scans for duplicates and consolidates variations (e.g., "WHOLEFDSMRKT" and "Whole Foods Market"). Users can **upload custom images/logos** for merchants and accounts. Rules can auto-rename merchants based on original statement text. Merchant details are editable from the transaction detail view. Reports can filter by specific merchants for spending analysis over time.

**SmartPockets opportunity:** Build a comprehensive merchant directory with automatic fuzzy-matching and merge suggestions, custom logos, merchant-level spending dashboards, and merchant-specific notification preferences. Neither app offers merchant-level insights as a first-class feature — this is whitespace.

---

## 9. Transaction editing and review workflows differ in collaboration depth

Both apps allow editing date, name/merchant, category, tags, and notes on transactions. Neither allows editing the amount of synced transactions. Both support bulk editing on web (Monarch also on mobile). Both offer a reviewed/unreviewed status system.

**Copilot** displays an unreviewed indicator throughout the app and surfaces new transactions in a Dashboard "To Review" section. The web app supports bulk actions: change category, review status, transaction type, and apply/remove tags. Transactions can be excluded via an "Exclude" category. There is **no flag/star feature** and **no undo for bulk changes**. Synced transactions cannot be deleted — only excluded.

**Monarch** adds depth through **assignable review status** ("Needs review by [specific person]" or "by Anyone"), **Swipe to Review** on mobile (August 2024) for quick gesture-based review, and **rule-based review automation** (e.g., auto-mark transactions over $500 as needing review). The hide/unhide toggle removes transactions from budgets and cash flow while keeping them in the list — filterable via "Hidden Only." Rules can pre-hide transactions before they appear, enabling **gift-privacy in shared households**. Bulk delete is available on web. Email and push notifications trigger for transactions needing review.

**SmartPockets opportunity:** Combine Copilot's frictionless daily review UX with Monarch's collaborative review assignments. Add an undo/history feature for transaction edits (neither app offers this). Implement a flag/star system for quick marking.

---

## 10. Investment transactions are handled as a separate domain by both apps

**Copilot** keeps investment activity in a dedicated Investments tab, completely separated from the spending Transactions tab. Holdings are consolidated by ticker across accounts, showing last price (15-minute delay), equity, quantity, allocation, average cost, and total return. A "Live Balance Estimates" feature bridges daily institution updates with near-real-time market data. Benchmarking against S&P 500 is available per account. Manual investment accounts support adding specific securities and logging buy/sell movements. Integration with Public provides near-real-time portfolio updates. **No historical backfill** is possible — tracking starts from the connection date. No tax lot tracking or capital gains calculation exists.

**Monarch** treats investment transactions as an opt-in beta feature. When enabled in Household Preferences, investment transactions sync to the main Transactions page alongside spending, which can **distort budgets** — 401(k) contributions appear as debits, creating confusing cash flow reports. Two investment-specific categories are auto-created. Investment CSV import is supported for historical data. Equity compensation tracking (RSUs, stock options) launched in Winter 2025. Holdings, performance, and allocation are tracked separately. Reddit users report this feature generates the most complaints due to connection issues, particularly with Fidelity accounts.

**SmartPockets opportunity:** Offer toggleable investment transaction visibility in the main feed (Monarch's approach) with automatic budget exclusion (solving Monarch's distortion problem). Support historical backfill (Copilot's gap). Add tax lot tracking and capital gains estimation.

---

## 11. Transfer detection relies on categorization rather than intelligent matching

**Copilot** has a dedicated "Internal Transfer" transaction type that auto-excludes from budgets. Plaid attempts automatic detection, and users can manually reclassify with rule suggestions. However, **transfer pairs are not matched** — each side is a separate, unlinked transaction. Manual accounts require creating two separate manual transactions for each transfer. There is no duplicate management UI beyond Plaid's built-in deduplication, though Apple Card CSV import includes duplicate detection.

**Monarch** handles transfers through the "Transfers" category type, which excludes from budgets and cash flow. **Zelle, Venmo, and check payments are frequently miscategorized as transfers** when they are actually expenses — this is repeatedly cited as a major user pitfall that hides real spending. No automatic matching of transfer pairs between accounts exists. The Transfer Tool helps merge duplicate accounts (not individual transactions). CSV import offers three modes to manage duplicates: Prioritize CSV, Prioritize Monarch, or Import All.

**SmartPockets opportunity:** Build intelligent **transfer-pair matching** that automatically links corresponding debits and credits across accounts — neither app does this. Add smart detection that distinguishes P2P payments from account transfers (solving Monarch's Zelle/Venmo problem). Implement a dedicated duplicate management dashboard.

---

## 12. Import and export capabilities heavily favor Monarch

**Copilot** exports to CSV with fields including date, name, amount, pending/posted status, category, parent category, excluded flag, transaction type, account, account mask, notes, and associated recurrings. Filtered export is available on Mac/iPad/Web. However, **generic CSV import is not supported** — only Mint data import (launched February 2024) and Apple Card CSV import exist. This is among the most upvoted feature requests on Copilot's Canny board. Users with institutions not on Plaid are effectively locked out. No API access exists.

**Monarch** offers robust CSV import (web only) with flexible column auto-mapping via keywords, multi-account support in a single file, and three import priority modes. Required columns are date, merchant, amount, and account, with optional category, tags, notes, and original statement fields. A **10,000-transaction limit per file** applies. CSV exports include full metadata. Balance history import is available for filling net worth timeline gaps. A dedicated Mint Data Exporter Chrome extension (open-source on GitHub) handles Mint migration. The Retail Sync extension and community-built tools (RBC bank converter, MM-Tweaks Chrome extension for Excel export) extend data portability. **No public API** exists for either app.

**SmartPockets opportunity:** Offer CSV, OFX, QFX, and JSON import with intelligent column mapping and duplicate detection. Provide a public API for power users and integrations. Support unlimited transaction import (Monarch's 10K limit is a pain point). Enable scheduled automated exports.

---

## 13. Notification and alert systems are limited in both apps

**Copilot** offers five alert types: low balance (below $100, fixed), credit utilization (at 30%/60%/90%, fixed), big expense (over $500 non-recurring, **threshold not customizable**), weekly spending update (every Monday), and income notifications. Fraud activity alerts are also available. **No per-transaction push notifications** exist — users must check the Dashboard. Background App Refresh is recommended for timely alerts.

**Monarch** provides transaction review alerts (email and push), recurring transaction detection notifications, Bill Sync statement balance and due-date reminders, and budget overspending alerts. Large transaction notifications are configurable **via rules** (e.g., mark transactions over a custom threshold as "needs review," triggering a notification). This rule-based approach gives Monarch more flexibility than Copilot's fixed thresholds. Neither app offers SMS notifications or real-time per-transaction push alerts.

**SmartPockets opportunity:** Offer fully customizable alert thresholds, per-transaction real-time notifications, spending velocity alerts ("you've spent $X in the last hour"), merchant-specific alerts, and multi-channel delivery (push, email, SMS). This is a surprisingly weak area in both competitors.

---

## 14. Multi-account handling and collaboration show Monarch's clear lead

Both apps connect to **10,000+ institutions** via Plaid, MX, and/or Finicity, supporting checking, savings, credit cards, loans, investments, crypto (Coinbase), and real estate (Zillow). Both offer manual accounts for unsupported institutions. Both present a unified transaction feed with account-level filtering.

**Copilot** provides a clean multi-device sync across iPhone, iPad, Mac, and Web. Accounts can be hidden from display without unlinking. Direct integrations exist for Venmo, Amazon, Apple Card/Cash/Savings, Coinbase, and Public. **No shared or family accounts** are supported — Copilot is strictly single-user.

**Monarch** supports **unlimited household members at no extra cost**, each with their own login and full visibility. The October 2025 **Shared Views** update introduced "Mine/Yours/Ours" ownership labels for accounts and transactions, with filtering across the entire app by ownership. Review assignments can target specific household members. Three data providers (Plaid, MX, Finicity) allow switching if one provider fails for a particular institution. However, there is **no per-account privacy between household members** — everyone sees everything.

**SmartPockets opportunity:** Offer household collaboration with configurable per-account privacy (neither app supports this). Allow selective visibility so partners can keep certain accounts private. Support different budget views per household member.

---

## 15. Unique and power-user features that define each app's identity

**Copilot's differentiators** center on design polish and AI. Its per-user ML model provides genuinely useful auto-categorization that improves continuously without rule creation. The morning "To Review" ritual takes 2–3 minutes and is described by long-term users as enjoyable. Budget rebalancing via the "magic wand" suggests reallocations based on actual patterns. Savings Goals (May 2025) use AI to suggest targets based on cash flow. The Amazon in-app browser integration enriches transaction details beyond raw bank data. Privacy-first architecture with end-to-end encryption and optional iCloud-only sync appeals to security-conscious users. The app won an Apple Design Award nomination in 2024.

**Monarch's differentiators** center on power and extensibility. The **Retail Sync Chrome Extension** is genuinely unique — syncing Amazon and Target order histories, using AI to identify individual items, auto-splitting and categorizing transactions at the item level, and adding order details as notes. The **Sankey cash flow diagram** provides an intuitive visualization of money flow. The **AI Assistant** (Winter 2025) answers conversational questions about spending patterns across the full dataset. A thriving ecosystem of **community Chrome extensions** (MM-Tweaks for advanced reporting, Splitwise integration, credit card points tracking) extends functionality. Bill Sync via Spinwheel automates credit card and loan statement tracking. The Flex budgeting paradigm offers a simpler alternative to per-category tracking.

**Critical gaps in both apps that represent SmartPockets opportunities:**

- **No public API** — prevents custom integrations, IFTTT workflows, or programmatic access
- **No transfer-pair matching** — both treat each side of a transfer as independent
- **No amount-range filtering on the transaction list** (Copilot lacks it entirely; Monarch has it)
- **No three-level category hierarchy** — both cap at two levels
- **No undo/edit history** — accidental bulk changes cannot be reversed
- **No scheduled recurring income tracking** in Copilot
- **No ML on custom categories** in Monarch
- **No per-account privacy** in shared households for either app
- **No variable-amount auto-splitting** — Monarch's Smart Split requires exact matches
- **No cross-platform parity** — both have mobile-only and web-only features

---

## Conclusion: where SmartPockets can win

The competitive landscape reveals a clear pattern: **Copilot optimizes for daily delight with AI-first categorization, while Monarch optimizes for control with rule-first automation.** Neither has successfully combined both approaches. SmartPockets should build ML categorization that works across all categories (including custom ones and income) while exposing a full-featured, multi-condition rules engine with a visible management UI. The three highest-impact whitespace features are **intelligent transfer-pair matching**, **a public API for power-user integrations**, and **receipt-driven auto-splitting with variable amounts**. On the collaboration front, household accounts with configurable per-account privacy would leapfrog Monarch's all-or-nothing visibility model. Finally, real-time customizable alerts — from spending velocity warnings to merchant-specific notifications — represent an area where both incumbents are surprisingly weak, and where a new entrant can differentiate immediately.