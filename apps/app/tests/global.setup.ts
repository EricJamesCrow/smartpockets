import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Minimal `.env.local` / `.env` loader — `@clerk/testing`'s `clerkSetup()`
 * already does this internally (via its bundled dotenv), but we need the
 * values populated in `process.env` BEFORE we run our skip-on-missing check
 * so the local dev experience matches CI.
 *
 * We deliberately don't pull in the `dotenv` package as a direct dep of
 * `apps/app` — keeping this off-the-shelf means there's no version drift
 * between our copy and the one Clerk ships.
 */
function loadDotEnv(filename: string): void {
    const path = resolve(process.cwd(), filename);
    if (!existsSync(path)) return;
    const contents = readFileSync(path, "utf-8");
    for (const rawLine of contents.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq <= 0) continue;
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

loadDotEnv(".env.local");
loadDotEnv(".env");

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
    // Gracefully skip the entire run if Clerk credentials aren't configured —
    // matches the per-spec `test.skip` pattern in
    // `tests/sidebar-rename-delete.spec.ts`. This lets the workflow land
    // before the GitHub Actions secrets are provisioned without leaving a
    // permanent red X on the PR. Once the secrets are set the setup runs
    // normally and the sidebar specs (which gate on different env vars)
    // exercise the real flow.
    if (!process.env.CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
        setup.skip(
            true,
            "[global setup] CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY not set. Configure apps/app/.env.local (local) or GitHub Actions secrets E2E_CLERK_PUBLISHABLE_KEY / E2E_CLERK_SECRET_KEY (CI) per apps/app/tests/README.md.",
        );
    }
    await clerkSetup();
});
