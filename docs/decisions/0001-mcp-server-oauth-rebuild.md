# 0001 — MCP server: rebuild on official SDK with Clerk OAuth

- Status: accepted
- Date: 2026-06-10
- Issue: CROWDEV-54

## Context

The original `/api/mcp` endpoint was a hand-rolled JSON-RPC POST handler. It
pinned protocol `2024-11-05`, replied to JSON-RPC *notifications* (breaking the
`notifications/initialized` handshake), and authenticated only short-lived
(~60s) Clerk **session** JWTs with no issuance flow — so no stock MCP client
(Claude Code, Claude Desktop) could connect end to end. It also passed the raw
session JWT through to Convex as the data-auth token.

## Decision

Rebuild on the maintained stack:

- **Transport/protocol**: `mcp-handler` (Vercel) — streamable HTTP (+ optional
  SSE) at `app/api/[transport]/route.ts`, public URL **`/api/mcp`**.
- **Auth**: OAuth 2.1 with **Clerk as the authorization server**.
  `withMcpAuth` + `@clerk/mcp-tools/next` `verifyClerkToken`
  (`auth({ acceptsToken: 'oauth_token' })`). OAuth metadata served from
  `/.well-known/oauth-protected-resource/api/mcp` and
  `/.well-known/oauth-authorization-server`. Clients self-register via Clerk's
  **dynamic client registration** (dashboard toggle, per Clerk instance).
- **Data path**: Clerk OAuth access tokens are opaque to Convex, so the route
  no longer forwards user tokens to Convex. Instead a server-to-server
  **bridge**: Next tool handlers POST to the Convex HTTP action
  `/mcp-tools` authenticated by `MCP_BRIDGE_SECRET` (set on both the Convex
  deployment and Vercel). The bridge resolves the user by Clerk `externalId`
  and dispatches to shared, ownership-scoped query helpers
  (`creditCards/shared.ts`, `transactions` helpers) — the same logic backing
  the public app queries, so MCP and the app cannot drift.
- **Tools** (unchanged surface): `list_credit_cards`, `get_credit_card`,
  `get_credit_card_stats`, `list_transactions`, preserving the
  `amountFormatted`/`direction` dual-convention payloads (CROWDEV-368).
- **Rate limiting**: the existing per-user/per-token token bucket
  (CROWDEV-460) runs inside every `tools/call`.

## Consequences

- Stock clients connect: `claude mcp add --transport http <origin>/api/mcp`
  (OAuth browser flow) — see `docs/mcp.md`.
- New prerequisites: Clerk DCR enabled per instance; `MCP_BRIDGE_SECRET` on
  the Convex deployment and Vercel envs.
- `proxy.ts` must keep `/api/*` pass-through and exempt `/.well-known/*`
  from the marketing redirect (OAuth discovery is unauthenticated).
- The old `lib/mcp/auth.ts` + `lib/mcp/server.ts` and the hand-rolled route
  are deleted; `lib/mcp/types.ts` + `lib/mcp/rate-limit.ts` are kept.

## Alternatives considered

- **Polish the hand-rolled route** — less work, but auth stays demo-grade and
  the transport remains non-compliant; rejected by product decision.
- **Convex-hosted MCP (httpAction serving MCP directly)** — keeps everything
  in Convex but loses `mcp-handler`'s transport/session handling and Clerk's
  first-party OAuth glue; revisit if the Next layer ever disappears.
- **Custom JWT provider in Convex for OAuth tokens** — Clerk OAuth access
  tokens are opaque (introspected via Clerk's API), not verifiable JWTs.
