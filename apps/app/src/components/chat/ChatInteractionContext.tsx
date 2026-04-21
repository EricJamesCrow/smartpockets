"use client";

// ============================================================================
// W1 STUB — to be replaced by the real provider landed by W1 (CR-4).
// ============================================================================
//
// This file is the MVP stub for W3. The real implementation belongs to W1 and
// must live at this exact path so W3 imports do not need to change when W1
// lands.
//
// Spec: specs/W3-generative-ui.md §3.6, §9.2 CR-4.
//
// Contract W1 MUST preserve when replacing this stub:
//
//   export function ChatInteractionProvider(props: { threadId: Id<"agentThreads">; children: ReactNode }): JSX.Element;
//   export function useChatInteraction(): { sendMessage(input: SendMessageInput): Promise<void> };
//
// The `sendMessage` primitive takes `{ text: string; toolHint?: { tool: ToolName; args: Record<string, unknown> } }`.
// There is NO confirm / cancel / undo callback surface — all three are
// `sendMessage` turns with the appropriate `toolHint` (contracts §2.3 tools 21-23,
// reconciliation M12).
// ============================================================================

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { AgentThreadId, ToolName } from "./tool-results/types";

export type SendMessageInput = {
    text: string;
    toolHint?: {
        tool: ToolName;
        args: Record<string, unknown>;
    };
};

export type ChatInteractionValue = {
    sendMessage: (input: SendMessageInput) => Promise<void>;
    threadId: AgentThreadId | null;
};

const ChatInteractionContext = createContext<ChatInteractionValue | null>(null);

type ProviderProps = {
    threadId?: AgentThreadId;
    children: ReactNode;
    // Test/stub override. Real W1 implementation bypasses this and dispatches
    // via api.agent.chat.sendStreaming (CR-1).
    sendMessage?: (input: SendMessageInput) => Promise<void>;
};

export function ChatInteractionProvider({ threadId, children, sendMessage }: ProviderProps) {
    const value = useMemo<ChatInteractionValue>(
        () => ({
            threadId: threadId ?? null,
            sendMessage:
                sendMessage ??
                (async (input: SendMessageInput) => {
                    // W1 replaces this with a real api.agent.chat.sendStreaming
                    // call (CR-1 extends the args with optional toolHint). Until
                    // then, preview-harness tests can inject a stub via the
                    // `sendMessage` prop.
                    if (typeof window !== "undefined") {
                        console.warn(
                            "[ChatInteractionContext stub] sendMessage invoked before W1 provider landed.",
                            input,
                        );
                    }
                }),
        }),
        [threadId, sendMessage],
    );

    return <ChatInteractionContext.Provider value={value}>{children}</ChatInteractionContext.Provider>;
}

export function useChatInteraction(): ChatInteractionValue {
    const ctx = useContext(ChatInteractionContext);
    if (!ctx) {
        throw new Error(
            "useChatInteraction must be used within a <ChatInteractionProvider>. " +
                "W3 tool-result components require the provider to be mounted above them. " +
                "Mount one in the chat route (W1) or wrap the preview harness in a provider.",
        );
    }
    return ctx;
}
