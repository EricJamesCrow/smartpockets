/**
 * MCP server OAuth surface (CROWDEV-54) — unauthenticated behavior.
 *
 * The full OAuth flow (dynamic client registration + browser consent) is
 * exercised manually with a stock client (see docs/mcp.md). These tests pin
 * the discovery contract every client depends on BEFORE authenticating:
 *
 * - /api/mcp rejects unauthenticated requests with 401 + WWW-Authenticate
 *   pointing at the protected-resource metadata
 * - the RFC 9728 protected-resource metadata is served and names Clerk as
 *   the authorization server
 * - the RFC 8414 authorization-server metadata is reachable at this origin
 */
import { expect, test } from "@playwright/test";

test.describe("MCP OAuth discovery", () => {
    test("unauthenticated tools/list gets 401 with resource metadata pointer", async ({ request }) => {
        const res = await request.post("/api/mcp", {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json, text/event-stream",
            },
            data: { jsonrpc: "2.0", id: 1, method: "tools/list" },
        });
        expect(res.status()).toBe(401);
        const www = res.headers()["www-authenticate"] ?? "";
        expect(www).toContain("Bearer");
        expect(www).toContain("resource_metadata");
        expect(www).toContain("/.well-known/oauth-protected-resource/api/mcp");
    });

    test("protected resource metadata names an authorization server", async ({ request }) => {
        const res = await request.get("/.well-known/oauth-protected-resource/api/mcp");
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body.authorization_servers)).toBe(true);
        expect(body.authorization_servers.length).toBeGreaterThan(0);
        expect(body.scopes_supported).toContain("profile");
    });

    test("authorization server metadata is served at this origin", async ({ request }) => {
        const res = await request.get("/.well-known/oauth-authorization-server");
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(typeof body.authorization_endpoint).toBe("string");
        expect(typeof body.token_endpoint).toBe("string");
    });
});
