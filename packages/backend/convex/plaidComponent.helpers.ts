/**
 * Pure helpers for the Plaid component wrapper actions.
 *
 * Extracted so the orchestration logic in `plaidComponent.ts` is unit-testable
 * without spinning up a Convex deployment.
 */

export type EnrichAccountType = "credit" | "depository";

/**
 * Map a Plaid account.type onto the value `/transactions/enrich` expects.
 *
 * Plaid Enrich accepts only `"credit"` or `"depository"`. Loan / investment /
 * other are rejected by the API, so we surface them as `undefined` so the
 * caller can skip them.
 */
export function mapAccountTypeForEnrich(
  plaidAccountType: string | null | undefined
): EnrichAccountType | undefined {
  if (plaidAccountType === "credit") return "credit";
  if (plaidAccountType === "depository") return "depository";
  return undefined;
}

/**
 * Pick the best `description` field for /transactions/enrich.
 *
 * Plaid's Enrich docs explicitly say the input should be the raw bank-statement
 * descriptor — that's `originalDescription` (only present when sync ran with
 * `include_original_description: true`). When that's absent, fall back to
 * Plaid's lightly-cleaned `name`, then to the cleaned `merchantName` as a
 * last resort.
 */
export function pickEnrichDescription(t: {
  originalDescription?: string | null;
  name?: string | null;
  merchantName?: string | null;
}): string | undefined {
  if (t.originalDescription && t.originalDescription.length > 0) return t.originalDescription;
  if (t.name && t.name.length > 0) return t.name;
  if (t.merchantName && t.merchantName.length > 0) return t.merchantName;
  return undefined;
}

/**
 * Infer Plaid's `direction` from a stored milliunits amount.
 *
 * Plaid's transaction amounts are positive for debits (money leaving the
 * account, i.e. purchases) and negative for credits (refunds, deposits). The
 * Enrich API's `direction` field mirrors that: `OUTFLOW` for purchases,
 * `INFLOW` for incoming money. Zero is treated as `OUTFLOW` to match Plaid's
 * default for ambiguous flows.
 */
export function inferEnrichDirection(
  amountMilliunits: number
): "INFLOW" | "OUTFLOW" {
  return amountMilliunits < 0 ? "INFLOW" : "OUTFLOW";
}
