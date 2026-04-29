#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'USAGE'
Usage: scripts/codex-cloud-verify.sh [baseline|backend|plaid|app|web|all]

Runs SmartPockets Codex Cloud verification without deploy or persistent auth.

Modes:
  baseline  Install deps, then run workspace typecheck and lint.
  backend   Install deps, then run backend tests.
  plaid     Install deps, then build, typecheck, and test packages/convex-plaid.
  app       Install deps, then run app typecheck and lint.
  web       Install deps, then run web typecheck and lint.
  all       Install deps, then run every check above.

This script does not run gh auth, gt auth, vercel deploy, convex deploy, or any
other credential-persisting or deployment command.
USAGE
}

mode="${1:-baseline}"

if [[ "$mode" == "-h" || "$mode" == "--help" ]]; then
  usage
  exit 0
fi

require_bun() {
  local package_manager
  package_manager="$(node -p "require('./package.json').packageManager || ''")"

  case "$package_manager" in
    bun@*)
      local bun_version
      bun_version="${package_manager#bun@}"

      if ! command -v bun >/dev/null 2>&1 || [[ "$(bun --version)" != "$bun_version" ]]; then
        curl -fsSL https://bun.com/install | bash -s "bun-v${bun_version}"
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
      fi

      bun --version
      ;;
    *)
      echo "Unsupported or missing packageManager: ${package_manager}" >&2
      exit 1
      ;;
  esac
}

install_deps() {
  require_bun
  bun install --frozen-lockfile
}

run_baseline() {
  bun typecheck
  bun lint
}

run_backend() {
  bun --filter @repo/backend test
}

run_plaid() {
  (
    cd packages/convex-plaid
    bun run build
    bun run typecheck
    bun run test
  )
}

run_app() {
  bun --filter @repo/app typecheck
  bun --filter @repo/app lint
}

run_web() {
  bun --filter @repo/web typecheck
  bun --filter @repo/web lint
}

install_deps

case "$mode" in
  baseline)
    run_baseline
    ;;
  backend)
    run_backend
    ;;
  plaid)
    run_plaid
    ;;
  app)
    run_app
    ;;
  web)
    run_web
    ;;
  all)
    run_baseline
    run_backend
    run_plaid
    run_app
    run_web
    ;;
  *)
    echo "Unknown verification mode: ${mode}" >&2
    usage >&2
    exit 1
    ;;
esac
