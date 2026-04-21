#!/usr/bin/env bun
/**
 * Guardrail script for apps/app/src/components/chat/tool-results/**.
 *
 * Enforces the coding-standard rules spelled out in W3 spec sections 7.3, 8,
 * and 10. Runs in CI as part of `bun run check:tool-results` wired through
 * turbo's `lint` pipeline.
 *
 * Rules (each fails the script with a specific error message):
 *
 *   R1. Every .ts and .tsx file begins with the literal `"use client";` line
 *       (ignored for fixtures, which are data-only).
 *   R2. No `useQuery` import from `"convex/react"`. All reactive queries must
 *       come from `"convex-helpers/react/cache/hooks"`.
 *   R3. No `useMemo`, `useCallback`, `memo(...)` (bare or `React.memo(...)`)
 *       calls unless the three lines immediately above include a
 *       `// JUSTIFIED:` comment explaining why the React Compiler cannot
 *       handle the case.
 *   R4. No color literal strings (hex, rgb/rgba/hsl, or direct Tailwind color
 *       families like `text-red-500`). Only UntitledUI utility tokens allowed
 *       (e.g. `text-utility-brand-700`).
 *   R5. No em-dashes or en-dashes in any file under tool-results/. Ascii
 *       hyphen only (per W3 plan self-review #4).
 *
 * Script returns nonzero on any violation.
 */

import { Glob } from "bun";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const TOOL_RESULTS_DIR = resolve(REPO_ROOT, "apps/app/src/components/chat/tool-results");
const FIXTURES_DIR = resolve(TOOL_RESULTS_DIR, "__fixtures__");

// Bare `memo` catches both `import { memo } from "react"; memo(Foo)` and
// `React.memo(Foo)` (word boundary on the dot). Keeping only `memo` avoids
// double-reporting the namespaced form.
const FORBIDDEN_HOOK_NAMES = [
    "useMemo",
    "useCallback",
    "memo",
];

const FORBIDDEN_USEQUERY_MODULE = "convex/react";
const ALLOWED_USEQUERY_MODULE = "convex-helpers/react/cache/hooks";

// Matches hex (#abc / #aabbcc), rgb(...), rgba(...), hsl(...), hsla(...)
// and direct Tailwind colour-family tokens that bypass UntitledUI tokens.
const COLOR_LITERAL_RE =
    /(#(?:[0-9a-fA-F]{3,4}){1,2}\b|rgba?\(|hsla?\(|(?<!utility-)text-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d+|(?<!utility-)bg-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d+)/;

const JUSTIFIED_RE = /\/\/\s*JUSTIFIED:/;

type Violation = {
    file: string;
    line: number;
    rule: string;
    message: string;
};

function lineOf(source: string, index: number): number {
    return source.slice(0, index).split("\n").length;
}

function readJustifiedWindow(sourceLines: string[], lineIndex: number): boolean {
    // Window = current line + 3 prior lines (0-indexed). Matches plan 13.1.
    const from = Math.max(0, lineIndex - 3);
    for (let i = from; i <= lineIndex; i++) {
        if (JUSTIFIED_RE.test(sourceLines[i] ?? "")) return true;
    }
    return false;
}

function isFixture(filePath: string): boolean {
    const rel = relative(FIXTURES_DIR, filePath);
    return !rel.startsWith("..") && !rel.startsWith("/");
}

async function collectFiles(): Promise<string[]> {
    const files: string[] = [];
    const glob = new Glob("**/*.{ts,tsx}");
    for await (const match of glob.scan({ cwd: TOOL_RESULTS_DIR, absolute: true })) {
        files.push(match);
    }
    return files.sort();
}

function checkFile(filePath: string): Violation[] {
    const violations: Violation[] = [];
    const source = readFileSync(filePath, "utf8");
    const lines = source.split("\n");
    const rel = relative(REPO_ROOT, filePath);

    // R1: "use client" directive — only on component/hook files, not on
    // fixture data files.
    if (!isFixture(filePath)) {
        const first = lines[0]?.trim() ?? "";
        if (first !== '"use client";' && first !== "'use client';") {
            violations.push({
                file: rel,
                line: 1,
                rule: "R1",
                message: 'missing `"use client";` directive on first line',
            });
        }
    }

    // R2: forbidden useQuery import.
    const badImportRe = new RegExp(
        `import\\s*\\{[^}]*\\buseQuery\\b[^}]*\\}\\s*from\\s*['\"]${FORBIDDEN_USEQUERY_MODULE}['\"]`,
    );
    const m = badImportRe.exec(source);
    if (m) {
        violations.push({
            file: rel,
            line: lineOf(source, m.index),
            rule: "R2",
            message: `imports useQuery from "${FORBIDDEN_USEQUERY_MODULE}" (must use "${ALLOWED_USEQUERY_MODULE}")`,
        });
    }

    // R3: forbidden hooks without a // JUSTIFIED: comment nearby.
    for (const hook of FORBIDDEN_HOOK_NAMES) {
        const hookRe = new RegExp(`\\b${hook.replace(".", "\\.")}\\s*\\(`, "g");
        let match: RegExpExecArray | null;
        while ((match = hookRe.exec(source)) !== null) {
            const line = lineOf(source, match.index) - 1;
            if (!readJustifiedWindow(lines, line)) {
                violations.push({
                    file: rel,
                    line: line + 1,
                    rule: "R3",
                    message: `${hook} without a \`// JUSTIFIED:\` comment within the previous 3 lines`,
                });
            }
        }
    }

    // R4: color literal scan. Skip import lines (paths may contain colour-like
    // characters) and JSON fixtures.
    lines.forEach((raw, idx) => {
        if (/^\s*(import|from)\s/.test(raw)) return;
        const match = COLOR_LITERAL_RE.exec(raw);
        if (match) {
            violations.push({
                file: rel,
                line: idx + 1,
                rule: "R4",
                message: `color literal "${match[0]}" (use UntitledUI utility tokens only)`,
            });
        }
    });

    // R5: em-dash and en-dash.
    for (let i = 0; i < source.length; i++) {
        const code = source.charCodeAt(i);
        if (code === 0x2014 || code === 0x2013) {
            violations.push({
                file: rel,
                line: lineOf(source, i),
                rule: "R5",
                message: `${code === 0x2014 ? "em-dash" : "en-dash"} character present (use ascii "-" instead)`,
            });
            break; // first occurrence per file is enough to surface the issue
        }
    }

    return violations;
}

async function run(): Promise<number> {
    const files = await collectFiles();
    if (files.length === 0) {
        console.error(`No files found under ${TOOL_RESULTS_DIR}.`);
        return 1;
    }

    const violations = files.flatMap(checkFile);
    if (violations.length === 0) {
        console.log(`OK: ${files.length} file(s) in tool-results/ pass guardrails.`);
        return 0;
    }

    console.error(
        `${violations.length} guardrail violation(s) under apps/app/src/components/chat/tool-results/:`,
    );
    for (const v of violations) {
        console.error(`  [${v.rule}] ${v.file}:${v.line} - ${v.message}`);
    }
    console.error(
        "\nRules: R1 use-client directive | R2 cached useQuery only | R3 manual memoisation requires // JUSTIFIED: comment | R4 UntitledUI utility tokens only | R5 ascii hyphen only",
    );
    return 1;
}

const code = await run();
process.exit(code);
