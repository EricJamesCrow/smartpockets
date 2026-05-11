"use client";

// Static, Convex-free clone of the MessageBubble visual structure used only
// for the Lighthouse audit harness. Mirrors the actual chat thread layout so
// contrast / aria scoring matches real usage. If MessageBubble ever changes
// its color tokens, update this clone or the audit becomes stale.
//
// Uses a local MockUserAvatar (below) instead of the production `UserAvatar`
// because the production avatar calls `useUser()` from Clerk; the audit-mode
// root layout intentionally skips the ClerkProvider tree (next-themes inside
// it would override our html.class hint), so the real avatar would throw.

import { AssistantAvatar } from "@/components/chat/AssistantAvatar";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageActions } from "@/components/chat/MessageActions";
import { ToolCallDisplay } from "@/components/chat/ToolCallDisplay";
import { CreditCard01, MessageSmileSquare } from "@untitledui/icons";
import { cx } from "@/utils/cx";

// Mirror of the production UserAvatar's visual shape and color tokens so the
// audit run scores the same contrast surface (bg-brand-solid + text-white).
function MockUserAvatar({ size = "md" }: { size?: "sm" | "md" }) {
    const sizeClass = size === "sm" ? "size-8 text-xs" : "size-10 text-xs";
    return (
        <div
            className={cx(
                "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-solid font-semibold text-white",
                sizeClass,
            )}
            aria-hidden
        >
            EC
        </div>
    );
}

interface MockThreadProps {
    withTools?: boolean;
}

export function MockThread({ withTools = false }: MockThreadProps) {
    return (
        <div className="flex h-full flex-col">
            <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
                <div
                    className="mx-auto flex max-w-4xl flex-col gap-6"
                    role="log"
                    aria-live="polite"
                    aria-label="Conversation history"
                >
                    <UserBubble text="What did I spend on groceries last month?" />
                    <AssistantBubble text="You spent $412.83 on groceries in March 2026 across 14 transactions. The biggest single charge was $87.21 at Whole Foods on March 14." />
                    <UserBubble text="Show me the actual transactions." />
                    {withTools && (
                        <ToolCallDisplay
                            toolName="list_credit_cards"
                            input={{ window: "month_to_date" }}
                            output={{ ids: ["creditCards:cd_1"] }}
                            state="output-available"
                            summary="2 cards listed"
                            icon={CreditCard01}
                        />
                    )}
                    <AssistantBubble text="Here's the list of grocery transactions for March. The top three by amount are Whole Foods ($87.21), Trader Joe's ($63.45), and Sprouts ($58.18)." />
                    {withTools && (
                        <ToolCallDisplay
                            toolName="get_spend_by_category"
                            input={{ category: "groceries", window: "month_to_date" }}
                            output={{ ids: ["plaid:plaidTransactions:tx_1", "plaid:plaidTransactions:tx_2"] }}
                            state="output-available"
                            summary="14 transactions, $412.83 total"
                            icon={MessageSmileSquare}
                        />
                    )}
                </div>
            </main>
            <MessageInput onSend={() => {}} />
        </div>
    );
}

function UserBubble({ text }: { text: string }) {
    return (
        <div
            className={cx("group/msg relative flex flex-row-reverse gap-4")}
            // Match MessageBubble role layout for VoiceOver swipe order.
            aria-label="Message from you"
            role="article"
        >
            <MockUserAvatar />
            <div className="flex max-w-[80%] flex-col items-end gap-1">
                <div className="rounded-2xl rounded-tr-none bg-brand-solid px-5 py-3 text-sm text-white">
                    <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
                </div>
                <MessageActions messageText={text} role="user" className="mr-1" />
            </div>
        </div>
    );
}

function AssistantBubble({ text }: { text: string }) {
    return (
        <div
            className={cx("group/msg relative flex gap-4")}
            aria-label="Message from agent"
            role="article"
        >
            <AssistantAvatar />
            <div className="flex max-w-[80%] flex-col items-start gap-1">
                <div
                    className={cx(
                        "rounded-2xl rounded-tl-none border border-secondary bg-secondary px-5 py-3 text-sm text-primary",
                        "dark:border-[var(--sp-moss-line)] dark:bg-[var(--sp-surface-panel-strong)] dark:shadow-[var(--sp-inset-hairline)]",
                    )}
                >
                    <p className="leading-relaxed">{text}</p>
                </div>
                <MessageActions messageText={text} role="assistant" className="ml-1" />
            </div>
        </div>
    );
}
