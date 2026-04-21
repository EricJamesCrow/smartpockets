#!/usr/bin/env bash
# W2 acceptance smoke. Run once per branch cut before stack submission.
# Requires: dev Convex running, TEST_JWT set, CONVEX_SITE_URL set, seeded test user.
set -euo pipefail

: "${CONVEX_SITE_URL:?set CONVEX_SITE_URL}"
: "${TEST_JWT:?set TEST_JWT}"

ROOT=$(git rev-parse --show-toplevel)

echo "1. Typecheck..."
(cd "$ROOT" && bun typecheck)

echo "2. Schema apply..."
(cd "$ROOT/packages/backend" && npx convex dev --once)

echo "3. HTTP 401 on no-auth..."
status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$CONVEX_SITE_URL/api/agent/send" \
  -H "Content-Type: application/json" -d '{"prompt":"x"}')
[ "$status" = "401" ] || { echo "FAIL: expected 401, got $status"; exit 1; }

echo "4. HTTP 200 on valid..."
body=$(curl -s -X POST "$CONVEX_SITE_URL/api/agent/send" \
  -H "Authorization: Bearer $TEST_JWT" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"List my accounts."}')
echo "$body" | jq -e '.threadId and .messageId' >/dev/null \
  || { echo "FAIL: 200 body missing keys: $body"; exit 1; }

echo "5. Prompt-drift lint..."
(cd "$ROOT/packages/backend" && bun run lint:prompt-drift)

echo "6. Budget cap test..."
(cd "$ROOT/packages/backend" && \
  npx convex env set AGENT_BUDGET_MONTHLY_TOKENS 1 && \
  sleep 2)
status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$CONVEX_SITE_URL/api/agent/send" \
  -H "Authorization: Bearer $TEST_JWT" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"hi"}')
(cd "$ROOT/packages/backend" && npx convex env set AGENT_BUDGET_MONTHLY_TOKENS 1000000)
[ "$status" = "429" ] || { echo "FAIL: expected 429, got $status"; exit 1; }

echo "All W2 acceptance checks passed."
