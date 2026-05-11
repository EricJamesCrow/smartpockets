#!/usr/bin/env bash
# Cursor Cloud / Background Agent: install step runs from repo root (see Cursor docs).
# Base Ubuntu images do not ship Bun; `.cursor/environment.json` calls this script so
# `bun install` works on a fresh VM.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

if ! command -v bun >/dev/null 2>&1; then
  echo "[cursor-env-install] Bun not on PATH; installing Bun 1.1.42 (matches package.json packageManager)..."
  curl -fsSL https://bun.sh/install | bash -s "bun-v1.1.42"
  export PATH="$BUN_INSTALL/bin:$PATH"
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "[cursor-env-install] error: bun still not available after install (PATH=$PATH)" >&2
  exit 1
fi

echo "[cursor-env-install] $(command -v bun) $(bun --version)"
bun install
