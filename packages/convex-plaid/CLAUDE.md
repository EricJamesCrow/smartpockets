# @crowdevelopment/convex-plaid — AI Agent Context

This package is the local workspace copy of the `@crowdevelopment/convex-plaid` Convex component.

**Full documentation is in [`README.md`](./README.md).** It covers:
- Security patterns and helper utilities (`requireAuth`, `requireItemOwnership`, etc.)
- Component architecture and key constraints (`ctx.auth` not available; explicit config required)
- Installation, setup, and integration examples
- Client API reference (`Plaid` class, methods, public queries/mutations)
- React hooks (`usePlaidLink`, `useUpdatePlaidLink`)
- Webhooks, cron jobs, data model, error handling, and publishing

**After any change to source files, rebuild before testing:**
```bash
cd packages/convex-plaid && bun run build
```
