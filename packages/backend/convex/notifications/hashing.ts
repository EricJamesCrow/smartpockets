/**
 * Canonical idempotency-key utility. Single source of truth for
 * application-layer dedup across W5 proposals, W6 intel triggers,
 * and W7 email dispatch. Do not fork.
 *
 * Strategy C-prime (specs/00-idempotency-semantics.md §4.4): this
 * hash feeds the DB-level unique constraint on `agentProposals.contentHash`
 * and `emailEvents.idempotencyKey`. Two concurrent callers with the same
 * input compute the same hash; only one insert wins; the other catches
 * the unique-constraint error and returns the pre-existing row.
 */

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function idempotencyKey(input: {
  userId: string;
  scope: string;
  threadId?: string;
  cadence?: number;
  ids?: string[];
  dateBucket?: string;
}): Promise<string> {
  const canonical = JSON.stringify({
    u: input.userId,
    s: input.scope,
    t: input.threadId ?? null,
    c: input.cadence ?? null,
    i: input.ids ? [...input.ids].sort() : null,
    d: input.dateBucket ?? null,
  });
  return sha256Hex(canonical);
}
