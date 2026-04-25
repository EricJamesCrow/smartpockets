#!/usr/bin/env node
// Verifies that RESERVED_SLUGS in apps/app/src/app/(app)/[threadId]/page.tsx
// matches the canonical list in specs/00-contracts.md §1.4 AND covers every
// top-level (app)/ route directory. Per specs/W1-chat-home.md §6.3 and
// specs/00-contracts.md §1.4 this check is mandatory.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(ROOT, "..", "src", "app", "(app)");
const GUARD_PATH = join(APP_DIR, "[threadId]", "page.tsx");
const SPEC_PATH = join(ROOT, "..", "..", "..", "specs", "00-contracts.md");

const SKIP = new Set(["[threadId]", "dashboard"]);
const isRouteGroup = (name) => name.startsWith("(") && name.endsWith(")");

// --- 1. Parse RESERVED_SLUGS from the guard. -----------------------------
const guardSource = readFileSync(GUARD_PATH, "utf8");
const guardMatch = guardSource.match(
  /RESERVED_SLUGS\s*=\s*new Set\(\s*\[([\s\S]*?)\]\s*\)/,
);
if (!guardMatch) {
  console.error("verify-reserved-slugs: could not find RESERVED_SLUGS in", GUARD_PATH);
  process.exit(2);
}
const declared = new Set(
  Array.from(guardMatch[1].matchAll(/"([^"]+)"/g)).map((m) => m[1]),
);

// --- 2. Parse the canonical RESERVED_SLUGS block from the spec. ----------
const specSource = readFileSync(SPEC_PATH, "utf8");
const specMatch = specSource.match(
  /RESERVED_SLUGS\s*=\s*new Set\(\s*\[([\s\S]*?)\]\s*\)/,
);
if (!specMatch) {
  console.error(
    "verify-reserved-slugs: could not find RESERVED_SLUGS block in",
    SPEC_PATH,
  );
  process.exit(2);
}
const canonical = new Set(
  Array.from(specMatch[1].matchAll(/"([^"]+)"/g)).map((m) => m[1]),
);

// --- 3. Enumerate top-level (app)/ route directories. --------------------
function hasRouteDescendant(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return false;
  }
  for (const entry of entries) {
    if (entry === "page.tsx" || entry === "layout.tsx") return true;
    const full = join(dir, entry);
    try {
      if (statSync(full).isDirectory() && hasRouteDescendant(full)) return true;
    } catch {
      // ignore
    }
  }
  return false;
}

const directories = readdirSync(APP_DIR).filter((name) => {
  if (SKIP.has(name)) return false;
  if (name.startsWith(".")) return false;
  if (isRouteGroup(name)) return false;
  const full = join(APP_DIR, name);
  if (!statSync(full).isDirectory()) return false;
  return hasRouteDescendant(full);
});

// --- 4. Diff the three sets. ---------------------------------------------
const missingFromGuardVsSpec = [...canonical].filter((s) => !declared.has(s));
const extraInGuardVsSpec = [...declared].filter((s) => !canonical.has(s));
const missingFromGuardVsDirs = directories.filter((d) => !declared.has(d));
const missingFromSpecVsDirs = directories.filter((d) => !canonical.has(d));

let failed = false;
if (missingFromGuardVsSpec.length) {
  console.error(
    "verify-reserved-slugs: RESERVED_SLUGS in guard is missing canonical entries from spec §1.4:",
    missingFromGuardVsSpec,
  );
  failed = true;
}
if (extraInGuardVsSpec.length) {
  console.error(
    "verify-reserved-slugs: RESERVED_SLUGS in guard has entries NOT in canonical spec §1.4:",
    extraInGuardVsSpec,
  );
  failed = true;
}
if (missingFromGuardVsDirs.length) {
  console.error(
    "verify-reserved-slugs: top-level (app)/ routes not covered by guard:",
    missingFromGuardVsDirs,
  );
  failed = true;
}
if (missingFromSpecVsDirs.length) {
  console.error(
    "verify-reserved-slugs: top-level (app)/ routes not in canonical spec §1.4:",
    missingFromSpecVsDirs,
  );
  failed = true;
}

if (failed) {
  console.error("Fix by editing RESERVED_SLUGS in", GUARD_PATH);
  console.error("and/or the canonical list in", SPEC_PATH);
  process.exit(1);
}

console.log(
  `verify-reserved-slugs: OK (${declared.size} slugs, ${directories.length} routes)`,
);
