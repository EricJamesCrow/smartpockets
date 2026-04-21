import { createHash } from "crypto";

export type IdempotencyInput = {
  userId: string;
  scope: string;
  threadId?: string;
  cadence?: number;
  ids?: string[];
  dateBucket?: string;
};

export function idempotencyKey(input: IdempotencyInput): string {
  const canonical = JSON.stringify({
    u: input.userId,
    s: input.scope,
    t: input.threadId ?? null,
    c: input.cadence ?? null,
    i: input.ids ? [...input.ids].sort() : null,
    d: input.dateBucket ?? null,
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
