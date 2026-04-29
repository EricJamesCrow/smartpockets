#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

VERCEL_ENV_VALUE="${VERCEL_ENV:-development}"
CLERK_PUBLISHABLE_KEY_VALUE="${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}"
CLERK_SECRET_KEY_VALUE="${CLERK_SECRET_KEY:-}"
CLERK_FRONTEND_API_URL_VALUE="${NEXT_PUBLIC_CLERK_FRONTEND_API_URL:-}"
PRODUCTION_CLERK_FRONTEND_API_HOST="clerk.smartpockets.com"

require_clerk_env() {
  if [[ -z "${CLERK_PUBLISHABLE_KEY_VALUE}" ]]; then
    echo "[vercel-build] ERROR: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required." >&2
    exit 1
  fi

  if [[ -z "${CLERK_SECRET_KEY_VALUE}" ]]; then
    echo "[vercel-build] ERROR: CLERK_SECRET_KEY is required." >&2
    exit 1
  fi

  if [[ -z "${CLERK_FRONTEND_API_URL_VALUE}" ]]; then
    echo "[vercel-build] ERROR: NEXT_PUBLIC_CLERK_FRONTEND_API_URL is required." >&2
    exit 1
  fi
}

normalize_clerk_frontend_api_host() {
  local url_value="${1}"

  if [[ "${url_value}" != https://* ]]; then
    echo "[vercel-build] ERROR: NEXT_PUBLIC_CLERK_FRONTEND_API_URL must start with https://." >&2
    exit 1
  fi

  url_value="${url_value#https://}"
  url_value="${url_value%%/*}"
  url_value="${url_value%%:*}"

  if [[ -z "${url_value}" ]]; then
    echo "[vercel-build] ERROR: NEXT_PUBLIC_CLERK_FRONTEND_API_URL must include a hostname." >&2
    exit 1
  fi

  printf "%s" "${url_value}"
}

validate_clerk_env() {
  require_clerk_env
  local clerk_frontend_api_host
  clerk_frontend_api_host="$(normalize_clerk_frontend_api_host "${CLERK_FRONTEND_API_URL_VALUE}")"

  if [[ "${VERCEL_ENV_VALUE}" == "production" ]]; then
    if [[ "${CLERK_PUBLISHABLE_KEY_VALUE}" != pk_live_* ]]; then
      echo "[vercel-build] ERROR: production builds require NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_*." >&2
      exit 1
    fi

    if [[ "${CLERK_SECRET_KEY_VALUE}" != sk_live_* ]]; then
      echo "[vercel-build] ERROR: production builds require CLERK_SECRET_KEY=sk_live_*." >&2
      exit 1
    fi

    if [[ "${clerk_frontend_api_host}" != "${PRODUCTION_CLERK_FRONTEND_API_HOST}" ]]; then
      echo "[vercel-build] ERROR: production builds require NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://${PRODUCTION_CLERK_FRONTEND_API_HOST}." >&2
      exit 1
    fi

    return
  fi

  if [[ "${CLERK_PUBLISHABLE_KEY_VALUE}" == pk_live_* ]]; then
    echo "[vercel-build] ERROR: ${VERCEL_ENV_VALUE} builds cannot use production Clerk publishable keys." >&2
    echo "[vercel-build] Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to a Clerk development key scoped to Vercel Preview." >&2
    exit 1
  fi

  if [[ "${CLERK_SECRET_KEY_VALUE}" == sk_live_* ]]; then
    echo "[vercel-build] ERROR: ${VERCEL_ENV_VALUE} builds cannot use production Clerk secret keys." >&2
    echo "[vercel-build] Set CLERK_SECRET_KEY to a Clerk development key scoped to Vercel Preview." >&2
    exit 1
  fi

  if [[ "${CLERK_PUBLISHABLE_KEY_VALUE}" != pk_test_* ]]; then
    echo "[vercel-build] ERROR: ${VERCEL_ENV_VALUE} builds require NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_*." >&2
    exit 1
  fi

  if [[ "${CLERK_SECRET_KEY_VALUE}" != sk_test_* ]]; then
    echo "[vercel-build] ERROR: ${VERCEL_ENV_VALUE} builds require CLERK_SECRET_KEY=sk_test_*." >&2
    exit 1
  fi

  if [[ "${CLERK_FRONTEND_API_URL_VALUE}" == *"smartpockets.com"* ]]; then
    echo "[vercel-build] ERROR: ${VERCEL_ENV_VALUE} builds cannot use the production Clerk frontend domain." >&2
    echo "[vercel-build] Set NEXT_PUBLIC_CLERK_FRONTEND_API_URL to the Clerk development issuer, for example https://<dev-clerk-domain>.clerk.accounts.dev." >&2
    exit 1
  fi

  if [[ "${clerk_frontend_api_host}" != *.clerk.accounts.dev ]]; then
    echo "[vercel-build] ERROR: ${VERCEL_ENV_VALUE} builds require NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://<dev-clerk-domain>.clerk.accounts.dev." >&2
    exit 1
  fi
}

main() {
  echo "[vercel-build] VERCEL_ENV=${VERCEL_ENV_VALUE}"

  validate_clerk_env

  echo "[vercel-build] Building web only."
  cd "${WEB_DIR}"
  bun run build
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
