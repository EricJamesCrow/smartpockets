# `apps/app` end-to-end tests

Playwright + Clerk testing tokens, running against the local Next.js dev
server (started by Playwright's `webServer`) and the dev Convex deployment
configured in `apps/app/.env.local`.

> Owning issue: [CROWDEV-353](https://linear.app/crowdevelopment/issue/CROWDEV-353).
> Bug under verification: [CROWDEV-352](https://linear.app/crowdevelopment/issue/CROWDEV-352)
> (sidebar kebab dropdown — exactly one menu visible at a time).

## How it's wired

```
apps/app/
  playwright.config.ts        ← test config + webServer + project deps
  tests/
    global.setup.ts           ← clerkSetup() (runs once per `bun test:e2e`)
    sidebar-rename-delete.spec.ts
    helpers/
      auth.ts                 ← signInTestUser / signInAndGoHome
      seed-thread.ts          ← seedTestThreads / cleanupTestThreads
```

- **Auth.** `clerkSetup()` (in `global.setup.ts`) issues a Clerk Testing
  Token at the start of the run. Each spec wraps `setupClerkTestingToken({
  page })` in its `beforeEach` to inject that token into the page so Clerk
  skips bot-detection. Then `clerk.signIn` performs a real password sign-in
  with the env-configured test user.
- **Convex seeding.** Two dev-only mutations live in
  `packages/backend/convex/agent/threads.ts`:
  - `createTestThread({ title })`
  - `deleteAllTestThreads()`
  Both refuse to run on a `prod:*` deployment (`assertNotProduction()`). The
  `seed-thread.ts` helper opens a Node-side `ConvexHttpClient`, pulls the
  Clerk JWT (Convex template) off `window.Clerk.session` after sign-in, and
  invokes the mutations as the same user the page is signed in as.

## Required env vars

Configured in `apps/app/.env.local` for local runs and
[GitHub Actions secrets](https://github.com/EricJamesCrow/smartpockets/settings/secrets/actions)
for CI (the `.github/workflows/e2e.yml` workflow).

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public Clerk key (must be `pk_test_*`). |
| `CLERK_PUBLISHABLE_KEY` | Same as above; `clerkSetup` reads this name. The global setup mirrors `NEXT_PUBLIC_*` into it if missing. |
| `CLERK_SECRET_KEY` | Server Clerk key (`sk_test_*`). Used by `clerkSetup` to mint the testing token. |
| `E2E_CLERK_USER_USERNAME` | Email/username of the dev Clerk test user the spec signs in as. |
| `E2E_CLERK_USER_PASSWORD` | That user's password. |
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL the seed helpers hit. Must be a dev/staging deployment. |
| `CONVEX_DEPLOYMENT` | Same deployment name; `assertNotProduction` checks this for `prod:` prefix. |

> **Never use production Clerk keys here.** The Clerk testing-token API is
> intentionally restricted to dev keys; using a `pk_live_*` key will yield
> "Production Keys are only allowed for domain ..." errors and refuse to
> run.

## Running locally

From `apps/app/`:

```bash
# Headless run (CI mode + a single chromium project):
bun test:e2e

# Watch / debug mode:
bun test:e2e:ui      # Playwright Trace Viewer UI
bun test:e2e:debug   # Headful Chromium + Inspector

# Run a single spec:
bun test:e2e tests/sidebar-rename-delete.spec.ts

# Run a single test by name:
bun test:e2e -g "exactly one dropdown"
```

Playwright will boot the Next.js dev server (`bun run dev`) on `localhost:3000`
if one isn't already running. If you have one running in another terminal it
reuses it (`reuseExistingServer: !CI`).

## CI

`.github/workflows/e2e.yml` triggers on `pull_request` against `main` for
changes under `apps/app/**`, `packages/backend/convex/**`,
`packages/ui/src/components/**`, or the workflow itself.

The workflow:

1. Sets up Bun + restores the `~/.cache/ms-playwright` cache.
2. Runs `bun install --frozen-lockfile`.
3. Installs Chromium (or just system deps if cached).
4. Runs `bun run test:e2e` from `apps/app` — Playwright's `webServer` boots
   `bun run dev` in-process and tears it down at the end.
5. On failure, uploads `playwright-report/` + `test-results/` as an
   artifact retained for 14 days.

> Note: this PR adds the workflow but, because the workflow's path filter
> matches `apps/app/**`, it should run on this PR itself. If the workflow
> is missing a required secret it will fail at the sign-in step with a
> clear error from `helpers/auth.ts`. Add the secrets listed above and
> re-run.

## Adding new specs

1. Drop a `*.spec.ts` next to `sidebar-rename-delete.spec.ts`.
2. In `beforeEach`, call `signInAndGoHome(page)` (which calls
   `setupClerkTestingToken` + `clerk.signIn`).
3. Seed any required state via `seedTestThreads({ page, convexUrl, titles })`
   — _do not_ rely on previous-run state; assume the user has zero threads.
4. Use `data-test=…` attributes for selectors. If your component doesn't
   have one, add it (the value should be human-readable, kebab-case, and
   stable across refactors). Avoid CSS selectors that depend on Tailwind
   classes — they shift between releases.
5. Clean up in `afterEach` via `cleanupTestThreads` so a flake doesn't
   pollute the next run.

## Known limitations / follow-ups

- **Single Chromium project only.** Cross-browser (Firefox/WebKit) and
  mobile viewport projects are deferred — spin up new entries in
  `playwright.config.ts > projects` when needed.
- **No Vercel-preview run mode yet.** The CI workflow only runs against
  the local dev server. A future enhancement could fetch the Vercel
  preview URL from the PR's deployment status and run a smaller smoke
  subset against the real preview, since the preview is the real target
  the user will hit after merge. Tracked separately.
- **Single test user.** Multi-user / org / role coverage is out of scope
  for the initial setup. Add new users via Clerk dashboard and pass their
  credentials through additional env vars when needed.
- **Hard-delete in `deleteAllTestThreads`.** The production `deleteThread`
  mutation soft-deletes (`isArchived: true`); the test cleanup hard-deletes
  to keep the test user's data table small. Specs that exercise the
  archive/restore behavior should call `deleteThread` directly via the
  page instead of the cleanup helper.
