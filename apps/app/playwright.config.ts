import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for `apps/app` end-to-end tests.
 *
 * Auth: Clerk testing tokens via `@clerk/testing/playwright`. The global setup
 * project (`global.setup.ts`) calls `clerkSetup()` once per run to obtain a
 * testing token, which is then injected per-test via `setupClerkTestingToken`.
 * Sign-in itself uses a dedicated Clerk test user whose credentials are read
 * from `E2E_CLERK_USER_USERNAME` / `E2E_CLERK_USER_PASSWORD` env vars.
 *
 * Convex: tests run against the same dev Convex deployment the local Next.js
 * dev server is wired to (`NEXT_PUBLIC_CONVEX_URL`). Seeding/cleanup uses the
 * `agent.threads.createTestThread` and `agent.threads.deleteAllTestThreads`
 * mutations which throw if `CONVEX_DEPLOYMENT` starts with `prod:`.
 *
 * Web server: starts `bun dev:app` (Next 16 + turbopack on :3000) when the
 * port is free; reuses a running dev server in non-CI environments. CI must
 * always start a fresh server (`reuseExistingServer: false`).
 *
 * See `apps/app/tests/README.md` for the running/debugging guide.
 */

const PORT = 3000;
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
    testDir: "./tests",
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    forbidOnly: isCI,
    retries: isCI ? 1 : 0,
    workers: 1,
    reporter: isCI ? [["html", { open: "never" }], ["list"]] : "list",
    use: {
        baseURL: BASE_URL,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    projects: [
        {
            name: "global setup",
            testMatch: /global\.setup\.ts/,
        },
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
            dependencies: ["global setup"],
            testIgnore: /global\.setup\.ts/,
        },
    ],
    webServer: {
        // `bun --filter @repo/app run dev` works from the repo root; we run
        // playwright from `apps/app` so `bun dev` is the equivalent script.
        command: "bun run dev",
        // Use `port` instead of `url` so Playwright probes the TCP socket
        // directly. The default URL probe follows redirects, and `apps/app`'s
        // Clerk middleware redirects unauthenticated `/` to the marketing
        // site (`localhost:3001` in dev), which yields ECONNREFUSED and
        // makes Playwright think the server is down even when it's running.
        port: PORT,
        reuseExistingServer: !isCI,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "pipe",
    },
});
