"use client";

// ============================================================================
// W1 ChatInteractionProvider: live implementation.
//
// Chat sends post to the Convex HTTP action at `.convex.site`. Proposal
// confirmation/cancellation uses the trusted public Convex mutations because
// those state transitions cannot be safely performed by an LLM tool hint.
//
// Spec: specs/W3-generative-ui.md §3.6, §9.2 CR-4; specs/W1-chat-home.md §14.2
// CB-5 (adapted for M12 single-method surface).
// ============================================================================
import { type ReactNode, createContext, useContext, useState } from "react";
import { useAuth } from "@clerk/nextjs";
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

// Typed agent error surfaced by sendMessage. ChatView routes each kind to its
// own surface (banner, modal, inline). See spec W1 §8.
export type AgentError =
    | { kind: "rate_limited"; retryAfterSeconds: number }
    | { kind: "budget_exhausted"; reason: string }
    | { kind: "llm_down" }
    | { kind: "reconsent_required"; plaidItemId: string }
    | { kind: "first_turn_guard" }
    | { kind: "proposal_timed_out" }
    | { kind: "proposal_invalid_state" };

export class TypedAgentError extends Error {
    readonly kind: AgentError["kind"];
    readonly data: AgentError;
    constructor(data: AgentError) {
        super(data.kind);
        this.kind = data.kind;
        this.data = data;
    }
}

function getAgentSendEndpoint(): string {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    if (!convexUrl) return "/api/agent/send";

    try {
        const url = new URL(convexUrl);
        url.hostname = url.hostname.replace(/\.convex\.cloud$/, ".convex.site");
        url.pathname = "/api/agent/send";
        url.search = "";
        url.hash = "";
        return url.toString();
    } catch {
        return "/api/agent/send";
    }
}

export function ChatInteractionProvider({ threadId, onThreadIdChange, children, sendMessage: sendMessageOverride }: ProviderProps) {
    const { getToken } = useAuth();
    const [localThreadId, setLocalThreadId] = useState<AgentThreadId | null>(threadId ?? null);

    // Keep local state in sync with controlled prop.
    const currentThreadId = threadId ?? localThreadId;

    const defaultSendMessage = async (input: SendMessageInput) => {
        const endpoint = getAgentSendEndpoint();

        const body: Record<string, unknown> = {
            prompt: input.text,
        };
        if (currentThreadId) body.threadId = currentThreadId;
        if (input.toolHint) body.toolHint = input.toolHint;

        const token = await getToken({ template: "convex" });
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(endpoint, {
            method: "POST",
            headers,
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
            if (res.status === 429 && payload && typeof payload === "object") {
                const err = payload as {
                    error?: string;
                    reason?: string;
                    retryAfterSeconds?: number;
                };
                if (err.error === "rate_limited") {
                    throw new TypedAgentError({
                        kind: "rate_limited",
                        retryAfterSeconds: err.retryAfterSeconds ?? 30,
                    });
                }
                if (err.error === "budget_exhausted") {
                    throw new TypedAgentError({
                        kind: "budget_exhausted",
                        reason: err.reason ?? "Monthly budget reached.",
                    });
                }
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
            "useChatInteraction must be used within a <ChatInteractionProvider>. " + "W3 tool-result components require the provider to be mounted above them.",
        );
    }
    return ctx;
}
