// Server component (no "use client"): renders a `<script>` element whose
// children are a literal text node, which React allows without
// dangerouslySetInnerHTML. The script flips html.classList synchronously,
// before the chat surface paints, so Lighthouse's first navigation snapshot
// resolves the requested moss-palette mode for the test.

import type { ReactNode } from "react";

interface AuditShellProps {
    mode: "light" | "dark";
    children: ReactNode;
}

export function AuditShell({ mode, children }: AuditShellProps) {
    const targetClass = mode === "light" ? "light-mode" : "dark-mode";
    const inlineScript = `(function(){var c=document.documentElement.classList;c.remove('light-mode','dark-mode');c.add('${targetClass}');})();`;
    return (
        <>
            <script>{inlineScript}</script>
            <div className="flex min-h-screen flex-col bg-primary">{children}</div>
        </>
    );
}
