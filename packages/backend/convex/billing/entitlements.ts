/**
 * Single source of truth for per-plan limits. Pure module (no ctx, no I/O)
 * so it is trivially unit-testable and importable from queries, mutations,
 * actions, and the HTTP layer alike. Numbers are tunable here; the two token
 * backstops accept env overrides (matching the existing AGENT_BUDGET_* style).
 */
export type Plan = "free" | "pro";

export interface Entitlements {
  /** Primary, user-facing monthly chat cap. */
  chatMessagesPerMonth: number;
  /** Secondary cost backstop: monthly tokensIn+tokensOut ceiling. */
  chatTokensPerMonth: number;
  /** Active Plaid Items (institution logins). */
  maxPlaidConnections: number;
}

function numFromEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  const n = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const FREE: Entitlements = {
  chatMessagesPerMonth: 15,
  chatTokensPerMonth: numFromEnv("BILLING_FREE_CHAT_TOKENS", 500_000),
  maxPlaidConnections: 1,
};

const PRO: Entitlements = {
  chatMessagesPerMonth: 500,
  chatTokensPerMonth: numFromEnv("BILLING_PRO_CHAT_TOKENS", 10_000_000),
  maxPlaidConnections: 5,
};

export function entitlementsFor(plan: Plan): Entitlements {
  return plan === "pro" ? PRO : FREE;
}

/** Normalize any value to a known plan; unknown/missing ⇒ "free" (least privilege). */
export function resolvePlan(value: unknown): Plan {
  return value === "pro" ? "pro" : "free";
}
