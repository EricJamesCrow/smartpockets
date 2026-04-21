#!/usr/bin/env bun
/**
 * Fail the build if agent/system.ts is edited without bumping PROMPT_VERSION.
 * Run via: `bun run lint:prompt-drift`.
 *
 * Uses Bun.$ template tag for safe shell interop (auto-escapes arguments;
 * no shell injection surface). See https://bun.sh/docs/runtime/shell.
 */
import { $ } from "bun";
import { PROMPT_VERSION, SYSTEM_PROMPT_MD } from "../convex/agent/system";

function fail(msg: string): never {
  process.stderr.write(msg + "\n");
  process.exit(1);
}

// Fixed argv: no user-interpolated data; safe with Bun.$.
const raw = await $`npx convex run --json internal.migrations.seedPromptVersion:dumpCurrent`
  .quiet()
  .nothrow()
  .text();

const latest = raw.trim() ? JSON.parse(raw) : null;

if (!latest) {
  process.stdout.write(
    "No promptVersions row yet; run seedPromptVersion:seed first. Skipping drift check.\n",
  );
  process.exit(0);
}

if (
  latest.version === PROMPT_VERSION &&
  latest.systemPromptMd !== SYSTEM_PROMPT_MD
) {
  fail(
    `Prompt drift: agent/system.ts changed but PROMPT_VERSION "${PROMPT_VERSION}" ` +
      `already exists in promptVersions with different text. Bump PROMPT_VERSION and ` +
      `re-run seedPromptVersion:seed.`,
  );
}

process.stdout.write(
  `Prompt version ${PROMPT_VERSION} in sync with promptVersions row.\n`,
);
