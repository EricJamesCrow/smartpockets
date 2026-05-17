import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

export const plaidLimiter = new RateLimiter((components as any).rateLimiter, {
  link_token: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 20 },
  token_exchange: { kind: "token bucket", rate: 5, period: MINUTE, capacity: 10 },
  update_link_token: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 15 },
  item_sync: { kind: "token bucket", rate: 30, period: HOUR, capacity: 30 },
  enrichment_backfill: { kind: "token bucket", rate: 5, period: HOUR, capacity: 5 },
});

export type PlaidRateLimitBucket =
  | "link_token"
  | "token_exchange"
  | "update_link_token"
  | "item_sync"
  | "enrichment_backfill";
