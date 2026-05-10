import type { Page } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

/**
 * Convex test-data seeding helpers.
 *
 * The two helpers (`seedTestThreads`, `cleanupTestThreads`) are thin wrappers
 * around the dev-only Convex mutations `agent.threads.createTestThread` and
 * `agent.threads.deleteAllTestThreads` defined in
 * `packages/backend/convex/agent/threads.ts`. Those mutations refuse to run on
 * a `prod:*` deployment.
 *
 * ## Why a Node-side Convex client (not page.evaluate)?
 *
 * The first revision of these helpers used `page.evaluate(...)` to call the
 * already-provisioned in-app Convex React client. That works, but only if
 * something exposes the client on `window`, which we'd rather avoid (it would
 * leak in dev). Using `convex/browser`'s `ConvexHttpClient` directly from
 * Node is simpler — we just need a JWT for the signed-in test user.
 *
 * The browser-side Convex client gets that JWT for free via Clerk's
 * `useAuth().getToken({ template: "convex" })`. We replicate that here by
 * pulling the token from the page after sign-in (`page.evaluate(() =>
 * window.Clerk.session.getToken({ template: "convex" }))`) and passing it to
 * the Node-side client via `setAuth()`. This keeps the test user identity
 * consistent between page-side and Node-side calls — both run as the same
 * Clerk user.
 */

interface SeedOptions {
    page: Page;
    convexUrl: string;
    titles: readonly string[];
}

interface CleanupOptions {
    page: Page;
    convexUrl: string;
}

/**
 * Reads the Clerk session JWT (Convex template) from the page. Requires the
 * test to have already signed in via `clerk.signIn` so `window.Clerk.session`
 * exists.
 */
async function getConvexAuthToken(page: Page): Promise<string> {
    const token = await page.evaluate(async () => {
        // `window.Clerk` is injected by `<ClerkProvider>` and has the active
        // session once the user is signed in.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clerk = (window as unknown as { Clerk?: any }).Clerk;
        if (!clerk?.session) return null;
        const t = await clerk.session.getToken({ template: "convex" });
        return typeof t === "string" ? t : null;
    });
    if (!token) {
        throw new Error(
            "[seed-thread] Could not read Convex JWT from window.Clerk.session — has the test signed in via setupClerkTestingToken+signIn before calling seedTestThreads?",
        );
    }
    return token;
}

/**
 * Wipes all of the signed-in test user's threads and re-creates the requested
 * titles. Returns the list of created thread ids in input order.
 */
export async function seedTestThreads({
    page,
    convexUrl,
    titles,
}: SeedOptions): Promise<readonly string[]> {
    const token = await getConvexAuthToken(page);
    const client = new ConvexHttpClient(convexUrl);
    client.setAuth(token);

    // Reset first so reruns don't accumulate threads.
    await client.mutation(api.agent.threads.deleteAllTestThreads, {});

    const ids: string[] = [];
    for (const title of titles) {
        const id = await client.mutation(api.agent.threads.createTestThread, { title });
        ids.push(id);
    }
    return ids;
}

/**
 * Hard-deletes every thread for the signed-in test user. Use in `afterEach` /
 * `afterAll` to avoid bleed between tests when seeding wasn't called per-test.
 */
export async function cleanupTestThreads({
    page,
    convexUrl,
}: CleanupOptions): Promise<number> {
    const token = await getConvexAuthToken(page);
    const client = new ConvexHttpClient(convexUrl);
    client.setAuth(token);
    return await client.mutation(api.agent.threads.deleteAllTestThreads, {});
}
