"use client";

import { notFound } from "next/navigation";
import { AuditShell } from "../AuditShell";
import { ChatHome } from "@/components/chat/ChatHome";
import { MessageInput } from "@/components/chat/MessageInput";

export default function ChatHomeDarkAuditPage() {
    // CROWDEV-422: layered with middleware + vercel-build.sh — see middleware.ts for rationale.
    if (
        process.env.NEXT_PUBLIC_A11Y_AUDIT !== "1" ||
        process.env.VERCEL_ENV === "production"
    ) {
        notFound();
    }
    return (
        <AuditShell mode="dark">
            <main className="flex flex-1 flex-col">
                <ChatHome onSend={() => {}} />
            </main>
            <MessageInput onSend={() => {}} />
        </AuditShell>
    );
}
