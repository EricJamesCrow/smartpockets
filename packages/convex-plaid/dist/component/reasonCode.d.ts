/**
 * Structured reason codes for Plaid item health.
 *
 * Maps Plaid error codes (and non-error states) to a stable enum the host app
 * translates to user-facing copy. See W4 spec Section 6.5 for the canonical
 * table. This module is pure and side-effect-free; do not add side effects.
 */
export type ReasonCode = "healthy" | "syncing_initial" | "syncing_incremental" | "auth_required_login" | "auth_required_expiration" | "transient_circuit_open" | "transient_institution_down" | "transient_rate_limited" | "permanent_invalid_token" | "permanent_item_not_found" | "permanent_no_accounts" | "permanent_access_not_granted" | "permanent_products_not_supported" | "permanent_institution_unsupported" | "permanent_revoked" | "permanent_unknown" | "new_accounts_available";
export declare function mapErrorCodeToReason(errorCode: string | null): ReasonCode;
//# sourceMappingURL=reasonCode.d.ts.map