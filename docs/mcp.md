# SmartPockets MCP Server

SmartPockets exposes your credit card data to MCP clients (Claude Code, Claude
Desktop, or anything speaking [MCP](https://modelcontextprotocol.io)) over
**streamable HTTP with OAuth 2.1**, using Clerk as the authorization server.

- **Endpoint:** `https://app.smartpockets.com/api/mcp` (or your own origin)
- **Auth:** OAuth 2.1 with dynamic client registration — no API keys to manage.
  Clients self-register, you approve access in the browser as the SmartPockets
  user, and tokens are scoped to your account.
- **Architecture:** `mcp-handler` + `@clerk/mcp-tools` in the Next.js app; tool
  data flows through a secret-authenticated Convex bridge that reuses the same
  ownership-scoped query logic as the app itself. See
  [`docs/decisions/0001-mcp-server-oauth-rebuild.md`](decisions/0001-mcp-server-oauth-rebuild.md).

## Tools

| Tool | Args | Returns |
|------|------|---------|
| `list_credit_cards` | — | All active cards: balances, limits, APRs, payment info |
| `get_credit_card` | `cardId` | One card's full detail (ownership-checked) |
| `get_credit_card_stats` | — | Totals, average utilization, overdue/locked counts |
| `list_transactions` | `cardId`, `startDate?`, `endDate?` | Transactions (default last 30 days) |

Transaction amounts follow the SmartPockets dual-convention contract: `amount`
(Plaid sign), `displayAmount` (human sign), `amountFormatted` (copy verbatim,
e.g. `"+$550.47"`), and `direction` (`inflow`/`outflow`) — so client models
never have to reason about Plaid's inverted sign rule.

## Connect with Claude Code

```bash
claude mcp add --transport http smartpockets https://app.smartpockets.com/api/mcp
```

Then run any tool (e.g. ask "list my credit cards"). The first call opens a
browser window for the OAuth consent flow; sign in with your SmartPockets
account and approve.

## Connect with Claude Desktop

Settings → Connectors → **Add custom connector** → URL
`https://app.smartpockets.com/api/mcp`. Complete the OAuth flow when prompted.

## Probe with curl

```bash
# Unauthenticated requests get a 401 that points at the OAuth metadata:
curl -i -X POST https://app.smartpockets.com/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
# → 401 with WWW-Authenticate: Bearer resource_metadata="…/.well-known/oauth-protected-resource/api/mcp"

curl -s https://app.smartpockets.com/.well-known/oauth-protected-resource/api/mcp | jq
```

A full manual token flow requires an OAuth client; use an MCP client rather
than raw curl for authenticated calls.

## Self-hosting prerequisites

1. **Clerk**: enable **Dynamic Client Registration** on your Clerk instance
   (Dashboard → OAuth Applications settings). Without it, stock MCP clients
   cannot self-register.
2. **Bridge secret**: generate a long random value and set `MCP_BRIDGE_SECRET`
   on **both** the Convex deployment (`bunx convex env set MCP_BRIDGE_SECRET …`)
   and the app's Vercel/`.env.local` environment. The Next.js MCP route uses it
   to call the Convex `/mcp-tools` HTTP action server-to-server after verifying
   the client's OAuth token. Never expose it to browsers or MCP clients.
3. (Optional) `CONVEX_SITE_URL` if your Convex HTTP actions domain isn't
   derivable from `NEXT_PUBLIC_CONVEX_URL` (`.convex.cloud` → `.convex.site`).

## Rate limits

`tools/call` is limited per user **and** per token (token bucket: burst 40,
~30/min refill). Exceeding it returns a tool error with `retry in Ns`.

## Local development

```bash
bun dev   # app on :3000, backend, marketing site
claude mcp add --transport http smartpockets-local http://localhost:3000/api/mcp
```

The dev Clerk instance must also have dynamic client registration enabled, and
the dev Convex deployment needs `MCP_BRIDGE_SECRET` set.
