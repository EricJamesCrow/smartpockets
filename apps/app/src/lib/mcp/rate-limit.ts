// apps/app/src/lib/mcp/rate-limit.ts

import { createHash } from "node:crypto";

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;

const MCP_TOOL_CALL_RATE_LIMIT = {
  capacity: 40,
  refillAmount: 30,
  refillPeriodMs: MINUTE_MS,
  idleTtlMs: 10 * MINUTE_MS,
} as const;

const PRUNE_INTERVAL_MS = MINUTE_MS;
const MAX_TRACKED_KEYS = 10_000;

type TokenBucket = {
  tokens: number;
  updatedAt: number;
  expiresAt: number;
};
type BucketCheck = {
  key: string;
  bucket: TokenBucket;
};

export type MCPRateLimitResult =
  | { ok: true }
  | {
      ok: false;
      retryAfterSeconds: number;
    };

const toolCallBuckets = new Map<string, TokenBucket>();
let lastPrunedAt = 0;

/**
 * In-process token bucket for the externally callable MCP route.
 * This protects Convex work before `handleToolCall` is invoked.
 */
export function checkMCPToolCallRateLimit({
  userId,
  token,
  now = Date.now(),
}: {
  userId: string;
  token: string;
  now?: number;
}): MCPRateLimitResult {
  pruneExpiredBuckets(now);

  const bucketChecks = [`user:${userId}`, `token:${hashToken(token)}`].map(
    (key) => ({
      key,
      bucket: refillBucket(toolCallBuckets.get(key), now),
    })
  );

  const retryAfterSeconds = maxRetryAfterSeconds(bucketChecks);
  if (retryAfterSeconds !== null) {
    for (const { key, bucket } of bucketChecks) {
      toolCallBuckets.set(key, {
        ...bucket,
        expiresAt: now + MCP_TOOL_CALL_RATE_LIMIT.idleTtlMs,
      });
    }

    return {
      ok: false,
      retryAfterSeconds,
    };
  }

  for (const { key, bucket } of bucketChecks) {
    toolCallBuckets.set(key, {
      tokens: bucket.tokens - 1,
      updatedAt: now,
      expiresAt: now + MCP_TOOL_CALL_RATE_LIMIT.idleTtlMs,
    });
  }

  return { ok: true };
}

function refillBucket(bucket: TokenBucket | undefined, now: number): TokenBucket {
  if (!bucket) {
    return {
      tokens: MCP_TOOL_CALL_RATE_LIMIT.capacity,
      updatedAt: now,
      expiresAt: now + MCP_TOOL_CALL_RATE_LIMIT.idleTtlMs,
    };
  }

  const elapsedMs = Math.max(0, now - bucket.updatedAt);
  const refillTokens =
    (elapsedMs / MCP_TOOL_CALL_RATE_LIMIT.refillPeriodMs) *
    MCP_TOOL_CALL_RATE_LIMIT.refillAmount;

  return {
    tokens: Math.min(MCP_TOOL_CALL_RATE_LIMIT.capacity, bucket.tokens + refillTokens),
    updatedAt: now,
    expiresAt: bucket.expiresAt,
  };
}

function secondsUntilNextToken(currentTokens: number) {
  const tokensNeeded = Math.max(0, 1 - currentTokens);
  const retryAfterMs =
    (tokensNeeded / MCP_TOOL_CALL_RATE_LIMIT.refillAmount) *
    MCP_TOOL_CALL_RATE_LIMIT.refillPeriodMs;

  return Math.max(1, Math.ceil(retryAfterMs / SECOND_MS));
}

function maxRetryAfterSeconds(bucketChecks: BucketCheck[]) {
  const retryAfterSeconds = bucketChecks
    .filter(({ bucket }) => bucket.tokens < 1)
    .map(({ bucket }) => secondsUntilNextToken(bucket.tokens));

  if (retryAfterSeconds.length === 0) {
    return null;
  }

  return Math.max(...retryAfterSeconds);
}

function pruneExpiredBuckets(now: number) {
  if (
    now - lastPrunedAt < PRUNE_INTERVAL_MS &&
    toolCallBuckets.size <= MAX_TRACKED_KEYS
  ) {
    return;
  }

  lastPrunedAt = now;

  for (const [key, bucket] of toolCallBuckets) {
    if (bucket.expiresAt <= now) {
      toolCallBuckets.delete(key);
    }
  }

  if (toolCallBuckets.size <= MAX_TRACKED_KEYS) {
    return;
  }

  const bucketsByExpiry = [...toolCallBuckets.entries()].sort(
    ([, a], [, b]) => a.expiresAt - b.expiresAt
  );
  const bucketsToEvict = bucketsByExpiry.slice(
    0,
    toolCallBuckets.size - MAX_TRACKED_KEYS
  );

  for (const [key] of bucketsToEvict) {
    toolCallBuckets.delete(key);
  }
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}
