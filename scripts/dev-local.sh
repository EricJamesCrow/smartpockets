#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

APP_ENV="apps/app/.env.local"
WEB_ENV="apps/web/.env.local"
BACKEND_ENV="packages/backend/.env.local"

say() {
    printf "%s\n" "$1"
}

has_env_key() {
    local file="$1"
    local key="$2"

    [ -f "$file" ] && grep -Eq "^[[:space:]]*${key}=" "$file"
}

require_env_key() {
    local file="$1"
    local key="$2"

    if ! has_env_key "$file" "$key"; then
        say "Missing ${key} in ${file}"
        return 1
    fi
}

env_value() {
    local file="$1"
    local key="$2"

    awk -F= -v key="$key" '$1 == key { value = substr($0, index($0, "=") + 1); gsub(/^["'\'']|["'\'']$/, "", value); print value; exit }' "$file"
}

port_pids() {
    local port="$1"

    lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
}

if ! command -v bun >/dev/null 2>&1; then
    say "Missing bun. Install Bun first: https://bun.sh/docs/installation"
    exit 1
fi

branch="$(git branch --show-current 2>/dev/null || true)"
if [ "$branch" != "codex/m3-ralph-integration" ]; then
    say "Warning: current branch is '${branch:-unknown}', not 'codex/m3-ralph-integration'."
    say "This script will still run the current checkout."
fi

missing=0
for env_file in "$APP_ENV" "$WEB_ENV"; do
    if [ ! -f "$env_file" ]; then
        say "Missing ${env_file}"
        missing=1
    fi
done

if [ "$missing" -eq 0 ]; then
    require_env_key "$APP_ENV" "NEXT_PUBLIC_CONVEX_URL" || missing=1
    require_env_key "$APP_ENV" "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" || missing=1
    require_env_key "$APP_ENV" "NEXT_PUBLIC_CLERK_FRONTEND_API_URL" || missing=1
    require_env_key "$APP_ENV" "CLERK_SECRET_KEY" || missing=1
    require_env_key "$WEB_ENV" "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" || missing=1
    require_env_key "$WEB_ENV" "NEXT_PUBLIC_APP_URL" || missing=1
fi

if [ "$missing" -eq 0 ]; then
    app_clerk_key="$(env_value "$APP_ENV" "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")"
    web_clerk_key="$(env_value "$WEB_ENV" "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")"
    app_clerk_frontend="$(env_value "$APP_ENV" "NEXT_PUBLIC_CLERK_FRONTEND_API_URL")"

    if [[ "$app_clerk_key" == pk_live_* || "$web_clerk_key" == pk_live_* || "$app_clerk_frontend" == *"clerk.smartpockets.com"* ]]; then
        say "Local Clerk env is using production keys/domain, which Clerk rejects on localhost."
        say ""
        say "Replace the Clerk values in these local-only files with Clerk test/dev values:"
        say "  ${APP_ENV}"
        say "    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_..."
        say "    CLERK_SECRET_KEY=sk_test_..."
        say "    NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://<test-clerk-domain>.clerk.accounts.dev"
        say "  ${WEB_ENV}"
        say "    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_..."
        say ""
        say "Do not commit .env.local files."
        exit 1
    fi
fi

if [ "$missing" -eq 0 ]; then
    if [ ! -e "$BACKEND_ENV" ]; then
        ln -s ../../apps/app/.env.local "$BACKEND_ENV"
        say "Linked ${BACKEND_ENV} -> ../../apps/app/.env.local"
    elif [ ! -L "$BACKEND_ENV" ]; then
        say "Warning: ${BACKEND_ENV} already exists and is not a symlink."
        say "Make sure it matches ${APP_ENV}, especially CONVEX_DEPLOYMENT and NEXT_PUBLIC_CLERK_FRONTEND_API_URL."
    fi
fi

if [ "$missing" -ne 0 ]; then
    say ""
    say "Local env is incomplete. Do not commit secrets."
    say "Expected env files:"
    say "  ${APP_ENV}"
    say "  ${WEB_ENV}"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    say "node_modules is missing; running bun install once."
    bun install
fi

app_port_pids="$(port_pids 3000 | tr "\n" " " | sed 's/[[:space:]]*$//')"
web_port_pids="$(port_pids 3001 | tr "\n" " " | sed 's/[[:space:]]*$//')"
convex_deployment="$(env_value "$APP_ENV" "CONVEX_DEPLOYMENT")"

if [ -n "$app_port_pids" ] || [ -n "$web_port_pids" ]; then
    say "Local dev ports are already in use."
    [ -n "$app_port_pids" ] && say "  port 3000: PID(s) ${app_port_pids}"
    [ -n "$web_port_pids" ] && say "  port 3001: PID(s) ${web_port_pids}"
    say ""
    say "Stop the existing dev server first, or run:"
    [ -n "$app_port_pids" ] && say "  kill ${app_port_pids}"
    [ -n "$web_port_pids" ] && say "  kill ${web_port_pids}"
    exit 1
fi

say "Starting local SmartPockets demo:"
say "  app:       http://localhost:3000"
say "  marketing: http://localhost:3001"
if [[ "$convex_deployment" == prev:* ]]; then
    say "  backend:   using existing Convex preview deployment (${convex_deployment})"
    say ""
    say "This checkout is configured for a Convex preview deployment, so convex dev is not started."
    say "After backend changes, push them with:"
    say "  cd packages/backend && npx convex deploy --env-file ../../apps/app/.env.local --yes"
else
    say "  backend:   Convex dev deployment from ${BACKEND_ENV}"
fi
say ""
say "Unauthenticated app routes should redirect to the local marketing site."
say "Press Ctrl-C to stop all dev servers."

export NEXT_PUBLIC_APP_URL="http://localhost:3000"
export NEXT_PUBLIC_MARKETING_URL="http://localhost:3001"

if [[ "$convex_deployment" == prev:* ]]; then
    exec bunx turbo dev --parallel --filter=@repo/app --filter=@repo/web
fi

exec bunx turbo dev --parallel --filter=@repo/backend --filter=@repo/app --filter=@repo/web
