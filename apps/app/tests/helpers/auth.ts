import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import type { Page } from "@playwright/test";

/**
 * Signs the Playwright `page` into a dedicated Clerk test user using the
 * `clerk.signIn` helper from `@clerk/testing/playwright`. After this returns
 * the page is authenticated as that user and Convex queries / mutations
 * resolve `viewer` from the matching `users` row (auto-created on first
 * navigation by `apps/app/src/app/(app)/layout.tsx`'s `ensureCurrentUser`).
 *
 * Required env (typically supplied via `.env.local` locally and GitHub
 * Actions secrets in CI):
 *
 *   - `E2E_CLERK_USER_USERNAME` — username or email of the dev Clerk user.
 *   - `E2E_CLERK_USER_PASSWORD` — that user's password.
 *
 * Throws (with a clear hint) if the env vars are missing — this is far less
 * confusing than Clerk's generic "session not found" error you'd otherwise
 * see at navigation time.
 */
export async function signInTestUser(page: Page): Promise<void> {
    const username = process.env.E2E_CLERK_USER_USERNAME;
    const password = process.env.E2E_CLERK_USER_PASSWORD;
    if (!username || !password) {
        throw new Error(
            "[tests/auth] Missing E2E_CLERK_USER_USERNAME / E2E_CLERK_USER_PASSWORD. Add them to apps/app/.env.local for local runs, or to GitHub Actions secrets for CI.",
        );
    }

    await setupClerkTestingToken({ page });

    // `clerk.signIn` needs the page to be on a route that has the Clerk client
    // bootstrapped. The app's `/` is gated by middleware → `/sign-in`, which
    // renders `<ClerkProvider>` and thus exposes `window.Clerk`. We navigate
    // there explicitly so signIn doesn't race with Next's redirect dance.
    await page.goto("/sign-in");

    await clerk.signIn({
        page,
        signInParams: { strategy: "password", identifier: username, password },
    });
}

/**
 * Convenience wrapper used by per-spec `beforeEach` to sign in and land on the
 * post-auth chat root. After `clerk.signIn`, the previous page is still
 * `/sign-in`; the app redirects to `/` once the session is hydrated. We
 * navigate explicitly to drop the redirect-bounce timing issue.
 */
export async function signInAndGoHome(page: Page): Promise<void> {
    await signInTestUser(page);
    await page.goto("/");
    // Wait for the auth-bootstrapped layout to settle (sidebar mounts).
    // `[aria-label="Conversation history"]` lives on the chat-history nav,
    // mounted only after `viewer` resolves in `(app)/layout.tsx`.
    await page.waitForSelector("nav, aside", { timeout: 30_000 });
}
