import { notFound } from "next/navigation";

/**
 * Minimal entry point for Playwright sign-in. The root layout's
 * `<ClerkProvider>` ensures `window.Clerk` becomes available once this page
 * renders, which is the precondition for `clerk.signIn({ page, emailAddress })`
 * (from `@clerk/testing/playwright`) to execute its `signIn.create({
 * strategy: "ticket", ticket })` call.
 *
 * Why a dedicated route?
 *
 * The app's middleware (`apps/app/src/middleware.ts`) redirects every
 * unauthenticated, non-API request to the marketing site (port 3001 in dev).
 * That marketing server is not booted by Playwright's `webServer` block, so
 * the redirect lands on `ECONNREFUSED`. The helper used to navigate to
 * `/sign-in` — a route that exists in `apps/web` but not in `apps/app` — and
 * suffered exactly this. We now bypass that redirect for this single path
 * (see the matcher in `middleware.ts`) so the test runner has somewhere to
 * land that loads Clerk's client-side JS.
 *
 * Safety:
 *
 *   - The middleware matcher only opens this path when `NODE_ENV !==
 *     "production"`. In production this file `notFound()`s before any HTML is
 *     rendered, so even a misconfigured deploy can't expose a sign-in entry.
 *   - The page renders no interactive surface — it's a blank `<main>` so
 *     `<ClerkProvider>` from the root layout can finish hydrating. Tests
 *     should not navigate users here outside of `auth.ts`.
 */

/**
 * EXEMPTION FROM AGENTS.md "no force-dynamic" RULE.
 *
 * AGENTS.md (under "Anti-patterns") prohibits `export const dynamic =
 * "force-dynamic"` in application pages — the rule is "investigate the root
 * cause instead." This file is the **only** sanctioned exception:
 *
 *   - It's a test-only Clerk-sign-in entry point. Real users never reach
 *     it; only Playwright's `signInTestUser` helper (see
 *     `apps/app/tests/helpers/auth.ts`) navigates here.
 *   - `apps/app/src/middleware.ts` bypasses the unauthenticated-redirect
 *     ONLY when `NODE_ENV !== "production"`. In production the route
 *     follows the normal redirect-to-marketing path.
 *   - The page body itself calls `notFound()` in production before any
 *     HTML is emitted, so even a misbuilt prod bundle can't serve it.
 *
 * The `force-dynamic` directive exists because the page reads
 * `process.env.NODE_ENV` at request time to make the `notFound()` decision.
 * Statically rendering the page would freeze that environment check at
 * build time and could expose the sign-in shell on production deploys
 * that share a build output with a non-production node env.
 *
 * DO NOT copy this pattern into regular app pages. Reach for
 * request-scoped data fetching, `cookies()`/`headers()`, or per-route
 * cache primitives instead. If you find yourself wanting `force-dynamic`,
 * the answer is almost always "this should be a Server Action, an RSC
 * with `cookies()`, or a Convex query," not a forced render mode.
 */
export const dynamic = "force-dynamic";

export default function E2eBootstrapPage() {
    if (process.env.NODE_ENV === "production") {
        notFound();
    }

    return (
        <main
            data-test="e2e-bootstrap-root"
            className="bg-primary flex min-h-screen items-center justify-center p-6"
        >
            <p className="font-[family-name:var(--font-geist-mono)] text-[0.72rem] uppercase tracking-[0.22em] text-tertiary">
                e2e auth bootstrap
            </p>
        </main>
    );
}
