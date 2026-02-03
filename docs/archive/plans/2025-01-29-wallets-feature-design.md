# Wallets Feature Design

## Overview

Wallets are user-created collections for organizing credit cards. The feature centers on a dedicated `/wallets` page with pinnable wallets that appear in the sidebar for quick access.

## Core Behaviors

- A card can belong to multiple wallets (many-to-many)
- Deleting a wallet removes associations but not the cards
- Wallets can be pinned to the sidebar for quick access
- Manual drag-and-drop ordering for both page and sidebar

---

## Data Model

### `wallets` table

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `Id<"users">` | Owner reference |
| `name` | `string` | Display name |
| `isPinned` | `boolean` | Whether visible in sidebar |
| `sortOrder` | `number` | Position on /wallets page |
| `pinnedSortOrder` | `number` | Position in sidebar (when pinned) |
| `color` | `string?` | Optional accent color |
| `icon` | `string?` | Optional emoji/icon |

### `walletCards` junction table

| Field | Type | Description |
|-------|------|-------------|
| `walletId` | `Id<"wallets">` | Reference to wallet |
| `creditCardId` | `Id<"creditCards">` | Reference to card |
| `sortOrder` | `number` | Order within wallet |
| `addedAt` | `number` | Timestamp when added |

### Computed Stats (query-time)

- Total balance across cards in wallet
- Total credit limit
- Total available credit
- Average utilization percentage

---

## /wallets Page

### Layout

- Page header: "Wallets" title + "Create Wallet" button
- Details toggle in top-right corner
- Grid of wallet cards, drag-and-drop reorderable

### Wallet Card Visual

**Collapsed (details off):**
- Card stack appearance: 2-3 credit cards stacked with slight offset, top portions peeking out
- Wallet name below stack
- Card count badge (e.g., "4 cards")
- Three-dot dropdown menu (Rename, Delete, Pin/Unpin)

**Expanded (details on):**
- Same card stack visual
- Financial summary below:
  - Total Balance / Total Credit Limit
  - Total Available Credit
  - Average Utilization (color-coded: green/yellow/red)

### Interactions

**Hover:**
- Cards animate upward, fanning out from the stack
- Spring animation for satisfying feel
- Shows brand logos and last 4 digits of each card

**Click:**
- Navigates to `/credit-cards?wallet={walletId}`

---

## Sidebar Integration

### Location

- "Wallets" section in left sidebar
- Positioned near "Credit Cards" nav item
- Only appears if user has pinned wallets

### Pinned Wallet Item

**Collapsed:**
- Wallet icon/color dot + name
- Chevron on right to expand
- Click name → `/credit-cards?wallet={walletId}`
- Click chevron → expand to show cards

**Expanded:**
- Nested list of cards in wallet
- Each card: brand icon, name, last 4 digits
- Click card → `/credit-cards/{cardId}`
- Indented to show hierarchy

### Ordering

- Drag-and-drop reorderable within sidebar
- Order independent from /wallets page order

---

## Adding Cards to Wallets

### Single Workflow: From Wallet Detail View

When viewing `/credit-cards?wallet={walletId}`:

1. "Add Cards" button in filter bar area
2. Opens slideout panel from right
3. Shows all user's cards NOT in this wallet
4. Scrollable list with checkboxes
5. Select cards → "Add to Wallet" button
6. Slideout closes, view refreshes

### Removing Cards

- When viewing a wallet filter, cards can be removed
- Option in card dropdown menu or via selection
- Removes junction entry only, card persists

---

## Credit Cards Page Filtering

### URL Structure

- `/credit-cards` - All cards
- `/credit-cards?wallet={walletId}` - Cards in specific wallet

### Filter Bar Changes

- Wallet indicator chip when filter active (name + dismiss X)
- Click X → clears filter, shows all cards
- "Add Cards" button appears when viewing a wallet
- Existing filters (brand, status, etc.) stack with wallet filter

### Empty Wallet State

- "This wallet is empty" message
- Prominent "Add Cards" button

---

## Wallet Creation & Management

### Creating a Wallet

Location: "Create Wallet" button on /wallets page

Modal contents:
- Wallet name (required)
- Color picker (optional, preset colors)
- Icon/emoji picker (optional)

New wallets are unpinned by default.

### Dropdown Menu Actions

- **Rename** - Inline edit or modal
- **Pin to Sidebar / Unpin** - Toggles visibility
- **Delete** - Confirmation: "Delete [name]? Cards will not be deleted."

### Empty States

- `/wallets` with no wallets: Illustration + "Create your first wallet" + button
- Empty wallet (in filtered view): "This wallet is empty" + "Add Cards" button

### Limits

- Max 20 wallets per user
- No limit on cards per wallet
- No limit on pinned wallets

---

## User Flows

### Creating and Pinning a Wallet

1. Navigate to `/wallets`
2. Click "Create Wallet"
3. Enter name, optionally pick color/icon
4. Wallet appears in grid
5. Open dropdown → "Pin to Sidebar"
6. Wallet appears in sidebar

### Adding Cards to a Wallet

1. Click wallet (or pinned sidebar item) → `/credit-cards?wallet=X`
2. Click "Add Cards" button
3. Slideout opens showing available cards
4. Check cards to add
5. Click "Add to Wallet"
6. Cards appear in filtered view

### Quick Access via Sidebar

1. See pinned wallet in sidebar
2. Click chevron to expand
3. See cards inside
4. Click card → go to card detail page
5. Or click wallet name → go to filtered card list
