# Codex Cloud Environment

## Purpose

SmartPockets uses Codex Cloud as an install, check, and propose environment. Agents should be able to clone the repository, install dependencies, run checks and tests, create local branches or diffs, and propose pull requests through the Codex/GitHub integration.

The default environment is not a deployment environment and is not a privileged operations environment.

## Operating Policy

Allowed by default:

- Clone and inspect `EricJamesCrow/smartpockets`.
- Install repository dependencies with the package manager declared in `package.json`.
- Run type checks, lint checks, unit tests, and package-specific build checks.
- Create local branches, commits, and diffs for review.
- Propose pull requests through Codex/GitHub integration outside the shell environment.

Forbidden by default:

- Merge pull requests.
- Deploy to Vercel, Convex, or any other hosting target.
- Alias domains or update preview domain mappings.
- Modify Vercel project settings or environment variables.
- Access production Plaid, Clerk, Stripe, Convex, database, billing, or Vercel credentials.
- Mutate billing configuration, live customer data, production data, or important shared staging resources.
- Run `gh auth`, `gt auth`, `vercel deploy`, `vercel alias`, `convex deploy`, or equivalent persistent auth/deploy commands from the default shell environment.

## Service Data

Agent environments must use resettable non-production services only:

- Plaid Sandbox only.
- Clerk development/test only.
- Stripe test mode only.
- Resettable fake-data Convex/database deployment only.

Do not point Codex Cloud at production, live banking data, live billing data, or shared staging data that humans depend on. If an agent task requires data mutation, use a disposable or resettable fake-data environment and document the reset path before starting.

## Default Setup Script

Use this script in the Codex Cloud environment setup. It installs only the package manager required by the repo and the repo dependencies. It does not authenticate GitHub, Graphite, Vercel, Convex, Plaid, Clerk, or Stripe.

```bash
set -euo pipefail

package_manager="$(node -p "require('./package.json').packageManager || ''")"

case "$package_manager" in
  bun@*)
    bun_version="${package_manager#bun@}"

    if ! command -v bun >/dev/null 2>&1 || [ "$(bun --version)" != "$bun_version" ]; then
      curl -fsSL https://bun.com/install | bash -s "bun-v${bun_version}"
      export BUN_INSTALL="$HOME/.bun"
      export PATH="$BUN_INSTALL/bin:$PATH"
    fi

    bun --version
    bun install --frozen-lockfile
    ;;
  *)
    echo "Unsupported or missing packageManager: ${package_manager}" >&2
    exit 1
    ;;
esac

node --version
```

This script intentionally does not append to shell startup files. If a later setup step needs `bun` on `PATH`, export `BUN_INSTALL` and `PATH` in that same setup step.

## Verification Commands

Baseline checks:

```bash
bun typecheck
bun lint
```

Backend-focused checks when backend code changes:

```bash
bun --filter @repo/backend test
```

Local Plaid component checks when `packages/convex-plaid` changes:

```bash
cd packages/convex-plaid
bun run build
bun run typecheck
bun run test
```

App and web checks when frontend code changes:

```bash
bun --filter @repo/app typecheck
bun --filter @repo/app lint
bun --filter @repo/web typecheck
bun --filter @repo/web lint
```

The repository wrapper for these checks is:

```bash
scripts/codex-cloud-verify.sh baseline
scripts/codex-cloud-verify.sh backend
scripts/codex-cloud-verify.sh plaid
scripts/codex-cloud-verify.sh app
scripts/codex-cloud-verify.sh web
scripts/codex-cloud-verify.sh all
```

## Pull Request Handoff

Default Codex Cloud tasks should rely on the Codex/GitHub product integration for PR proposal. The shell environment should not persist human or bot GitHub credentials.

SmartPockets still uses Graphite as the primary review surface. If Graphite submission is required, prefer a human or local trusted agent handoff. The handoff should include:

- Linear issue ID.
- Branch or diff summary.
- Files changed.
- Verification commands run.
- Known risks or follow-ups.

## Optional Auth-Gated Environment

Persistent shell authentication is disabled by default:

```bash
ALLOW_PERSISTED_AGENT_AUTH=false
```

Only create a separate authenticated Codex environment after explicit approval. That environment must use bot or service identities, never personal human tokens. Tokens must be tightly scoped to branch creation, PR creation, and comments only.

The authenticated environment must still have no merge, deploy, billing, production secret, Vercel environment, Vercel domain, Convex production, Stripe live, or production data permissions.

Any setup step that persists auth config must be gated:

```bash
if [ "${ALLOW_PERSISTED_AGENT_AUTH:-false}" = "true" ]; then
  echo "Persistent bot auth enabled for this dedicated environment."
  # Auth commands go here only after separate approval.
fi
```

Do not add `gh auth`, `gt auth`, or other auth commands outside this gate.

## Token Rotation

If an authenticated environment is approved later:

- Use separate bot tokens per service and per environment.
- Scope tokens to the minimum repository/project permissions.
- Store tokens only in the Codex environment settings, not in repo files.
- Rotate tokens immediately after suspected exposure, agent misuse, or policy change.
- Remove tokens when the authenticated environment is no longer needed.

## References

- `AGENTS.md` for SmartPockets agent workflow, Linear, Graphite, and fintech security rules.
- `docs/convex-deploy-guardrails.md` for Vercel preview and Clerk/Convex guardrails.
- `scripts/codex-cloud-verify.sh` for the default no-auth verification workflow.
