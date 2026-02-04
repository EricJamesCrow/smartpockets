"use client";

import { DashboardSidebar } from "@/components/application/dashboard-sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-primary flex min-h-screen flex-col lg:flex-row">
            <DashboardSidebar />
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}
