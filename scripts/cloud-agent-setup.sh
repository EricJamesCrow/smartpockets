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

# Bun version must match `packageManager` in the root package.json. Otherwise
# `bun install` re-resolves and rewrites bun.lock — Cursor's sandbox ships a
# newer Bun, Codex's universal container ships none, Claude Code on the Web
# ships some Bun, and any of those without pinning produces spurious diffs
# that fail CI (Vercel uses the pinned version).
TARGET_BUN_VERSION="1.1.42"  # Keep in sync with package.json `packageManager`.
if ! command -v bun >/dev/null 2>&1 || [ "$(bun --version 2>/dev/null)" != "$TARGET_BUN_VERSION" ]; then
  echo "[cloud-agent-setup] Installing Bun ${TARGET_BUN_VERSION}..."
  curl -fsSL https://bun.sh/install | bash -s "bun-v${TARGET_BUN_VERSION}"
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
