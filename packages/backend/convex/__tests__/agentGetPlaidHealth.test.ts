/**
 * Regression tests for CROWDEV-349:
 *   `get_plaid_health` agent tool was a W2.11 stub that always returned
 *   { ids: [], preview: { items: [] } } regardless of state. User questions
 *   like "Are any of my Plaid connections broken?" returned nothing useful
 *   even when an item was in error / re-consent-required state.
 *
 *   This test pins the now-real implementation to:
 *     - return one row per linked plaidItem with state, recommendedAction,
 *       reasonCode, daysSinceLastSync
 *     - sort by severity (error > re-consent > syncing > ready)
 *     - surface a chat-friendly summary line
 *     - reject cross-user item leakage
 */

import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { components, internal } from "../_generated/api";
import plaidSchema from "../../../convex-plaid/src/component/schema";

const modules = import.meta.glob("../**/*.ts");
const plaidModules = import.meta.glob("../../../convex-plaid/src/component/**/*.ts");

function setup() {
    const t = convexTest(schema, modules);
    t.registerComponent("plaid", plaidSchema as any, plaidModules);
    return t;
}

async function seedUser(t: any, externalId: string): Promise<string> {
    return await t.run(async (ctx: any) => {
        return await ctx.db.insert("users", {
            externalId,
            email: `${externalId}@example.test`,
        });
    });
}

async function seedPlaidItem(
    t: any,
    userId: string,
    suffix: string,
    status: "active" | "syncing" | "error" | "needs_reauth" = "active",
    institutionName = "Test Bank",
): Promise<string> {
    const institutionId = `ins_test_${suffix}`;
    // Seed the shared plaidInstitutions row that getInstitutionSnapshot reads
    // for institutionName/logo/color. createPlaidItem stores institutionName
    // on the item itself, but getItemHealthByUser ignores that field and
    // looks up the institutions table.
    await t.mutation((components as any).plaid.private.upsertInstitution, {
        institutionId,
        name: institutionName,
    });
    return (await t.mutation((components as any).plaid.private.createPlaidItem, {
        userId,
        itemId: `plaid_item_${userId}${suffix}`,
        accessToken: `access_token_${userId}${suffix}`,
        institutionId,
        institutionName,
        products: ["transactions"],
        isActive: true,
        status,
    })) as string;
}

