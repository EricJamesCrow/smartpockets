import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

/**
 * Runs once per Playwright run (declared as a project dependency in
 * `playwright.config.ts`). `clerkSetup()` reaches out to Clerk's testing
 * API using `CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` and stashes a
 * Testing Token in `process.env.CLERK_TESTING_TOKEN`. Each spec then calls
 * `setupClerkTestingToken({ page })` to inject that token into the page so
 * Clerk skips bot-detection challenges in automated runs.
 *
 * Required env (any of):
 *   - `CLERK_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`)
 *   - `CLERK_SECRET_KEY`
 *
 * In CI these come from GitHub Actions secrets; locally from `.env.local`.
 */
setup.describe.configure({ mode: "serial" });

setup("clerk testing token bootstrap", async ({}) => {
    // Mirror the public Clerk env var into the secret-style name `clerkSetup`
    // expects, so callers don't need to duplicate the value.
    if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
        process.env.CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    }
    await clerkSetup();
});
