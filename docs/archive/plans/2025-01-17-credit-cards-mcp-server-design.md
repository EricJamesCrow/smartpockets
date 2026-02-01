# Credit Cards MCP Server Design

**Date:** 2025-01-17
**Status:** Implemented (2025-01-17)
**Author:** Claude + Eric

## Overview

An MCP (Model Context Protocol) server embedded in the Next.js app that allows AI assistants (Claude Desktop, etc.) to query credit card data with user session authentication.

## Goals

- Enable AI assistants to answer questions like "What's my total balance?" or "Which card has the highest APR?"
- Production-ready with proper Clerk authentication passthrough
- Read-only access for safety (write operations can be added later)
- Full data exposure: balances, APRs, due dates, payment history, transactions

## Architecture

```
┌─────────────────┐      ┌──────────────────────────────────┐
│  Claude Desktop │      │  Next.js App (Vercel)            │
│  or AI Client   │◄────►│                                  │
└─────────────────┘      │  /api/mcp (MCP endpoint)         │
                         │      │                           │
                         │      ▼                           │
                         │  Clerk Auth (token verify)       │
                         │      │                           │
                         │      ▼                           │
                         │  Convex Queries                  │
                         │  - creditCards.list              │
                         │  - creditCards.get               │
                         │  - creditCards.getStats          │
                         │  - transactions.list             │
                         └──────────────────────────────────┘
```

**Key decisions:**
- Embedded in Next.js app (not standalone process)
- Uses existing Clerk auth via session tokens
- Queries existing Convex functions (no new backend code)
- Deploys automatically with the app to Vercel

## MCP Tools

### `list_credit_cards`

Returns all active credit cards with complete data.

**Parameters:** None

**Returns:** Array of cards, each containing:
- Identity: `id`, `accountId`, `displayName`, `company`, `brand`, `lastFour`
- Balances: `currentBalance`, `availableCredit`, `creditLimit`, `utilization`
- Payment info: `minimumPaymentAmount`, `nextPaymentDueDate`, `isOverdue`
- Last statement: `lastStatementBalance`, `lastStatementIssueDate`, `lastPaymentAmount`, `lastPaymentDate`
- APRs: Full array with `aprPercentage`, `aprType`, `balanceSubjectToApr`, `interestChargeAmount`
- Status: `isLocked`, `syncStatus`, `lastSyncedAt`
- Summary: AI-friendly narrative of the card data

### `get_credit_card`

Get detailed info for a single card.

**Parameters:**
- `cardId` (required) - The credit card ID

**Returns:** Same fields as `list_credit_cards` for one card

### `get_credit_card_stats`

Aggregated overview across all cards.

**Parameters:** None

**Returns:**
- `totalBalance` - Sum of all current balances
- `totalAvailableCredit` - Sum of available credit
- `totalCreditLimit` - Sum of all credit limits
- `averageUtilization` - Average utilization percentage
- `overdueCount` - Number of overdue cards
- `cardCount` - Total number of active cards
- `narrative` - AI-friendly summary

### `list_transactions`

Recent transactions for a card.

**Parameters:**
- `cardId` (required) - The credit card ID
- `startDate` (optional) - Start of date range, defaults to 30 days ago
- `endDate` (optional) - End of date range, defaults to today

**Returns:** Array of transactions with date, merchant, amount, category

## File Structure

```
apps/app/src/
├── app/
│   └── api/
│       └── mcp/
│           └── route.ts        # MCP protocol handler (POST endpoint)
│
└── lib/
    └── mcp/
        ├── server.ts           # MCP server setup & tool registration
        ├── tools/
        │   ├── index.ts        # Export all tools
        │   ├── list-credit-cards.ts
        │   ├── get-credit-card.ts
        │   ├── get-credit-card-stats.ts
        │   └── list-transactions.ts
        └── types.ts            # MCP-specific types
```

## Authentication Flow

### Token Generation

1. User visits `/settings/integrations` in the app
2. Clicks "Generate MCP Token" - creates a long-lived Clerk session token
3. Token is displayed once for user to copy
4. User configures Claude Desktop with the token

### Request Verification

```
Claude Desktop
    │
    ▼ POST /api/mcp
    │ Headers: { Authorization: Bearer <clerk-session-token> }
    │
    ▼
route.ts
    │ clerkClient.verifyToken(token)
    │ → returns userId
    │
    ▼
Convex queries with userId context
```

### Security

- Tokens scoped to the user who created them
- Tokens can be revoked from settings page
- Each Convex query verifies data ownership
- HTTPS enforced in production
- No data leakage in error messages

## Error Handling

| Error Type | MCP Response |
|------------|--------------|
| Invalid/expired token | "Authentication required" |
| Card not found | "Card not found" |
| Card belongs to another user | "Card not found" (no info leak) |
| Convex query fails | "Failed to fetch data" (logged internally) |
| Invalid parameters | Specific validation message |

## Response Formatting

Responses include structured data plus AI-friendly narratives:

```typescript
// list_credit_cards response
{
  cards: [...],
  summary: "You have 3 credit cards with a total balance of $4,250.00 and 78% average utilization."
}

// get_credit_card_stats response
{
  totalBalance: 4250.00,
  totalCreditLimit: 15000.00,
  averageUtilization: 0.283,
  overdueCount: 1,
  narrative: "Total balance $4,250 across 3 cards. 1 card is overdue. Average utilization is 28.3%."
}
```

## Client Configuration

### Claude Desktop Config

Users add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "credit-cards": {
      "url": "https://ai-chatbot-untitledui-three.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer <their-token>"
      }
    }
  }
}
```

### Settings Page UI

Add "Claude Integration" section to `/settings/integrations`:
- Connection status indicator
- "Generate Token" button with one-time display
- List of active tokens with revoke option
- Copy-paste config snippet with token pre-filled

### Local Development

Point to `http://localhost:3000/api/mcp` with a dev token.

## Dependencies

- `@modelcontextprotocol/sdk` - Official MCP TypeScript SDK
- Existing Clerk + Convex setup (no new auth/data dependencies)

## Future Enhancements

- Write operations (lock/unlock cards, update display names)
- Additional tools (payment reminders, spending analysis)
- Webhook for real-time notifications to AI
- Multiple MCP server profiles (credit cards, transactions, budgets)

## Implementation Order

1. Install MCP SDK dependency
2. Create `/api/mcp/route.ts` with basic protocol handling
3. Add Clerk token verification
4. Implement `list_credit_cards` tool
5. Implement `get_credit_card` tool
6. Implement `get_credit_card_stats` tool
7. Implement `list_transactions` tool
8. Add token generation UI to settings page
9. Test with Claude Desktop
10. Deploy and verify production
