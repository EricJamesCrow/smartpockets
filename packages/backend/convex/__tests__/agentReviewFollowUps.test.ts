import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("agentic chat review follow-ups (CROWDEV-463)", () => {
    it("keeps post-run cleanup and compaction reads bounded or index-backed", () => {
        const threadsSource = readFileSync(resolve(__dirname, "../agent/threads.ts"), "utf8");

        const abortRunBlock = threadsSource.slice(
            threadsSource.indexOf("export const abortRun"),
            threadsSource.indexOf("export const getCancelFlag"),
        );
        expect(abortRunBlock).toContain("ABORT_RECENT_MESSAGE_LIMIT");
        expect(abortRunBlock).not.toContain('edge("agentMessages")');

        const finalizeBlock = threadsSource.slice(
            threadsSource.indexOf("export const finalizeUserTurnIfStranded"),
            threadsSource.indexOf("export const writeSummary"),
        );
        expect(finalizeBlock).toContain('"by_thread_role_createdAt"');
        expect(finalizeBlock).toContain(".take(1)");
        expect(finalizeBlock).not.toContain('edge("agentMessages")');

        const compactionBlock = threadsSource.slice(
            threadsSource.indexOf("export const getForCompaction"),
            threadsSource.indexOf("export const bumpReadCallCount"),
        );
        expect(compactionBlock).toContain("COMPACTION_MESSAGE_SCAN_LIMIT");
        expect(compactionBlock).not.toContain('edge("agentMessages")');
    });

    it("skips post-run compaction and titling after cancelled or failed turns", () => {
        const runtimeSource = readFileSync(resolve(__dirname, "../agent/runtime.ts"), "utf8");
        expect(runtimeSource).toContain("let runFailed = false");
        expect(runtimeSource).toContain("if (!cancelObserved && !runFailed)");
    });

    it("offers retry text for retryable typed send errors", () => {
        const chatViewSource = readFileSync(
            resolve(__dirname, "../../../../apps/app/src/components/chat/ChatView.tsx"),
            "utf8",
        );
        expect(chatViewSource).toContain("function shouldOfferRetryForTypedError");
        expect(chatViewSource).toContain('typed?.kind === "rate_limited"');
        expect(chatViewSource).toContain('typed?.kind === "run_in_progress"');
        expect(chatViewSource).toContain('typed?.kind === "llm_down"');
        expect(chatViewSource).toContain("if (!handled || shouldOfferRetry)");
    });
});
