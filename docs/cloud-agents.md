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
- **Path C** — provision a dedicated `dev:` Convex deployment with `PLAID_ENV=sandbox`. Agents never touch `dev:canny-turtle-982`.

## Setup philosophy: let agents bootstrap themselves

There is **no committed setup script** in this repo. Cloud agentic environments are themselves capable of detecting missing dependencies (Bun, `node_modules`, etc.) and installing on demand. When they hit an obstacle (missing tool, wrong version, blocked URL) they patch it via a PR — which is exactly the workflow we want.

The only repo-side artifact is `.cursor/environment.json`, which Cursor reads automatically:

| File | Role |
|---|---|
| `.cursor/environment.json` | Tells Cursor Background Agents to run `bash scripts/cursor-agent-install.sh`, which puts `~/.bun/bin` on `PATH` (non-login shells often omit it) and falls back to installing Bun if missing. |
| `packages/backend/convex/_generated/` | Generated Convex types — committed, so `bun typecheck` and `bun build` pass on a fresh checkout without running `convex codegen`. |

For Codex and Claude Code on the Web, **leave the Setup script field empty**. The agent does its own setup on first use.

## Per-platform UI walkthrough

There is no CLI/API for managing cloud-session env on these platforms — each one is a one-time UI walkthrough.

### Cursor Background Agents

1. Open `cursor.com/agents` and sign in.
2. Authorize the Cursor GitHub app on `EricJamesCrow/smartpockets`.
3. Open the **Secrets** tab — Cursor's recommended path for env values (KMS-encrypted at rest, redacted in tool output). Paste each key from the [env checklist](#env-var-checklist).
4. **Environment** tab — `.cursor/environment.json` is auto-detected. The install command is just `bun install`; Cursor's sandbox preinstalls Bun, so no extra step is needed.

### OpenAI Codex Cloud

1. Open `chatgpt.com/codex` → **Environments** → connect `EricJamesCrow/smartpockets` (requires the OpenAI GitHub app installed on the repo or org).
2. **Setup script** field — leave empty. The agent will run `bun install` itself (and install Bun if the container doesn't ship it).
3. **Maintenance script** — leave empty.
4. **Agent internet access**: turn **On**. Use the **Common dependencies** preset (covers npm + GitHub + GitHub asset hosts). Add to **Additional allowed domains** (comma-separated, exact value below):
   ```
   *.convex.cloud, *.convex.site, *.clerk.accounts.dev, *.plaid.com, bun.sh
   ```
5. **Environment variables** section — paste each value from the [env checklist](#env-var-checklist) as a plain **environment variable**, not a "secret". Codex strips secrets before the agent phase starts, so anything the agent needs at runtime must be a plain env var.

### Claude Code on the Web

1. Open `claude.com/code` and sign in.
2. Connect GitHub via either the Claude GitHub App on `EricJamesCrow/smartpockets` (recommended — enables auto-fix), or run `/web-setup` locally to sync your `gh` token.
3. Click the cloud icon → **Add environment**.
4. **Network access**: switch from "Trusted" to **Custom** and allowlist (one per line — Custom mode has no baseline, so include npm + GitHub explicitly):
   ```
   registry.npmjs.org
   github.com
   api.github.com
   objects.githubusercontent.com
   bun.sh
   *.convex.cloud
   *.convex.site
   *.clerk.accounts.dev
   *.plaid.com
   vercel.com
   *.vercel.app
   ```
   Note: `bun.sh/install` may still return 403 inside the Claude Web sandbox (Cloudflare bot detection + Anthropic's egress proxy). The sandbox ships Bun preinstalled (1.3.x), so the agent uses that.
5. **Setup script** field — leave empty. The Claude Web sandbox preinstalls Bun; the agent runs `bun install` itself.
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

Paste the non-branch-scoped values. Skip any keys the Vercel CLI shows as scoped to a specific branch — those are overrides for one preview deployment, not cloud-agent material. Also strip Vercel-injected build vars (`VERCEL_*`, `TURBO_*`, `NX_DAEMON`); they don't apply outside Vercel build contexts.

Expected key set (values redacted):

```
CONVEX_DEPLOYMENT=dev:canny-turtle-982       # strip the trailing "# team: ..." comment when pasting
CONVEX_SITE_URL=...
NEXT_PUBLIC_CONVEX_URL=...
CONVEX_DEPLOY_KEY=...                        # admin to canny-turtle-982 — omit for Path B
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...                 # NOTE: stored as Sensitive type in Vercel; pull returns empty. Paste your local value manually.
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
5. **Bun version drift is a non-issue under this model** — agents use whatever Bun the sandbox ships (currently 1.3.x). The `package.json` `packageManager` field documents intent but isn't enforced; if `bun install` regenerates `bun.lock`, agents are instructed via the project's standard workflow rules to not commit the regenerated lockfile.

## Related

- `AGENTS.md` → "Investigation Discipline" — read-paths to check before asking
- `CLAUDE.md` → "Plaid In Previews" — the `dev:canny-turtle-982` documented exception
- `apps/app/scripts/vercel-build.sh` — guardrail that enforces the exception list at build time
