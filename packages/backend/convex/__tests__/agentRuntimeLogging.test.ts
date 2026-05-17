import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
    correlationIdFromParts,
    sanitizeAgentRuntimeErrorLog,
} from "../agent/logging";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ALLOWED_KEYS = [
    "event",
    "phase",
    "toolName",
    "bucket",
    "modelId",
    "errorClass",
    "errorCode",
    "retryable",
    "correlationId",
].sort();

describe("agent runtime logging (CROWDEV-442)", () => {
    it("sanitizes runtime errors to the explicit allowlist only", () => {
        const raw = new Error("contains user financial text and provider payload");
        raw.stack = "stack with prompt and balances";
        (raw as any).cause = {
            providerPayload: { prompt: "pay card 1234", balance: "$500" },
            toolArgs: { accountId: "secret-account" },
        };
        (raw as any).code = "provider_500";

        const record = sanitizeAgentRuntimeErrorLog({
            event: "agent_tool_error",
            phase: "execute_tool",
            toolName: "listCreditCards",
            bucket: "read_cheap",
            modelId: "claude-sonnet-4-6",
            error: raw,
            retryable: true,
            correlationParts: ["thread_123", "message_456"],
        });

        expect(Object.keys(record).sort()).toEqual(ALLOWED_KEYS);
        expect(record).toEqual({
            event: "agent_tool_error",
            phase: "execute_tool",
            toolName: "listCreditCards",
            bucket: "read_cheap",
            modelId: "claude-sonnet-4-6",
            errorClass: "Error",
            errorCode: "provider_500",
            retryable: true,
            correlationId: correlationIdFromParts(["thread_123", "message_456"]),
        });
        expect(JSON.stringify(record)).not.toContain("financial text");
        expect(JSON.stringify(record)).not.toContain("stack");
        expect(JSON.stringify(record)).not.toContain("providerPayload");
        expect(JSON.stringify(record)).not.toContain("pay card");
        expect(JSON.stringify(record)).not.toContain("secret-account");
    });

    it("does not log raw error objects in agent runtime surfaces", () => {
        const files = [
            "../agent/runtime.ts",
            "../agent/writeTool.ts",
            "../agent/compaction.ts",
            "../agent/titling.ts",
        ];
        for (const file of files) {
            const source = readFileSync(resolve(__dirname, file), "utf8");
            expect(source).not.toMatch(/console\.(warn|error)\([^)]*err/);
            expect(source).not.toMatch(/console\.(warn|error)\([^)]*Error/);
        }
    });
});
