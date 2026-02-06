#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${APP_DIR}/../.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/packages/backend"

VERCEL_ENV_VALUE="${VERCEL_ENV:-development}"
CONVEX_DEPLOYMENT_VALUE="${CONVEX_DEPLOYMENT:-}"

echo "[vercel-build] VERCEL_ENV=${VERCEL_ENV_VALUE}"

# Production deploys are the only builds allowed to trigger `convex deploy`.
if [[ "${VERCEL_ENV_VALUE}" == "production" ]]; then
  if [[ -z "${CONVEX_DEPLOY_KEY:-}" ]]; then
    echo "[vercel-build] ERROR: CONVEX_DEPLOY_KEY is required for production builds." >&2
    exit 1
  fi

  # Guardrail: if CONVEX_DEPLOYMENT is set, it must target production.
  if [[ -n "${CONVEX_DEPLOYMENT_VALUE}" && "${CONVEX_DEPLOYMENT_VALUE}" != prod:* ]]; then
    echo "[vercel-build] ERROR: production builds require CONVEX_DEPLOYMENT=prod:*." >&2
    exit 1
  fi

  echo "[vercel-build] Deploying backend to Convex and building app..."
  cd "${BACKEND_DIR}"
  bunx convex deploy \
    --cmd "cd ../../apps/app && bun run build" \
    --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
  exit 0
fi

# Guardrail: non-production builds should never point at a production Convex deployment.
if [[ -n "${CONVEX_DEPLOYMENT_VALUE}" && "${CONVEX_DEPLOYMENT_VALUE}" == prod:* ]]; then
  echo "[vercel-build] ERROR: ${VERCEL_ENV_VALUE} builds cannot use CONVEX_DEPLOYMENT=prod:*." >&2
  exit 1
fi

# Non-production builds skip backend deploy and use environment-provided Convex URL.
if [[ -z "${NEXT_PUBLIC_CONVEX_URL:-}" ]]; then
  echo "[vercel-build] ERROR: NEXT_PUBLIC_CONVEX_URL is required for non-production builds." >&2
  exit 1
fi

echo "[vercel-build] Skipping Convex deploy for ${VERCEL_ENV_VALUE}; building app only."
cd "${APP_DIR}"
bun run build
