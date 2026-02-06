# Convex Deploy Guardrails

## Why this exists

`apps/app` now uses a guarded Vercel build script so preview builds cannot accidentally deploy backend changes to production Convex.

## Build behavior

The build command is `bash ./scripts/vercel-build.sh` in `apps/app/vercel.json`.

1. `VERCEL_ENV=production`
- Runs `bunx convex deploy --cmd "cd ../../apps/app && bun run build"`.
- Requires `CONVEX_DEPLOY_KEY`.
- If `CONVEX_DEPLOYMENT` is set, it must be `prod:*`.

2. `VERCEL_ENV=preview` or `VERCEL_ENV=development`
- Skips `convex deploy`.
- Requires `NEXT_PUBLIC_CONVEX_URL`.
- Rejects `CONVEX_DEPLOYMENT=prod:*`.

## Required Vercel envs

1. Production environment
- `CONVEX_DEPLOY_KEY` (production key)
- `CONVEX_DEPLOYMENT=prod:<deployment_name>` (recommended and enforced if set)

2. Preview environment
- `NEXT_PUBLIC_CONVEX_URL` (preview/dev convex URL)
- `CONVEX_DEPLOYMENT=dev:<deployment_name>` (recommended)
- No production deploy key in preview scope

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
