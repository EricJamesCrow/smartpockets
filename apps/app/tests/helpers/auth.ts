import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import type { Page } from "@playwright/test";

/**
 * Signs the Playwright `page` into a dedicated Clerk test user using the
 * `clerk.signIn` helper from `@clerk/testing/playwright`. After this returns
 * the page is authenticated as that user and Convex queries / mutations
 * resolve `viewer` from the matching `users` row (auto-created on first
 * navigation by `apps/app/src/app/(app)/layout.tsx`'s `ensureCurrentUser`).
 *
 * ## Sign-in strategy
 *
 * Preferred path (default): pass `emailAddress` to `clerk.signIn`. With
 * `CLERK_SECRET_KEY` set in the environment, that helper:
 *
 *   1. Calls Clerk's Backend SDK (`signInTokens.createSignInToken`) to mint a
 *      short-lived ticket for the user identified by email.
 *   2. Runs `signIn.create({ strategy: "ticket", ticket })` in the page,
 *      which the Frontend API consumes by setting the `__session` cookie on
 *      the page context. No password is exchanged — the ticket is signed by
 *      Clerk and the verification step is skipped.
 *
 * Fallback: if only `E2E_CLERK_USER_PASSWORD` is provided (the older flow
 * documented in the project's `tests/README.md`), the helper signs in with
 * `strategy: "password"` using the password from env. This path still works
 * locally for projects that haven't provisioned the Backend SDK route, but
 * it's slower and requires the dev Clerk instance to have password auth on
 * for the test user.
 *
 * ## Why we navigate to `/e2e-bootstrap` first
 *
 * `clerk.signIn` waits for `window.Clerk` to be defined before running its
 * `signIn.create` call. The app's middleware (`apps/app/src/middleware.ts`)
 * redirects every unauthenticated, non-API route to the marketing site
 * (`localhost:3001` in dev), which Playwright's `webServer` block does not
 * boot — yielding `ECONNREFUSED` on every nav. The dedicated
 * `/e2e-bootstrap` route is excluded from that redirect (in non-production
 * only) and renders `<ClerkProvider>` from the root layout, giving us a
 * place to land where `window.Clerk` actually loads.
 *
 * Required env (typically supplied via `.env.local` locally and GitHub
 * Actions secrets in CI):
 *
 *   - `E2E_CLERK_USER_USERNAME` — email of the dev Clerk user.
 *   - `CLERK_SECRET_KEY` — server-side Clerk key (required for the
 *     preferred `emailAddress` flow). The same key the global setup uses to
 *     mint the testing token.
 *   - `E2E_CLERK_USER_PASSWORD` — only required if `CLERK_SECRET_KEY` is
 *     unset (fallback password flow).
 *
 * Throws (with a clear hint) if the env vars are missing — this is far less
 * confusing than Clerk's generic "session not found" error you'd otherwise
 * see at navigation time.
 */
export async function signInTestUser(page: Page): Promise<void> {
    const username = process.env.E2E_CLERK_USER_USERNAME;
    if (!username) {
        throw new Error(
            "[tests/auth] Missing E2E_CLERK_USER_USERNAME. Add it to apps/app/.env.local for local runs, or to GitHub Actions secrets for CI.",
        );
    }

    const secretKey = process.env.CLERK_SECRET_KEY;
    const password = process.env.E2E_CLERK_USER_PASSWORD;
    if (!secretKey && !password) {
        throw new Error(
            "[tests/auth] Missing CLERK_SECRET_KEY (preferred ticket flow) and E2E_CLERK_USER_PASSWORD (fallback password flow). Provide at least one — see apps/app/tests/README.md.",
        );
    }

    await setupClerkTestingToken({ page });

    // Land on the public bootstrap route — see file-level docstring for why
    // this is preferable to navigating to `/` (middleware-redirected) or
    // `/sign-in` (only exists in apps/web). The page renders
    // `<ClerkProvider>` from the root layout, so `window.Clerk` is loaded
    // by the time the next call runs.
    await page.goto("/e2e-bootstrap");
    await page.waitForSelector('[data-test="e2e-bootstrap-root"]', {
        timeout: 30_000,
    });

    if (secretKey) {
        // Backend-SDK-ticket flow. `clerk.signIn` will mint a ticket via
        // `signInTokens.createSignInToken` and run `signIn.create` on the
        // page. No password exchange, no MFA prompts.
        await clerk.signIn({ page, emailAddress: username });
    } else {
        // Legacy password flow. Kept for callers that haven't yet
        // configured `CLERK_SECRET_KEY` in their `.env.local`.
        await clerk.signIn({
            page,
            signInParams: {
                strategy: "password",
                identifier: username,
                password: password as string,
            },
        });
    }
}

/**
 * Convenience wrapper used by per-spec `beforeEach` to sign in and land on the
 * post-auth chat root. After `clerk.signIn`, the previous page is still
 * `/e2e-bootstrap`; the app redirects to `/` once the session is hydrated. We
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
