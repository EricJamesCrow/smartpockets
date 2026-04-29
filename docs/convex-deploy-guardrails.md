# Vercel Preview Guardrails

## Why this exists

`apps/app` uses a guarded Vercel build script so preview builds cannot accidentally deploy backend changes to production Convex or boot with production Clerk credentials.
`apps/web` also uses a guarded Vercel build script so preview auth pages cannot deploy with production Clerk credentials.

## Build behavior

The app build command is `bash ./scripts/vercel-build.sh` in `apps/app/vercel.json`.
The web build command is `bash ./scripts/vercel-build.sh` in `apps/web/vercel.json`.

1. `VERCEL_ENV=production`

- Runs `bunx convex deploy --cmd "cd ../../apps/app && bun run build"`.
- Requires `CONVEX_DEPLOY_KEY`.
- If `CONVEX_DEPLOYMENT` is set, it must be `prod:*`.
- Requires production Clerk keys: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_*` and `CLERK_SECRET_KEY=sk_live_*`.
- Requires production Clerk frontend domain: `NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://clerk.smartpockets.com`.

2. `VERCEL_ENV=preview` or `VERCEL_ENV=development`

- Skips `convex deploy`.
- Requires `NEXT_PUBLIC_CONVEX_URL`.
- Rejects `CONVEX_DEPLOYMENT=prod:*`.
- Requires development Clerk keys: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_*` and `CLERK_SECRET_KEY=sk_test_*`.
- Requires development Clerk frontend domain: `NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://<dev-clerk-domain>.clerk.accounts.dev`.
- Rejects production Clerk keys and any `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` that points at `smartpockets.com`.
- The Clerk key/domain checks apply to both `smartpockets-app` and `smartpockets-web` preview deployments.

## Required Vercel envs

1. Production environment (`apps/app`)

- `CONVEX_DEPLOY_KEY` (production key)
- `CONVEX_DEPLOYMENT=prod:<deployment_name>` (recommended and enforced if set)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...`
- `CLERK_SECRET_KEY=sk_live_...`
- `NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://clerk.smartpockets.com`

2. Production environment (`apps/web`)

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...`
- `CLERK_SECRET_KEY=sk_live_...`
- `NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://clerk.smartpockets.com`
- `CONVEX_DEPLOY_KEY`, `NEXT_PUBLIC_CONVEX_URL`, and `CONVEX_DEPLOYMENT` are not required for `smartpockets-web` builds.

3. Preview environment (`apps/app`)

- `NEXT_PUBLIC_CONVEX_URL` (preview/dev convex URL)
- `CONVEX_DEPLOYMENT=dev:<deployment_name>` (recommended)
- No production deploy key in preview scope.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...`
- `CLERK_SECRET_KEY=sk_test_...`
- `NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://<dev-clerk-domain>.clerk.accounts.dev`

4. Preview environment (`apps/web`)

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...`
- `CLERK_SECRET_KEY=sk_test_...`
- `NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://<dev-clerk-domain>.clerk.accounts.dev`
- `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT` are not required for `smartpockets-web` preview builds.

If a preview shows `Clerk: Production Keys are only allowed for domain "smartpockets.com"`, Vercel Preview is using production Clerk env vars. Update the Preview-scoped Clerk variables, redeploy the branch, and verify the build logs show the preview guard passing.

## Incident triage checklist

If cards appear missing after a deploy:

1. Confirm app runtime URL

- Verify deployed `NEXT_PUBLIC_CONVEX_URL` points to expected deployment.

2. Confirm Convex deployment target

- Check build logs for whether `convex deploy` ran and in which Vercel environment.
- Verify `VERCEL_ENV` and `CONVEX_DEPLOYMENT` values in logs.

3. Check delete telemetry

- Search logs for:
    - `[items.deletePlaidItem] Deleted app-level credit cards`
    - `[items.deleteAppDataForPlaidItem] Deleted app-level credit cards`
- Validate `plaidItemId`, `deletedCreditCards`, and `source`.
- Ignore/omit `durationMs` for mutation-level timing in `items.deletePlaidItem` and
  `items.deleteAppDataForPlaidItem`; `Date.now()` in Convex mutations does not
  represent meaningful wall-clock elapsed time.

If sign-in fails on a preview:

1. Confirm Vercel Preview Clerk envs

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` must start with `pk_test_`.
- `CLERK_SECRET_KEY` must start with `sk_test_`.
- `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` must point to the Clerk development issuer, not `smartpockets.com`.

2. Confirm build guard output

- Check the `Vercel - smartpockets-app` and `Vercel - smartpockets-web` logs for `[vercel-build] VERCEL_ENV=preview`.
- A production Clerk key in Preview should fail the build instead of deploying a broken sign-in page.

3. Confirm preview auth routing

- Signed-out app previews should redirect to
  `https://preview.smartpockets.com/sign-in?redirect_url=<exact app preview URL>`.
- The web auth host must use Clerk fallback redirect URLs, not force redirect URLs, so
  Clerk respects the incoming `redirect_url`.
- `apps/web` is the primary Clerk auth host; `apps/app` is configured as the
  satellite app and points its Clerk sign-in/sign-up URLs at the auth host.
- The app provider derives its satellite domain from the current request/location
  host, not from a manually-set per-branch env var.
- Do not set per-branch Vercel env vars as the normal fix. Vercel preview URLs are
  generated per deployment, and env changes only affect new deployments.
- Trusted redirect targets are limited to `app.smartpockets.com`, local app dev, and
  SmartPockets `smartpockets-app-*.vercel.app` preview origins.
