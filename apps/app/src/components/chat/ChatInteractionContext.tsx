"use client";

// ============================================================================
// W1 ChatInteractionProvider: live implementation.
//
// Per reconciliation M12 (contracts §2.3 tools 21-23), Confirm / Cancel / Undo
// on ProposalConfirmCard route through the agent tool-path via
// `sendMessage({ text, toolHint })`, NOT via direct Convex mutations. So this
// context exposes a SINGLE `sendMessage` primitive. All three proposal actions,
// every drill-in, and every chip submission go through it.
//
// Spec: specs/W3-generative-ui.md §3.6, §9.2 CR-4; specs/W1-chat-home.md §14.2
// CB-5 (adapted for M12 single-method surface).
// ============================================================================

import {
    createContext,
    useContext,
    useState,
    type ReactNode,
} from "react";
import { useConvex } from "convex/react";

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
    onThreadIdChange?: (threadId: AgentThreadId) => void;
    children: ReactNode;
    // Stub override used by the preview harness.
    sendMessage?: (input: SendMessageInput) => Promise<void>;
};

export class ChatHttpError extends Error {
    readonly status: number;
    readonly payload: unknown;
    constructor(status: number, payload: unknown, message?: string) {
        super(message ?? `/api/agent/send failed with ${status}`);
        this.status = status;
        this.payload = payload;
    }
}

export function ChatInteractionProvider({
    threadId,
    onThreadIdChange,
    children,
    sendMessage: sendMessageOverride,
}: ProviderProps) {
    const convex = useConvex();
    const [localThreadId, setLocalThreadId] = useState<AgentThreadId | null>(threadId ?? null);

    // Keep local state in sync with controlled prop.
    const currentThreadId = threadId ?? localThreadId;

    const defaultSendMessage = async (input: SendMessageInput) => {
        const siteUrl = (convex as unknown as { url?: string }).url?.replace(
            ".convex.cloud",
            ".convex.site",
        );
        const endpoint = siteUrl ? `${siteUrl}/api/agent/send` : "/api/agent/send";

        const body: Record<string, unknown> = {
            prompt: input.text,
        };
        if (currentThreadId) body.threadId = currentThreadId;
        if (input.toolHint) body.toolHint = input.toolHint;

        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            credentials: "include",
        });

        if (!res.ok) {
            let payload: unknown = null;
            try {
                payload = await res.json();
            } catch {
                payload = await res.text();
            }
            throw new ChatHttpError(res.status, payload);
        }

        const data = (await res.json()) as {
            threadId: AgentThreadId;
            messageId: string;
        };

        if (data.threadId && data.threadId !== currentThreadId) {
            setLocalThreadId(data.threadId);
            onThreadIdChange?.(data.threadId);
        }
    };

    const value: ChatInteractionValue = {
        threadId: currentThreadId,
        sendMessage: sendMessageOverride ?? defaultSendMessage,
    };

    return <ChatInteractionContext.Provider value={value}>{children}</ChatInteractionContext.Provider>;
}

export function useChatInteraction(): ChatInteractionValue {
    const ctx = useContext(ChatInteractionContext);
    if (!ctx) {
        throw new Error(
            "useChatInteraction must be used within a <ChatInteractionProvider>. " +
                "W3 tool-result components require the provider to be mounted above them.",
        );
    }
    return ctx;
}
