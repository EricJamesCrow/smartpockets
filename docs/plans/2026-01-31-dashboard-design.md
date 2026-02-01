# SmartPockets Dashboard Design

## Overview

A financial command center dashboard for power users managing 8+ credit cards. Prioritizes urgency (payments due) first, followed by debt overview and credit health monitoring.

## Design Principles

- **Urgency-first**: Payments due and overdue surface immediately
- **Smart aggregation**: Summarize across many cards, drill down on demand
- **Glanceable**: Key metrics visible in 5 seconds
- **Actionable alerts**: Critical issues impossible to miss, minor indicators inline

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ CRITICAL ALERT BANNER (conditional - only when needed)      │
├─────────────────────────────────────────────────────────────┤
│  [Min. Payment]   [Total Balance]   [Utilization]           │
├───────────────────────────┬─────────────────────────────────┤
│   UPCOMING PAYMENTS       │      YOUR CARDS                 │
├───────────────────────────┼─────────────────────────────────┤
│   CONNECTED BANKS         │      SPENDING BREAKDOWN         │
├───────────────────────────┴─────────────────────────────────┤
│   RECENT TRANSACTIONS                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Section 1: Critical Alert Banner

**Purpose**: Surface urgent issues that require immediate action.

**Trigger conditions**:
- Payment is overdue (past due date)
- Payment due within 48 hours and not marked paid
- Bank connection broken/requires re-auth
- Card reported as compromised/locked externally

**Appearance**:
- Red background for overdue
- Amber for due soon
- Blue for connection issues

**Behavior**:
- Stacks if multiple alerts (max 3 visible, "+X more" link)
- "Dismiss" hides for 24 hours (doesn't clear underlying issue)
- Action button links to card issuer site or card detail page

**Not banner-worthy (inline indicators instead)**:
- Cards approaching 30% utilization
- Upcoming payments 3+ days away
- Pending transactions

---

## Section 2: Hero Metrics Row

Three cards side-by-side showing the most critical numbers.

### Minimum Due Card
- **Primary**: Sum of all minimum payments due in current billing cycle
- **Subtext**: "X cards this month"
- **Click action**: Scrolls to Upcoming Payments or opens payment breakdown modal

### Total Balance Card
- **Primary**: Sum of current balances across all credit cards
- **Subtext**: "across X cards"
- **Click action**: Scrolls to Your Cards section

### Utilization Card
- **Primary**: (Total balance / Total credit limit) x 100
- **Color coding**: Green (<30%), Amber (30-50%), Red (>50%)
- **Subtext**: Count of cards over 30% threshold
- **Click action**: Shows list of flagged cards

---

## Section 3: Upcoming Payments

Urgency-sorted list of cards with due dates.

### Visual Indicators
- Red dot: Due today or overdue
- Orange dot: Due within 3 days
- Yellow dot: Due within 7 days
- Gray dot: Due later this cycle
- Checkmark: Already paid (collapsed section at bottom)

### Row Content
- Card name
- "Auto" badge if autopay enabled
- Minimum payment amount
- Relative due date ("TODAY", "in 2 days", or actual date if 7+ days)

### Interaction
- Click row: Opens card detail with payment options
- "View all payments" link at bottom

---

## Section 4: Your Cards

Scrollable horizontal grid for 8+ cards.

### Card Tile Content
- Card network logo (Visa/MC/Amex/Discover)
- Card name
- Current balance
- Utilization bar (color-coded, flag icon if >30%)
- Payment status: due date or "Paid" checkmark
- Inline indicators: lock icon if locked, "Auto" badge if autopay

### Interaction
- Horizontal scroll to browse all cards
- Click card: Opens full card detail page
- "View all" link: Dedicated cards page with filtering/sorting

### Sorting Options (on full page)
- By due date (default)
- By balance (high to low)
- By utilization

---

## Section 5: Connected Banks

Institutions with nested accounts underneath.

### Institution Row
- Bank logo/icon
- Institution name
- Sync status: "Synced Xh ago" or warning indicator

### Nested Account Rows
- Account name
- Current balance
- Account type label (CC = credit card, DDA = checking/savings)

### Status Indicators
- Amber warning: Needs re-authentication
- Red: Sync failed repeatedly
- Grayed out: Connection inactive

### Interaction
- Click institution: Expand/collapse accounts
- "Manage" link: Goes to Settings > Institutions page
- Click account: Goes to card/account detail page

### Display Limits
- Show first 3-4 institutions
- "+X more" to expand or link to full page

---

## Section 6: Spending Breakdown

Pie chart showing spending by category.

### Header
- "Spending This Month" with total amount
- Comparison to last month (up/down arrow with difference)

### Pie Chart
- Largest category segment at 12 o'clock, clockwise by size
- Hover/tap segment: Highlights and shows percentage
- Consistent color palette across app

### Legend (right side)
- Colored dots matching pie segments
- Category name + dollar amount
- Top 5-6 categories, rest grouped as "Other"

### Controls
- Dropdown: This Month / Last Month / Last 90 Days
- "View details" link: Full spending analytics page

### Interaction
- Click category: Filters transactions to that category

---

## Section 7: Recent Transactions

Compact list of latest transactions across all cards.

### Grouping
- Grouped by day (Today, Yesterday, then dates)
- Most recent first

### Row Content
- Merchant name (enriched from Plaid when available)
- Card identifier (card name + last 4 digits)
- Amount (right-aligned)

### Pending Transactions
- Show with "Pending" label
- Slightly faded styling

### Display Limits
- Show 6-8 transactions
- "Showing X of Y this month" footer
- Scrollable within section if overflow

### Interaction
- Click transaction: Opens detail (full merchant info, category, date/time)
- "View all" link: Full transactions page with search/filter

---

## Data Requirements

All data available from existing Convex schema:

| Component | Data Source |
|-----------|-------------|
| Hero Metrics | `creditCards` table (balance, limit, minimum payment) |
| Upcoming Payments | `creditCards` table (due date, minimum, isPaid) |
| Your Cards | `creditCards` table + `walletCards` for organization |
| Connected Banks | `plaid:plaidItems` + `plaid:plaidAccounts` |
| Spending Breakdown | `plaid:plaidTransactions` (aggregated by category) |
| Recent Transactions | `plaid:plaidTransactions` (sorted by date) |
| Alert Banner | Derived from cards (overdue) + items (sync status) |

---

## Implementation Notes

### New Queries Needed
- `dashboard.getHeroMetrics` - Aggregated min due, total balance, utilization
- `dashboard.getUpcomingPayments` - Cards sorted by due date with status
- `dashboard.getSpendingByCategory` - Transaction aggregation for pie chart
- `dashboard.getAlerts` - Critical issues requiring banner

### Component Structure
```
/app/(app)/dashboard/
├── page.tsx                    # Dashboard page
├── components/
│   ├── AlertBanner.tsx         # Critical alerts
│   ├── HeroMetrics.tsx         # Three stat cards
│   ├── UpcomingPayments.tsx    # Payment list
│   ├── YourCards.tsx           # Card grid
│   ├── ConnectedBanks.tsx      # Bank/account tree
│   ├── SpendingBreakdown.tsx   # Pie chart
│   └── RecentTransactions.tsx  # Transaction list
```

### UntitledUI Components to Use
- Stat cards for Hero Metrics
- List components for Upcoming Payments, Transactions
- Card grid from existing patterns
- Chart component (or integrate lightweight chart library)
