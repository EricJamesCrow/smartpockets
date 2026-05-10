"use client";

import { notFound } from "next/navigation";
import { AuditShell } from "../AuditShell";
import { ChatHome } from "@/components/chat/ChatHome";
import { MessageInput } from "@/components/chat/MessageInput";

export default function ChatHomeLightAuditPage() {
    if (process.env.NEXT_PUBLIC_A11Y_AUDIT !== "1") {
        notFound();
    }
    return (
        <AuditShell mode="light">
            <main className="flex flex-1 flex-col">
                <ChatHome onSend={() => {}} />
            </main>
            <MessageInput onSend={() => {}} />
        </AuditShell>
    );
}
