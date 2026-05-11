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
