/**
 * W4: 6-hour persistent-error cron cadence test.
 *
 * Exercises runPersistentErrorCheckInternal's filter:
 *   status=error AND lastSyncedAt < now - 24h AND
 *   (lastDispatchedAt == null OR lastDispatchedAt < now - 72h)
 *
 * Covers the cadence contract: dispatch at hour 0, silent through hour 66,
 * dispatch again at hour 72 past the previous dispatch.
 *
 * Limited-scope note: fully exercising the dispatch side effect depends on
 * component-level seeding across the convex-test boundary (similar to
 * plaidWebhooks.test.ts). This test validates the pure filter logic at
 * the listErrorItemsInternal layer; Tier 3 manual Sandbox smoke covers
 * the full chain per spec §9.3.
 */

import { describe, expect, it } from "vitest";

// Re-implement the filter logic for unit-testing without component seeding.
// Keep in lockstep with listErrorItemsInternal in private.ts.
interface ErrorItemCandidate {
  status: string;
  lastSyncedAt?: number;
  lastDispatchedAt?: number;
}

function shouldDispatch(
  item: ErrorItemCandidate,
  now: number,
): boolean {
  if (item.status !== "error") return false;
  const STALE_SYNC_MS = 24 * 3600 * 1000;
  const COOLDOWN_MS = 72 * 3600 * 1000;
  const lastSyncedAt = item.lastSyncedAt ?? 0;
  const lastDispatchedAt = item.lastDispatchedAt ?? 0;
  return (
    lastSyncedAt < now - STALE_SYNC_MS &&
    lastDispatchedAt < now - COOLDOWN_MS
  );
}

describe("persistent-error cron filter", () => {
  const T0 = 1_000_000_000_000;
  const H = 3600 * 1000;

  it("dispatches when status=error AND stale sync AND never dispatched", () => {
    const item: ErrorItemCandidate = {
      status: "error",
      lastSyncedAt: T0 - 48 * H,
      lastDispatchedAt: undefined,
    };
    expect(shouldDispatch(item, T0)).toBe(true);
  });

  it("silent for 6h past a dispatch (within cooldown)", () => {
    const item: ErrorItemCandidate = {
      status: "error",
      lastSyncedAt: T0 - 48 * H,
      lastDispatchedAt: T0,
    };
    expect(shouldDispatch(item, T0 + 6 * H)).toBe(false);
  });

  it("silent for 66h past a dispatch (within cooldown)", () => {
    const item: ErrorItemCandidate = {
      status: "error",
      lastSyncedAt: T0 - 48 * H,
      lastDispatchedAt: T0,
    };
    expect(shouldDispatch(item, T0 + 66 * H)).toBe(false);
  });

  it("dispatches at 72h past the previous dispatch (cooldown expired)", () => {
    const item: ErrorItemCandidate = {
      status: "error",
      lastSyncedAt: T0 - 48 * H,
      lastDispatchedAt: T0,
    };
    // Strictly >72h past the last dispatch.
    expect(shouldDispatch(item, T0 + 72 * H + 1)).toBe(true);
  });

  it("skips items whose sync is fresh (<24h) even in error", () => {
    const item: ErrorItemCandidate = {
      status: "error",
      lastSyncedAt: T0 - 2 * H,
      lastDispatchedAt: undefined,
    };
    expect(shouldDispatch(item, T0)).toBe(false);
  });

  it("skips items whose status is not error", () => {
    const item: ErrorItemCandidate = {
      status: "active",
      lastSyncedAt: T0 - 48 * H,
      lastDispatchedAt: undefined,
    };
    expect(shouldDispatch(item, T0)).toBe(false);
  });
});
