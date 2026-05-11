"use client";

import { notFound } from "next/navigation";
import { AuditShell } from "../AuditShell";
import { MockThread } from "../MockThread";

export default function ThreadLightAuditPage() {
    // CROWDEV-422: layered with middleware + vercel-build.sh — see middleware.ts for rationale.
    if (
        process.env.NEXT_PUBLIC_A11Y_AUDIT !== "1" ||
        process.env.VERCEL_ENV === "production"
    ) {
        notFound();
    }
    return (
        <AuditShell mode="light">
            <MockThread />
        </AuditShell>
    );
}
