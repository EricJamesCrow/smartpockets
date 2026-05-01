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
- If `PLAID_ENV` is set in Vercel env, it must be `production`.

2. `VERCEL_ENV=preview` or `VERCEL_ENV=development`

- Skips `convex deploy`.
- Requires `NEXT_PUBLIC_CONVEX_URL`.
- Rejects `CONVEX_DEPLOYMENT=prod:*`.
- Requires development Clerk keys: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_*` and `CLERK_SECRET_KEY=sk_test_*`.
- Requires development Clerk frontend domain: `NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://<dev-clerk-domain>.clerk.accounts.dev`.
- Rejects production Clerk keys and any `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` that points at `smartpockets.com`.
- The Clerk key/domain checks apply to both `smartpockets-app` and `smartpockets-web` preview deployments.
- If `PLAID_ENV` is set in Vercel env, it must be `sandbox` or `development` unless `CONVEX_DEPLOYMENT` is on the documented exception list (`PLAID_PROD_EXCEPTION_DEPLOYMENTS` in `vercel-build.sh`). Today the only entry is `dev:canny-turtle-982` (the project owner's personal dev Convex, intentionally on production Plaid).

## Plaid environment policy

Plaid environment is configured per Convex deployment (Convex dashboard env vars), not per Vercel env. Most preview/dev Convex deployments don't set `PLAID_ENV` in Vercel — the build script's Plaid guardrail is defense-in-depth for the rare case where someone copies it there. The primary policy:

- **Production Convex (`prod:smartpockets`)** uses `PLAID_ENV=production` (real money, real PII).
- **`dev:canny-turtle-982`** uses `PLAID_ENV=production` — documented exception for the project owner's testing flow.
- **All other dev/preview Convex deployments** must use `PLAID_ENV=sandbox` (or `development` if explicitly approved).

To add a new dev Convex deployment that should run on production Plaid:

1. Add its `dev:<name>` to `PLAID_PROD_EXCEPTION_DEPLOYMENTS` in `apps/app/scripts/vercel-build.sh`.
2. Update the "Plaid In Previews" section in `CLAUDE.md` with the rationale and ownership.
3. Update this file's Section 2 bullet list to mention the new exception.

See `CLAUDE.md` > "Plaid In Previews" for the full policy and rationale.

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

- Signed-out app previews should redirect to the configured marketing/auth host.
  In Preview, set `NEXT_PUBLIC_MARKETING_URL=https://preview.smartpockets.com`.
- Generated Vercel preview URLs are build/check URLs, not Clerk post-login
  destinations. Do not use `smartpockets-app-*.vercel.app` as an auth return target.
- The web auth host should force post-sign-in/sign-up redirects to the configured
  stable app origin.
- Do not build custom app-side `redirect_url` values from generated or shared preview
  URLs; Clerk redirect state is owned by the auth host.
- Do not add app-side Clerk satellite props (`isSatellite`, `domain`,
  `signInUrl`, or `signUpUrl`) unless the Clerk instance is explicitly configured
  for those satellite domains and the flow is smoke-tested end to end.
- The stable preview auth domains are shared manual-test aliases:
  `preview.smartpockets.com` for `apps/web` and `app.preview.smartpockets.com` for
  `apps/app`. Repoint them to the current branch/deployment only after reporting the
  existing mapping because this can interrupt someone else's test session.
- Stable post-login targets are limited to `app.smartpockets.com`,
  `app.preview.smartpockets.com`, and local app dev.
