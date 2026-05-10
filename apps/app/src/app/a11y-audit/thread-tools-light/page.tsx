"use client";

import { notFound } from "next/navigation";
import { AuditShell } from "../AuditShell";
import { MockThread } from "../MockThread";

export default function ThreadToolsLightAuditPage() {
    if (process.env.NEXT_PUBLIC_A11Y_AUDIT !== "1") {
        notFound();
    }
    return (
        <AuditShell mode="light">
            <MockThread withTools />
        </AuditShell>
    );
}
