/**
 * W4: Plaid item health derivation.
 *
 * Pure function. Combines a plaidItems row with an institution snapshot and
 * the most-recent webhook timestamp into the canonical ItemHealth shape.
 *
 * Derivation order (spec §6.4):
 *   1. status === "deleting" -> filtered-out sentinel
 *   2. status === "needs_reauth" -> re-consent-required
 *   3. circuitState === "open" -> error + wait + transient_circuit_open
 *   4. status === "error" -> error (taxonomy-driven)
 *   5. circuitState === "half_open" -> syncing
 *   6. status === "pending" / "syncing" -> syncing
 *   7. status === "active" + newAccountsAvailableAt -> ready + reconnect_for_new_accounts
 *   8. status === "active" -> ready + healthy
 */
import { type ReasonCode } from "./reasonCode.js";
export interface ItemHealth {
    plaidItemId: string;
    itemId: string;
    state: "syncing" | "ready" | "error" | "re-consent-required";
    recommendedAction: "reconnect" | "reconnect_for_new_accounts" | "wait" | "contact_support" | null;
    reasonCode: ReasonCode;
    isActive: boolean;
    institutionId: string | null;
    institutionName: string | null;
    institutionLogoBase64: string | null;
    institutionPrimaryColor: string | null;
    lastSyncedAt: number | null;
    lastWebhookAt: number | null;
    errorCode: string | null;
    errorMessage: string | null;
    circuitState: "closed" | "open" | "half_open";
    consecutiveFailures: number;
    nextRetryAt: number | null;
    newAccountsAvailableAt: number | null;
}
export interface InstitutionSnapshot {
    institutionId: string | null;
    institutionName: string | null;
    institutionLogoBase64: string | null;
    institutionPrimaryColor: string | null;
}
/**
 * Minimal shape of a plaidItems row that derive() reads.
 *
 * Typed loosely (subset) so callers can pass the full doc without us depending
 * on the generated Doc<"plaidItems"> type here (keeps this module importable
 * outside the component's codegen surface).
 */
export interface PlaidItemSnapshot {
    _id: string;
    itemId: string;
    status: "pending" | "syncing" | "active" | "error" | "needs_reauth" | "deleting";
    isActive?: boolean;
    reauthReason?: string;
    errorCode?: string;
    errorMessage?: string;
    lastSyncedAt?: number;
    circuitState?: "closed" | "open" | "half_open";
    consecutiveFailures?: number;
    nextRetryAt?: number;
    newAccountsAvailableAt?: number;
}
export declare function derive(item: PlaidItemSnapshot, institution: InstitutionSnapshot, lastWebhookAt: number | null): ItemHealth;
//# sourceMappingURL=health.d.ts.map