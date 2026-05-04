import { v } from "convex/values";
import { components } from "../../../_generated/api";
import { agentQuery } from "../../functions";

// Severity ranking for sorting items so the worst-off ones surface first.
// Lower number = more urgent. Mirrors the recommendation order used in the
// /accounts page reconnect banner.
const STATE_SEVERITY: Record<string, number> = {
    error: 0,
    "re-consent-required": 1,
    syncing: 2,
    ready: 3,
};

type ItemHealth = {
    plaidItemId: string;
    itemId: string;
    state: "syncing" | "ready" | "error" | "re-consent-required";
    recommendedAction: "reconnect" | "reconnect_for_new_accounts" | "wait" | "contact_support" | null;
    reasonCode: string;
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
};

function daysSince(ms: number | null): number | null {
    if (ms == null) return null;
    return Math.floor((Date.now() - ms) / (24 * 60 * 60 * 1000));
}

function buildSummary(items: ItemHealth[]): string {
    if (items.length === 0) return "No bank connections linked yet";
    const counts = { healthy: 0, syncing: 0, needsReconnect: 0, errored: 0 };
    for (const item of items) {
        if (item.state === "ready" && item.recommendedAction === null) counts.healthy += 1;
        else if (item.state === "ready" && item.recommendedAction === "reconnect_for_new_accounts") counts.needsReconnect += 1;
        else if (item.state === "syncing") counts.syncing += 1;
        else if (item.state === "re-consent-required") counts.needsReconnect += 1;
        else counts.errored += 1;
    }
    const parts: string[] = [];
    if (counts.healthy > 0) parts.push(`${counts.healthy} healthy`);
    if (counts.syncing > 0) parts.push(`${counts.syncing} syncing`);
    if (counts.needsReconnect > 0)
        parts.push(`${counts.needsReconnect} need${counts.needsReconnect === 1 ? "s" : ""} reconnect`);
    if (counts.errored > 0) parts.push(`${counts.errored} errored`);
    return parts.join(", ");
}

export const getPlaidHealth = agentQuery({
    args: {},
    returns: v.any(),
    handler: async (ctx) => {
        const viewer = ctx.viewerX();

        // Wired to the Plaid component's W4 health query (added when ItemHealth
        // shipped). Returns viewer-scoped item rows; the component already
        // filters out `status === "deleting"` rows so the agent never surfaces
        // mid-cascade items.
        const rawItems = (await ctx.runQuery(components.plaid.public.getItemHealthByUser, {
            userId: viewer.externalId,
        })) as ItemHealth[];

        // Sort: most-urgent state first (error > re-consent > syncing > ready),
        // tiebreak by oldest sync ascending so the staler item rises to the top
        // when two items share severity.
        const sorted = [...rawItems].sort((a, b) => {
            const sa = STATE_SEVERITY[a.state] ?? 99;
            const sb = STATE_SEVERITY[b.state] ?? 99;
            if (sa !== sb) return sa - sb;
            const la = a.lastSyncedAt ?? 0;
            const lb = b.lastSyncedAt ?? 0;
            return la - lb;
        });

        // Surface a chat-friendly per-item record. Strip institutionLogoBase64
        // (potentially huge) so we don't blow up the agent message payload —
        // the LLM never needs to see image bytes.
        const items = sorted.map((item) => ({
            plaidItemId: item.plaidItemId,
            institutionName: item.institutionName ?? "Unknown bank",
            state: item.state,
            recommendedAction: item.recommendedAction,
            reasonCode: item.reasonCode,
            isActive: item.isActive,
            lastSyncedAt: item.lastSyncedAt,
            daysSinceLastSync: daysSince(item.lastSyncedAt),
            errorCode: item.errorCode,
            errorMessage: item.errorMessage,
            circuitState: item.circuitState,
            consecutiveFailures: item.consecutiveFailures,
        }));

        return {
            // Surface plaidItemIds so future drill-down (and the
            // deriveSummary count fallback) reflects per-item granularity.
            ids: items.map((i) => i.plaidItemId),
            preview: {
                items,
                summary: buildSummary(sorted),
                live: true,
                capturedAt: new Date().toISOString(),
            },
            window: undefined,
        };
    },
});
