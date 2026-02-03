/**
 * Test file to verify ctx.auth availability in Convex components
 *
 * Expected result: This will fail because components cannot access ctx.auth
 * Reference: https://docs.convex.dev/components/authoring
 */
export declare const testAuth: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    hasAuth: boolean;
    userId: string | null;
    error: null;
} | {
    hasAuth: boolean;
    userId: null;
    error: string;
}>>;
//# sourceMappingURL=testAuth.d.ts.map