import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

// components.rateLimiter is populated by Convex codegen after `npx convex dev --once`
// registers the component added to convex.config.ts. The cast is temporary and
// becomes unnecessary once the dev deployment regenerates `_generated/api.d.ts`.
export const agentLimiter = new RateLimiter((components as any).rateLimiter, {
  read_cheap: { kind: "token bucket", rate: 60, period: MINUTE, capacity: 75 },
  read_moderate: {
    kind: "token bucket",
    rate: 30,
    period: MINUTE,
    capacity: 40,
  },
  write_single: {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 25,
  },
  write_bulk: { kind: "token bucket", rate: 5, period: MINUTE, capacity: 7 },
  write_expensive: {
    kind: "token bucket",
    rate: 2,
    period: MINUTE,
    capacity: 3,
  },
  // Coarser gate applied on top of `write_expensive` for tools in
  // DESTRUCTIVE_TOOLS (spec §3.6 / contracts §12 footnote).
  destructive_ops: {
    kind: "token bucket",
    rate: 10,
    period: HOUR,
    capacity: 10,
  },
});

export type BucketName =
  | "read_cheap"
  | "read_moderate"
  | "write_single"
  | "write_bulk"
  | "write_expensive"
  | "destructive_ops";
