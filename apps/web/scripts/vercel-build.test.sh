#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_SCRIPT="${SCRIPT_DIR}/vercel-build.sh"

failures=0

run_validate_case() {
  local name="${1}"
  local expected_status="${2}"
  local expected_output="${3}"
  shift 3

  local output
  local status

  set +e
  output="$(env -i PATH="${PATH}" "$@" bash -c 'source "$1"; validate_clerk_env' bash "${BUILD_SCRIPT}" 2>&1)"
  status=$?
  set -e

  if [[ "${expected_status}" == "pass" && "${status}" -ne 0 ]]; then
    echo "[vercel-build.test] FAIL: ${name} expected success, got ${status}" >&2
    echo "${output}" >&2
    failures=$((failures + 1))
    return
  fi

  if [[ "${expected_status}" == "fail" && "${status}" -eq 0 ]]; then
    echo "[vercel-build.test] FAIL: ${name} expected failure, got success" >&2
    failures=$((failures + 1))
    return
  fi

  if [[ -n "${expected_output}" && "${output}" != *"${expected_output}"* ]]; then
    echo "[vercel-build.test] FAIL: ${name} expected output containing: ${expected_output}" >&2
    echo "${output}" >&2
    failures=$((failures + 1))
    return
  fi

  echo "[vercel-build.test] PASS: ${name}"
}

run_validate_case \
  "web preview live publishable key fails" \
  fail \
  "preview builds cannot use production Clerk publishable keys" \
  VERCEL_ENV=preview \
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_test \
  CLERK_SECRET_KEY=sk_test_test \
  NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://example.clerk.accounts.dev

run_validate_case \
  "web preview production Clerk domain fails" \
  fail \
  "preview builds cannot use the production Clerk frontend domain" \
  VERCEL_ENV=preview \
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_test \
  CLERK_SECRET_KEY=sk_test_test \
  NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://clerk.smartpockets.com

run_validate_case \
  "web preview test keys and dev Clerk host pass" \
  pass \
  "" \
  VERCEL_ENV=preview \
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_test \
  CLERK_SECRET_KEY=sk_test_test \
  NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://example.clerk.accounts.dev

if [[ "${failures}" -gt 0 ]]; then
  echo "[vercel-build.test] ${failures} failure(s)" >&2
  exit 1
fi

echo "[vercel-build.test] All checks passed"
