import { describe, expect, it } from "vitest";
import { signUnsubscribeToken, verifyUnsubscribeToken } from "../unsubscribeToken";

describe("unsubscribe token", () => {
    const key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    it("signs and verifies a fresh token", async () => {
        const token = await signUnsubscribeToken({ userId: "u1", templateKey: "welcome-onboarding" }, key);
        const verified = await verifyUnsubscribeToken(token, key);
        expect(verified.ok).toBe(true);
        if (verified.ok) {
            expect(verified.data.userId).toBe("u1");
            expect(verified.data.templateKey).toBe("welcome-onboarding");
            expect(verified.data.expired).toBe(false);
        }
    });

    it("rejects an invalid signature", async () => {
        const token = await signUnsubscribeToken({ userId: "u1", templateKey: "welcome-onboarding" }, key);
        const tampered = token.slice(0, -5) + "XXXXX";
        const verified = await verifyUnsubscribeToken(tampered, key);
        expect(verified.ok).toBe(false);
    });

    it("rejects malformed tokens", async () => {
        const verified = await verifyUnsubscribeToken("not-a-token", key);
        expect(verified.ok).toBe(false);
        if (!verified.ok) {
            expect(verified.reason).toBe("malformed");
        }
    });

    it("marks expired but still verifiable after 30 days", async () => {
        const expiredTs = Date.now() - 40 * 24 * 60 * 60 * 1000;
        const expiredToken = await signUnsubscribeToken({ userId: "u1", templateKey: "welcome-onboarding", ts: expiredTs }, key);
        const verified = await verifyUnsubscribeToken(expiredToken, key);
        expect(verified.ok).toBe(true);
        if (verified.ok) expect(verified.data.expired).toBe(true);
    });

    // Regression: base64url padding logic was wrong for non-multiple-of-4
    // payload lengths (CROWDEV-360). Real fresh tokens encode to lengths
    // like 66 chars; verification used to fail with reason "unparseable".
    it.each([
        ["short userId", "u1", "welcome-onboarding"],
        ["medium userId", "user_abcdef", "welcome-onboarding"],
        ["longer template", "u1", "item-error-persistent"],
    ])("verifies tokens for various encoded lengths: %s", async (_, userId, templateKey) => {
        const token = await signUnsubscribeToken({ userId, templateKey }, key);
        const verified = await verifyUnsubscribeToken(token, key);
        expect(verified.ok).toBe(true);
        if (verified.ok) {
            expect(verified.data.userId).toBe(userId);
            expect(verified.data.templateKey).toBe(templateKey);
        }
    });
});
