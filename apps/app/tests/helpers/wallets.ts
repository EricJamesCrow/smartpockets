import type { Page } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Wallet test-data seeding helpers (CROWDEV-434 prep for CROWDEV-420).
 *
 * Mirrors the pattern in `seed-thread.ts`: opens a Node-side
 * `ConvexHttpClient`, lifts the Clerk-issued Convex JWT off
 * `window.Clerk.session` after sign-in, and runs `wallets.mutations.*`
 * against the dev Convex deployment as the same user the page is signed
 * in as.
 *
 * Unlike `agent.threads`, there is **no dev-only `deleteAllTestWallets`
 * mutation** today, so cleanup goes through the existing user-facing
 * `wallets.mutations.remove` for each seeded id. Tests track the ids they
 * created so they can clean up only their own rows — that keeps these
 * helpers safe to run against a shared dev test user without nuking
 * wallets created by other specs / by the developer manually.
 *
 * If the suite ever grows to need bulk cleanup, the right move is to add
 * a `deleteAllTestWallets({ namePrefix })` mutation in
 * `packages/backend/convex/wallets/mutations.ts` that mirrors
 * `deleteAllTestThreads` (gated by `assertNotProduction`). That's out of
 * scope for this prep PR.
 */

/**
 * Reads the Clerk session JWT (Convex template) from the page. Requires the
 * test to have already signed in via `clerk.signIn` so `window.Clerk.session`
 * exists.
 */
async function getConvexAuthToken(page: Page): Promise<string> {
  const token = await page.evaluate(async () => {
    // `window.Clerk` is injected by `<ClerkProvider>` and has the active
    // session once the user is signed in.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clerk = (window as unknown as { Clerk?: any }).Clerk;
    if (!clerk?.session) return null;
    const t = await clerk.session.getToken({ template: "convex" });
    return typeof t === "string" ? t : null;
  });
  if (!token) {
    throw new Error(
      "[wallets helper] Could not read Convex JWT from window.Clerk.session — has the test signed in via setupClerkTestingToken+signIn before calling seedTestWallet?",
    );
  }
  return token;
}

interface AuthedClientOptions {
  page: Page;
  convexUrl: string;
}

/**
 * Returns a `ConvexHttpClient` authenticated as the signed-in test user.
 * Internal helper — most call sites use `seedTestWallet` /
 * `removeTestWallet` directly.
 */
export async function getAuthedConvexClient({
  page,
  convexUrl,
}: AuthedClientOptions): Promise<ConvexHttpClient> {
  const token = await getConvexAuthToken(page);
  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(token);
  return client;
}

interface SeedWalletOptions {
  page: Page;
  convexUrl: string;
  name: string;
  pinAfterCreate?: boolean;
}

/**
 * Create a single wallet via the existing `wallets.mutations.create`
 * mutation and (optionally) toggle it pinned. The mutation derives `userId`
 * from `ctx.viewerX()`, so the auth token on the http client is the only
 * piece tying the wallet to the test user.
 *
 * Returns the new wallet's id so callers can clean up in `afterEach`.
 */
export async function seedTestWallet({
  page,
  convexUrl,
  name,
  pinAfterCreate = false,
}: SeedWalletOptions): Promise<Id<"wallets">> {
  const client = await getAuthedConvexClient({ page, convexUrl });
  const walletId = await client.mutation(api.wallets.mutations.create, {
    name,
  });
  if (pinAfterCreate) {
    await client.mutation(api.wallets.mutations.togglePin, { walletId });
  }
  return walletId;
}

interface RemoveWalletOptions {
  page: Page;
  convexUrl: string;
  walletId: Id<"wallets">;
}

/**
 * Best-effort delete of a wallet by id. Swallows errors so cleanup never
 * fails a test run — if the wallet is already gone (e.g. because the test
 * itself deleted it) we don't want to mask the real test failure.
 */
export async function removeTestWallet({
  page,
  convexUrl,
  walletId,
}: RemoveWalletOptions): Promise<void> {
  try {
    const client = await getAuthedConvexClient({ page, convexUrl });
    await client.mutation(api.wallets.mutations.remove, { walletId });
  } catch {
    // ignore — best-effort cleanup
  }
}

interface CleanupOptions {
  page: Page;
  convexUrl: string;
  namePrefix: string;
}

/**
 * Wipes every wallet on the signed-in test user whose `name` starts with
 * `namePrefix`. Use this in `beforeEach` to clear leftover seed rows from
 * a prior crashed test run before seeding fresh state.
 *
 * Goes through `wallets.queries.list` + `wallets.mutations.remove` rather
 * than a bulk mutation because there is no dev-only bulk-delete helper
 * (see file-level comment). The prefix is what keeps this from clobbering
 * wallets created by other tests / by the developer manually.
 */
export async function cleanupTestWalletsByPrefix({
  page,
  convexUrl,
  namePrefix,
}: CleanupOptions): Promise<number> {
  const client = await getAuthedConvexClient({ page, convexUrl });
  const wallets = await client.query(api.wallets.queries.list, {});
  let removed = 0;
  for (const wallet of wallets) {
    if (!wallet.name.startsWith(namePrefix)) continue;
    try {
      await client.mutation(api.wallets.mutations.remove, {
        walletId: wallet._id,
      });
      removed += 1;
    } catch {
      // ignore individual failures so one stuck row doesn't block the rest
    }
  }
  return removed;
}
