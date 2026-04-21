/**
 * W4: Plaid reason-code to user-facing copy mapping.
 *
 * One row per ReasonCode (spec Section 7.3). The component owns the enum;
 * this host-app module owns the user-visible strings so downstream callers
 * cannot invent their own mappings. W1 banner UI and W7 email templates
 * both import from here to keep copy consistent.
 *
 * No em-dashes (repo rule); substitutions use colons / parens / separate sentences.
 */

import type { ReasonCode } from "@crowdevelopment/convex-plaid";

export interface UserCopy {
  title: string;
  description: string;
  ctaLabel: string | null;
}

const FALLBACK_INSTITUTION = "your bank";

function resolve(institutionName: string | null): string {
  return institutionName && institutionName.length > 0
    ? institutionName
    : FALLBACK_INSTITUTION;
}

export function reasonCodeToUserCopy(
  reasonCode: ReasonCode,
  institutionName: string | null,
): UserCopy {
  const i = resolve(institutionName);
  switch (reasonCode) {
    case "healthy":
      return {
        title: "Connected",
        description: "Sync is up to date.",
        ctaLabel: null,
      };
    case "syncing_initial":
      return {
        title: "Setting up",
        description: `We are pulling your accounts and history from ${i}.`,
        ctaLabel: null,
      };
    case "syncing_incremental":
      return {
        title: "Syncing",
        description: `Checking ${i} for updates.`,
        ctaLabel: null,
      };
    case "auth_required_login":
      return {
        title: "Reconnect needed",
        description: `${i} needs you to re-enter your credentials.`,
        ctaLabel: "Reconnect",
      };
    case "auth_required_expiration":
      return {
        title: "Credentials expiring",
        description: `Your connection to ${i} will expire soon. Reconnect to stay in sync.`,
        ctaLabel: "Reconnect",
      };
    case "transient_circuit_open":
      return {
        title: "Temporarily paused",
        description: `${i} returned too many errors in a row. We will retry automatically.`,
        ctaLabel: null,
      };
    case "transient_institution_down":
      return {
        title: "Bank unavailable",
        description: `${i} is not responding right now. We will retry automatically.`,
        ctaLabel: null,
      };
    case "transient_rate_limited":
      return {
        title: "Retrying shortly",
        description: "We are being rate-limited. We will retry shortly.",
        ctaLabel: null,
      };
    case "permanent_invalid_token":
      return {
        title: "Connection broken",
        description: `Your connection to ${i} is broken. Remove and reconnect it.`,
        ctaLabel: "Contact support",
      };
    case "permanent_item_not_found":
      return {
        title: "Connection lost",
        description: `This connection to ${i} can no longer be found. Remove and reconnect it.`,
        ctaLabel: "Contact support",
      };
    case "permanent_no_accounts":
      return {
        title: "No accounts found",
        description: `No eligible accounts were found at ${i}.`,
        ctaLabel: "Contact support",
      };
    case "permanent_access_not_granted":
      return {
        title: "Access denied",
        description:
          "Access was denied during connection. Reconnect and grant access to all needed data.",
        ctaLabel: "Reconnect",
      };
    case "permanent_products_not_supported":
      return {
        title: "Not supported",
        description: `${i} does not support the features SmartPockets uses.`,
        ctaLabel: "Contact support",
      };
    case "permanent_institution_unsupported":
      return {
        title: "No longer supported",
        description: `${i} is no longer supported by SmartPockets.`,
        ctaLabel: "Contact support",
      };
    case "permanent_revoked":
      return {
        title: "Access revoked",
        description: `You revoked access from ${i}. Reconnect if this was a mistake.`,
        ctaLabel: "Reconnect",
      };
    case "permanent_unknown":
      return {
        title: "Sync error",
        description: `Something went wrong syncing ${i}. Contact support if it continues.`,
        ctaLabel: "Contact support",
      };
    case "new_accounts_available":
      return {
        title: "New accounts available",
        description: `${i} has new accounts you can add to SmartPockets.`,
        ctaLabel: "Update accounts",
      };
  }
}
