# Vercel Preview Guardrails

## Why this exists

`apps/app` uses a guarded Vercel build script so preview builds cannot accidentally deploy backend changes to production Convex or boot with production Clerk credentials.

## Build behavior

The build command is `bash ./scripts/vercel-build.sh` in `apps/app/vercel.json`.

1. `VERCEL_ENV=production`
- Runs `bunx convex deploy --cmd "cd ../../apps/app && bun run build"`.
- Requires `CONVEX_DEPLOY_KEY`.
- If `CONVEX_DEPLOYMENT` is set, it must be `prod:*`.
- Requires production Clerk keys: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_*` and `CLERK_SECRET_KEY=sk_live_*`.

2. `VERCEL_ENV=preview` or `VERCEL_ENV=development`
- Skips `convex deploy`.
- Requires `NEXT_PUBLIC_CONVEX_URL`.
- Rejects `CONVEX_DEPLOYMENT=prod:*`.
- Requires development Clerk keys: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_*` and `CLERK_SECRET_KEY=sk_test_*`.
- Rejects production Clerk keys and any `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` that points at `smartpockets.com`.

## Required Vercel envs

1. Production environment
- `CONVEX_DEPLOY_KEY` (production key)
- `CONVEX_DEPLOYMENT=prod:<deployment_name>` (recommended and enforced if set)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...`
- `CLERK_SECRET_KEY=sk_live_...`
- `NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://clerk.smartpockets.com` or the approved production Clerk issuer

2. Preview environment
- `NEXT_PUBLIC_CONVEX_URL` (preview/dev convex URL)
- `CONVEX_DEPLOYMENT=dev:<deployment_name>` (recommended)
- No production deploy key in preview scope
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...`
- `CLERK_SECRET_KEY=sk_test_...`
- `NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://<dev-clerk-domain>.clerk.accounts.dev`

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
- Check the `Vercel - smartpockets-app` logs for `[vercel-build] VERCEL_ENV=preview`.
- A production Clerk key in Preview should fail the build instead of deploying a broken sign-in page.
