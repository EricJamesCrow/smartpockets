import { describe, expect, it } from "vitest";
import { shouldFailClosedOnRateLimitError } from "../agent/runtime";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("agent runtime rate-limit failure policy", () => {
    it("fails closed for all write buckets", () => {
        expect(shouldFailClosedOnRateLimitError("write_single")).toBe(true);
        expect(shouldFailClosedOnRateLimitError("write_bulk")).toBe(true);
        expect(shouldFailClosedOnRateLimitError("write_expensive")).toBe(true);
    });

    it("does not fail closed for read buckets", () => {
        expect(shouldFailClosedOnRateLimitError("read_cheap")).toBe(false);
        expect(shouldFailClosedOnRateLimitError("read_moderate")).toBe(false);
    });

    it("defines a per-user chat_turn bucket for pre-LLM admission", () => {
        const source = readFileSync(resolve(__dirname, "../agent/rateLimits.ts"), "utf8");
        expect(source).toContain("chat_turn");
        expect(source).toContain('rate: 6');
        expect(source).toContain('capacity: 8');
    });
});
