#!/usr/bin/env bash
# Cursor Background Agents run `install` in a minimal shell where ~/.bun/bin is often
# missing from PATH even when Bun is installed. npm workspaces still expect Bun here.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export PATH="${HOME}/.bun/bin:${HOME}/.local/bin:/usr/local/bin:${PATH}"

if ! command -v bun >/dev/null 2>&1; then
  echo "[cursor-agent-install] bun not found; installing via https://bun.sh/install"
  curl -fsSL https://bun.sh/install | bash
  export PATH="${HOME}/.bun/bin:${PATH}"
fi

exec bun install
