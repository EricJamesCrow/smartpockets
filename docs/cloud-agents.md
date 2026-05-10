# Cloud Coding Agents — Setup Guide

Setup walkthrough for the three cloud-hosted coding agent platforms used with this repo:

| Platform | URL |
|---|---|
| Cursor Background Agents | `cursor.com/agents` |
| OpenAI Codex Cloud | `chatgpt.com/codex` |
| Claude Code on the Web | `claude.com/code` |

The local Cursor IDE, Codex CLI, and Claude Code CLI are out of scope here — this is only for the cloud-hosted agent surfaces dispatched from a browser or phone.

## Capability tier — Path A (mirror preview env)

Cloud agents run with the same env as a Vercel **Preview** deployment of `apps/app`:

- **Convex deployment**: `dev:canny-turtle-982` (the documented exception that runs `PLAID_ENV=production`)
- **Clerk**: development keys (`pk_test_*` / `sk_test_*`, dev FAPI domain)
- **Plaid**: production-mode (real account data flows through this Convex deployment)
- **Convex deploy key**: present, so agents can `convex deploy` against `dev:canny-turtle-982`

This is the simplest tier and matches how preview builds already operate. Two safer tiers if Path A turns out to be too much exposure:

- **Path B** — strip `CONVEX_DEPLOY_KEY` from each platform's env. Agents can call functions and run the app, but cannot push backend code or run `bunx convex dev --once`.
- **Path C** — provision a dedicated `dev:` Convex deployment with `PLAID_ENV=sandbox`. Agents never touch `dev:canny-turtle-982`. Add the new deployment to `PLAID_PROD_EXCEPTION_DEPLOYMENTS` in `apps/app/scripts/vercel-build.sh` is **not** needed because the new deployment runs sandbox Plaid.

## Repo artifacts (already in place)

| File | Role |
|---|---|
| `scripts/cloud-agent-setup.sh` | Idempotent bootstrap — installs Bun, runs `bun install`. All three platforms call it. |
| `.cursor/environment.json` | Tells Cursor Background Agents to call the bootstrap script. |
| `packages/backend/convex/_generated/` | Generated Convex types — committed, so `bun typecheck` and `bun build` pass on a fresh checkout. |

## Per-platform UI walkthrough

There is no CLI/API for managing cloud-session env on these platforms — each one is a one-time UI walkthrough.

### Cursor Background Agents

1. Open `cursor.com/agents` and sign in.
2. Authorize the Cursor GitHub app on `EricJamesCrow/smartpockets`.
3. Open the **Secrets** tab — Cursor's recommended path for env values (KMS-encrypted at rest, redacted in tool output). Paste each key from the [env checklist](#env-var-checklist).
4. **Environment** tab — `.cursor/environment.json` is auto-detected. If you ever switch to a Dockerfile-based environment, update both `.cursor/environment.json` and the Dockerfile.

### OpenAI Codex Cloud

1. Open `chatgpt.com/codex` → **Environments** → connect `EricJamesCrow/smartpockets` (requires the OpenAI GitHub app installed on the repo or org).
2. **Setup script** field — path-safe in case Codex's setup CWD isn't the repo root:
   ```bash
   cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" && bash scripts/cloud-agent-setup.sh
   ```
3. **Environment variables** section — paste each value from the [env checklist](#env-var-checklist) as a plain **environment variable**, not a "secret". Codex strips secrets before the agent phase starts, so anything the agent needs at runtime must be a plain env var.
4. **Maintenance script** — leave empty. The setup script is idempotent.

### Claude Code on the Web

1. Open `claude.com/code` and sign in.
2. Connect GitHub via either the Claude GitHub App on `EricJamesCrow/smartpockets` (recommended — enables auto-fix), or run `/web-setup` locally to sync your `gh` token.
3. Click the cloud icon → **Add environment**.
4. **Network access**: switch from "Trusted" to **Custom** and allowlist:
   - `*.convex.cloud`, `*.convex.site` (Convex)
   - `*.plaid.com` (Plaid; only if the agent will hit Plaid directly)
   - `*.clerk.accounts.dev` (Clerk dev FAPI)
5. **Setup script** field — uses `$CLAUDE_PROJECT_DIR` because setup runs from `~`, not the repo root:
   ```bash
   bash "$CLAUDE_PROJECT_DIR/scripts/cloud-agent-setup.sh"
   ```
6. **Environment variables** field — paste from the [env checklist](#env-var-checklist), one `KEY=value` per line.
7. The UI warns "don't add secrets" — this is about visibility to anyone editing the environment, which doesn't apply to a solo account. The values do flow into the sandbox.

## Env var checklist

Pull current preview values from Vercel:

```bash
TEMP="/tmp/sp-preview.env" && \
  npx vercel env pull --environment=preview "$TEMP" --yes && \
  cat "$TEMP" && \
  rm -f "$TEMP"
```

Paste the non-branch-scoped values. Skip any keys the Vercel CLI shows as scoped to a specific branch (e.g. `Preview (codex/m3-ralph-integration)`) — those are overrides for one preview deployment, not cloud-agent material.

Expected key set (values redacted):

```
CONVEX_DEPLOYMENT=dev:canny-turtle-982       # strip the trailing "# team: ..." comment when pasting
CONVEX_SITE_URL=...
NEXT_PUBLIC_CONVEX_URL=...
CONVEX_DEPLOY_KEY=...                        # admin to canny-turtle-982 — omit for Path B
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://<dev>.clerk.accounts.dev
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=...
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=...
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=...
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=...
NEXT_PUBLIC_MARKETING_URL=https://preview.smartpockets.com
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
RESEND_API_KEY=...
RESEND_EMAIL_KEY=...
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

## Caveats

1. **Backend deploy collisions** — `dev:canny-turtle-982` is shared across local dev (`bun dev:backend`), Vercel previews, and now any cloud agent that runs `bunx convex dev --once`. Don't fan out concurrent agents on backend changes; they'll trample each other's pushed function bundles.
2. **Real-data exposure** — `dev:canny-turtle-982` carries real Plaid production data. Path A inherits the existing "never share, never bulk-export" rule for that deployment, but extends it to multi-tenant LLM sandboxes. If that becomes uncomfortable, move to Path C.
3. **Threat-model delta vs Vercel previews** — Vercel runs your code with your secrets. Cloud agents run LLM-generated code with your secrets. Prompt injection and model misbehavior are categories Vercel previews don't have.
4. **Migration is cheap** — Path A → Path B is a 30-second env edit per platform. Path A → Path C is ~1-2 hours (provision a new Convex, switch keys).

## Related

- `AGENTS.md` → "Investigation Discipline" — read-paths to check before asking
- `CLAUDE.md` → "Plaid In Previews" — the `dev:canny-turtle-982` documented exception
- `apps/app/scripts/vercel-build.sh` — guardrail that enforces the exception list at build time
