# Plan: Credit Card Issuer Normalization (Full Solution)

> **Status:** Saved for future implementation
> **Created:** 2025-01-22
> **Simple fix implemented:** Use `plaidItem.institutionName` directly

This document preserves the full pattern-matching normalization plan for future enhancement.

---

## Problem

Cards display "CREDIT" instead of the actual issuer name (e.g., "Chase") because:

```typescript
// packages/backend/convex/creditCards/actions.ts:92
const company = account.name.split(" ")[0];
```

When Plaid returns `account.name = "CREDIT CARD"` or `"CREDIT Visa"`, the first word is literally "CREDIT".

---

## Current Fix (Implemented)

**Simple approach:** Use `plaidItem.institutionName` directly:

```typescript
const company = plaidItem.institutionName || "Unknown";
```

This works because `plaidItem.institutionName` already contains the correct issuer (e.g., "Chase").

---

## Future Enhancement: Pattern Matching Normalization

For more sophisticated issuer extraction (e.g., handling co-branded cards, product name matching), implement the following:

### 1. Create issuer patterns data file

**New File:** `packages/backend/convex/creditCards/issuerPatterns.ts`

```typescript
/**
 * Known credit card issuers with matching patterns
 *
 * Patterns are case-insensitive substrings to check.
 * Order matters: more specific patterns should come first.
 */
export interface IssuerPattern {
  name: string;        // Normalized display name
  slug: string;        // Machine-readable identifier for CSS/icons
  patterns: string[];  // Substrings to match (case-insensitive)
}

export const KNOWN_ISSUERS: IssuerPattern[] = [
  { name: "Chase", slug: "chase", patterns: ["chase", "sapphire", "freedom", "ink business"] },
  { name: "American Express", slug: "amex", patterns: ["american express", "amex", "delta skymiles", "hilton honors", "marriott bonvoy"] },
  { name: "Capital One", slug: "capital-one", patterns: ["capital one", "venture", "quicksilver", "savor"] },
  { name: "Bank of America", slug: "bank-of-america", patterns: ["bank of america", "bofa", "customized cash"] },
  { name: "Wells Fargo", slug: "wells-fargo", patterns: ["wells fargo", "active cash", "autograph"] },
  { name: "Citi", slug: "citi", patterns: ["citi", "double cash", "custom cash", "premier"] },
  { name: "Discover", slug: "discover", patterns: ["discover", "discover it"] },
  { name: "Credit One", slug: "credit-one", patterns: ["credit one"] },  // Must come before generic "credit" check
  { name: "USAA", slug: "usaa", patterns: ["usaa"] },
  { name: "Synchrony", slug: "synchrony", patterns: ["synchrony"] },
  { name: "Barclays", slug: "barclays", patterns: ["barclays", "barclaycard"] },
  { name: "US Bank", slug: "us-bank", patterns: ["us bank", "u.s. bank", "altitude"] },
  { name: "PNC", slug: "pnc", patterns: ["pnc"] },
  { name: "TD Bank", slug: "td-bank", patterns: ["td bank"] },
  { name: "Navy Federal", slug: "navy-federal", patterns: ["navy federal"] },
  { name: "Apple", slug: "apple", patterns: ["apple card"] },
];

/**
 * Tokens to strip when cleaning account names
 * These are generic and don't help identify the issuer
 */
export const GENERIC_TOKENS = [
  "credit", "card", "debit", "the", "payment",
  "visa", "mastercard", "platinum", "gold", "silver", "signature", "infinite"
];
```

### 2. Create normalization utility

**New File:** `packages/backend/convex/creditCards/normalizeIssuer.ts`