describe("get_plaid_health agent tool (CROWDEV-349)", () => {
    it("returns clean ready/active rows when all items are healthy", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_ph_a");
        await seedPlaidItem(t, "user_ph_a", "_a", "active", "Chase");
        await seedPlaidItem(t, "user_ph_a", "_b", "active", "Wells Fargo");

        const out = (await t.query(
            (internal as any).agent.tools.read.getPlaidHealth.getPlaidHealth,
            { userId },
        )) as {
            ids: string[];
            preview: {
                items: Array<{ institutionName: string; state: string; recommendedAction: string | null; reasonCode: string }>;
                summary: string;
            };
        };

        // Bug regression: previously this returned []. Now we expect both items.
        expect(out.ids).toHaveLength(2);
        expect(out.preview.items).toHaveLength(2);
        for (const item of out.preview.items) {
            expect(item.state).toBe("ready");
            expect(item.recommendedAction).toBeNull();
            expect(item.reasonCode).toBe("healthy");
        }
        expect(out.preview.summary).toMatch(/2 healthy/i);
    });

    it("sorts items by severity (error > re-consent > syncing > ready)", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_ph_b");
        await seedPlaidItem(t, "user_ph_b", "_healthy", "active", "Healthy Bank");
        await seedPlaidItem(t, "user_ph_b", "_syncing", "syncing", "Syncing Bank");
        await seedPlaidItem(t, "user_ph_b", "_reauth", "needs_reauth", "Reauth Bank");
        await seedPlaidItem(t, "user_ph_b", "_error", "error", "Error Bank");

        const out = (await t.query(
            (internal as any).agent.tools.read.getPlaidHealth.getPlaidHealth,
            { userId },
        )) as { preview: { items: Array<{ institutionName: string; state: string }>; summary: string } };

        // Severity order: error → re-consent-required → syncing → ready.
        expect(out.preview.items.map((i) => i.state)).toEqual([
            "error",
            "re-consent-required",
            "syncing",
            "ready",
        ]);
        expect(out.preview.items[0].institutionName).toBe("Error Bank");
        expect(out.preview.items[1].institutionName).toBe("Reauth Bank");
        // Summary should mention each non-healthy bucket.
        expect(out.preview.summary).toMatch(/1 healthy/i);
        expect(out.preview.summary).toMatch(/1 syncing/i);
        expect(out.preview.summary).toMatch(/1 needs reconnect/i);
        expect(out.preview.summary).toMatch(/1 errored/i);
    });

    it("surfaces re-consent-required state with reconnect action", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_ph_c");
        await seedPlaidItem(t, "user_ph_c", "_a", "needs_reauth", "Citi");

        const out = (await t.query(
            (internal as any).agent.tools.read.getPlaidHealth.getPlaidHealth,
            { userId },
        )) as { preview: { items: Array<{ institutionName: string; state: string; recommendedAction: string | null }> } };

        const item = out.preview.items[0];
        expect(item.institutionName).toBe("Citi");
        expect(item.state).toBe("re-consent-required");
        expect(item.recommendedAction).toBe("reconnect");
    });

    it("surfaces error state via webhook setItemError", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_ph_d");
        const itemId = `plaid_item_${"user_ph_d"}_a`;
        await seedPlaidItem(t, "user_ph_d", "_a", "active", "Bank Of Errors");
        // Mark the underlying item as errored via the public webhook helper.
        // setItemError only sets status: "error" and syncError; errorCode is
        // populated by releaseSyncLock during a real sync failure. We assert
        // the state derivation (which is what the agent actually surfaces).
        await t.mutation((components as any).plaid.private.setItemError, {
            itemId,
            errorCode: "ITEM_LOGIN_REQUIRED",
            errorMessage: "User must re-authenticate.",
        });

        const out = (await t.query(
            (internal as any).agent.tools.read.getPlaidHealth.getPlaidHealth,
            { userId },
        )) as { preview: { items: Array<{ institutionName: string; state: string; recommendedAction: string | null; reasonCode: string }>; summary: string } };

        const item = out.preview.items[0];
        expect(item.institutionName).toBe("Bank Of Errors");
        expect(item.state).toBe("error");
        // mapErrorCodeToReason("permanent_unknown") for null errorCode →
        // recommendedAction "contact_support" since reason doesn't start
        // with "transient_".
        expect(item.recommendedAction).toBe("contact_support");
        expect(out.preview.summary).toMatch(/1 errored/i);
    });

    it("returns clean empty payload when the viewer has no plaid items", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_ph_e");

        const out = (await t.query(
            (internal as any).agent.tools.read.getPlaidHealth.getPlaidHealth,
            { userId },
        )) as { ids: string[]; preview: { items: unknown[]; summary: string } };

        expect(out.ids).toEqual([]);
        expect(out.preview.items).toEqual([]);
        expect(out.preview.summary).toMatch(/no bank connections/i);
    });

    it("does not leak another user's plaid items", async () => {
        const t = setup();
        const aId = await seedUser(t, "user_ph_f");
        const bId = await seedUser(t, "user_ph_g");

        await seedPlaidItem(t, "user_ph_f", "_own", "active", "Viewer Bank");
        await seedPlaidItem(t, "user_ph_g", "_other", "needs_reauth", "Other Bank");

        const viewerOut = (await t.query(
            (internal as any).agent.tools.read.getPlaidHealth.getPlaidHealth,
            { userId: aId },
        )) as { preview: { items: Array<{ institutionName: string }> } };

        // Viewer (a) only sees their own bank, never the other user's.
        expect(viewerOut.preview.items.map((i) => i.institutionName)).toEqual(["Viewer Bank"]);

        const otherOut = (await t.query(
            (internal as any).agent.tools.read.getPlaidHealth.getPlaidHealth,
            { userId: bId },
        )) as { preview: { items: Array<{ institutionName: string }> } };
        expect(otherOut.preview.items.map((i) => i.institutionName)).toEqual(["Other Bank"]);
    });
});
