// apps/app/src/lib/mcp/bridge-client.ts
//
// Server-to-server client for the Convex /mcp-tools HTTP action
// (packages/backend/convex/http.ts). The MCP route verifies the caller's
// Clerk OAuth token, then runs read tools as that user via this bridge,
// authenticated with MCP_BRIDGE_SECRET. Clerk OAuth access tokens are opaque
// to Convex, so user tokens are never forwarded — see
// docs/decisions/0001-mcp-server-oauth-rebuild.md.

/** Card doc shape as returned by the bridge (creditCards table doc subset). */
export interface BridgeCard {
    _id: string;
    accountId: string;
    displayName: string;
    company?: string | null;
    brand?: "visa" | "mastercard" | "amex" | "discover" | "other" | null;
    lastFour?: string | null;
    currentBalance?: number | null;
    availableCredit?: number | null;
    creditLimit?: number | null;
    minimumPaymentAmount?: number | null;
    nextPaymentDueDate?: string | null;
    isOverdue?: boolean;
    lastStatementBalance?: number | null;
    lastStatementIssueDate?: string | null;
    lastPaymentAmount?: number | null;
    lastPaymentDate?: string | null;
    aprs?: Array<{
        aprPercentage: number;
        aprType: string;
        balanceSubjectToApr?: number | null;
        interestChargeAmount?: number | null;
    }> | null;
    isLocked?: boolean;
    syncStatus?: "synced" | "syncing" | "error" | "stale" | null;
    lastSyncedAt?: number | null;
}

/** Transaction shape as returned by the bridge (milliunit amounts). */
export interface BridgeTransaction {
    _id: string;
    date: string;
    merchantName?: string | null;
    name?: string | null;
    amount: number;
    categoryPrimary?: string | null;
    pending?: boolean;
}

export interface BridgeStats {
    totalBalance: number;
    totalAvailableCredit: number;
    totalCreditLimit: number;
    averageUtilization: number;
    overdueCount: number;
    lockedCount: number;
    cardCount: number;
}

type BridgeResult<T> = { ok: true; data: T } | { ok: false; error: string; detail?: string };

function convexSiteUrl(): string {
    const explicit = process.env.CONVEX_SITE_URL;
    if (explicit) return explicit.replace(/\/$/, "");
    const cloud = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!cloud) {
        throw new Error("NEXT_PUBLIC_CONVEX_URL (or CONVEX_SITE_URL) is required for the MCP bridge");
    }
    return cloud.replace(/\/$/, "").replace(".convex.cloud", ".convex.site");
}

/**
 * Run a read tool on the Convex bridge as the user identified by Clerk
 * `externalId`. Throws on transport/config errors; returns the bridge's
 * typed result otherwise.
 */
export async function callMcpBridge<T>(
    tool: string,
    args: Record<string, unknown>,
    externalId: string,
): Promise<BridgeResult<T>> {
    const secret = process.env.MCP_BRIDGE_SECRET;
    if (!secret) {
        throw new Error("MCP_BRIDGE_SECRET is not configured");
    }

    const res = await fetch(`${convexSiteUrl()}/mcp-tools`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ externalId, tool, args }),
        cache: "no-store",
    });

    if (!res.ok && res.status !== 200) {
        const text = await res.text().catch(() => "");
        throw new Error(`MCP bridge error ${res.status}: ${text.slice(0, 200)}`);
    }

    return (await res.json()) as BridgeResult<T>;
}
