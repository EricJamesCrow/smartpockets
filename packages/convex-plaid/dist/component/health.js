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
import { mapErrorCodeToReason } from "./reasonCode.js";
export function derive(item, institution, lastWebhookAt) {
    const base = {
        plaidItemId: String(item._id),
        itemId: item.itemId,
        isActive: item.isActive ?? true,
        institutionId: institution.institutionId,
        institutionName: institution.institutionName,
        institutionLogoBase64: institution.institutionLogoBase64,
        institutionPrimaryColor: institution.institutionPrimaryColor,
        lastSyncedAt: item.lastSyncedAt ?? null,
        lastWebhookAt,
        errorCode: item.errorCode ?? null,
        errorMessage: item.errorMessage ?? null,
        circuitState: (item.circuitState ?? "closed"),
        consecutiveFailures: item.consecutiveFailures ?? 0,
        nextRetryAt: item.nextRetryAt ?? null,
        newAccountsAvailableAt: item.newAccountsAvailableAt ?? null,
    };
    if (item.status === "deleting") {
        return {
            ...base,
            state: "error",
            recommendedAction: null,
            reasonCode: "permanent_unknown",
        };
    }
    if (item.status === "needs_reauth") {
        const reason = (item.reauthReason ?? "").toLowerCase();
        const reasonCode = reason.includes("expir")
            ? "auth_required_expiration"
            : "auth_required_login";
        return {
            ...base,
            state: "re-consent-required",
            recommendedAction: "reconnect",
            reasonCode,
        };
    }
    if (base.circuitState === "open") {
        return {
            ...base,
            state: "error",
            recommendedAction: "wait",
            reasonCode: "transient_circuit_open",
        };
    }
    if (item.status === "error") {
        const reasonCode = mapErrorCodeToReason(base.errorCode);
        const recommendedAction = reasonCode.startsWith("transient_") ? "wait" : "contact_support";
        return {
            ...base,
            state: "error",
            recommendedAction,
            reasonCode,
        };
    }
    if (base.circuitState === "half_open") {
        return {
            ...base,
            state: "syncing",
            recommendedAction: null,
            reasonCode: "syncing_incremental",
        };
    }
    if (item.status === "pending") {
        return {
            ...base,
            state: "syncing",
            recommendedAction: null,
            reasonCode: "syncing_initial",
        };
    }
    if (item.status === "syncing") {
        return {
            ...base,
            state: "syncing",
            recommendedAction: null,
            reasonCode: "syncing_incremental",
        };
    }
    if (item.status === "active" && item.newAccountsAvailableAt != null) {
        return {
            ...base,
            state: "ready",
            recommendedAction: "reconnect_for_new_accounts",
            reasonCode: "new_accounts_available",
        };
    }
    if (item.status === "active") {
        return {
            ...base,
            state: "ready",
            recommendedAction: null,
            reasonCode: "healthy",
        };
    }
    return {
        ...base,
        state: "error",
        recommendedAction: null,
        reasonCode: "permanent_unknown",
    };
}
//# sourceMappingURL=health.js.map