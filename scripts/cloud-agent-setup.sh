#!/usr/bin/env bash
# Bootstrap a cloud-agent sandbox (Cursor Background Agents / Codex Cloud /
# Claude Code on the Web). Idempotent — safe to rerun. Reads no secrets;
# the only network calls are Bun's installer and the package registry.
#
# Wiring per platform:
#   Cursor:   `.cursor/environment.json` install field
#   Codex:    Setup script at chatgpt.com/codex   → `bash scripts/cloud-agent-setup.sh`
#   Claude:   Setup script at claude.com/code     → `bash scripts/cloud-agent-setup.sh`

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Cursor + Codex universal containers don't ship Bun.
# Claude Code on the Web ships Bun preinstalled, but the install path is
# defensive in case proxy/network conditions break the preinstall.
if ! command -v bun >/dev/null 2>&1; then
  echo "[cloud-agent-setup] Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
  export PATH="$HOME/.bun/bin:$PATH"
fi

echo "[cloud-agent-setup] bun=$(bun --version)"

# packages/backend/convex/_generated/ is committed, so `bun install` is
# enough for `bun typecheck` and `bun build` to pass on a fresh checkout.
# The agent runs `cd packages/backend && bunx convex dev --once` itself
# only when it edits backend code.
bun install

echo "[cloud-agent-setup] Done."