```typescript
import { KNOWN_ISSUERS, GENERIC_TOKENS } from "./issuerPatterns";

/**
 * Extract normalized issuer name from Plaid account data
 *
 * Priority (highest to lowest signal):
 * 1. Pattern match against officialName (e.g., "Chase Sapphire Preferred")
 * 2. Pattern match against accountName
 * 3. institutionName from plaidItem (e.g., "Chase")
 * 4. Cleaned display name (strip generic tokens, use remainder)
 *
 * @param officialName - Plaid account.officialName
 * @param accountName - Plaid account.name
 * @param institutionName - plaidItem.institutionName (high-signal fallback)
 */
export function normalizeIssuer(
  officialName: string | undefined | null,
  accountName: string,
  institutionName?: string | null
): string {
  // Try pattern matching on officialName first
  if (officialName) {
    const matched = matchKnownIssuer(officialName);
    if (matched) return matched;
  }

  // Try pattern matching on accountName
  const matchedAccount = matchKnownIssuer(accountName);
  if (matchedAccount) return matchedAccount;

  // High-signal fallback: use institution name from plaidItem
  if (institutionName && institutionName.trim()) {
    return institutionName.trim();
  }

  // Last resort: clean the name and use what's left
  const cleaned = cleanAccountName(officialName || accountName);
  return cleaned || "Unknown";
}

/**
 * Match against known issuer patterns
 */
function matchKnownIssuer(name: string): string | null {
  const lower = name.toLowerCase();

  for (const issuer of KNOWN_ISSUERS) {
    if (issuer.patterns.some((p) => lower.includes(p))) {
      return issuer.name;
    }
  }

  return null;
}

/**
 * Strip generic tokens and return remaining meaningful words
 */
function cleanAccountName(name: string): string {
  const words = name.toLowerCase().split(/\s+/);
  const meaningful = words.filter((w) => !GENERIC_TOKENS.includes(w) && w.length > 1);

  if (meaningful.length === 0) return "";

  // Capitalize first letter of each word
  return meaningful
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
```

### 3. Update sync action to use normalizer

**File:** `packages/backend/convex/creditCards/actions.ts`

```typescript
// BEFORE
const company = account.name.split(" ")[0];

// AFTER
import { normalizeIssuer } from "./normalizeIssuer";
// ...
const company = normalizeIssuer(account.officialName, account.name, plaidItem.institutionName);
```

---

## Test Cases

| Input (`officialName`, `accountName`, `institutionName`) | Expected Output |
|--------------------------------------------------------|-----------------|
| `"Chase Sapphire Preferred"`, `"CREDIT CARD"`, `"Chase"` | `"Chase"` |
| `"Credit One Bank Platinum"`, `"CREDIT VISA"`, `"Credit One Bank"` | `"Credit One"` |
| `"U.S. Bank Altitude Go"`, `"CREDIT CARD"`, `"US Bank"` | `"US Bank"` |
| `"Apple Card"`, `"CREDIT MASTERCARD"`, `"Apple Card"` | `"Apple"` |
| `null`, `"CREDIT VISA"`, `"Chase"` | `"Chase"` (institution fallback) |
| `null`, `"CREDIT CARD"`, `null` | `"Unknown"` |

---

## Edge Cases Handled

- `officialName` is null → tries `accountName`, then `institutionName`
- "Credit One Bank" → matches pattern before generic "credit" token stripping
- Generic names ("CREDIT CARD", "CREDIT VISA") → uses `institutionName` fallback
- Unknown institution + generic name → strips tokens, uses remainder or "Unknown"
- Co-branded cards (e.g., "Delta SkyMiles Amex") → returns issuer ("American Express")

---

## Future Work

Per credit card artwork PRD, this is step 1 of the artwork pipeline:

**Library Extraction (`@crowdevelopment/plaid-card-identity`):**
- Extract `issuerPatterns.ts` + `normalizeIssuer.ts` into standalone package
- Add `brand` field for co-branded cards (Delta/Amex distinction)
- Return structured object: `{ issuer, brand, slug, confidence }`

**Artwork Pipeline:**
- RewardsCC API integration for actual card artwork
- User override for manual card selection
- CSS gradient fallbacks with network logos
