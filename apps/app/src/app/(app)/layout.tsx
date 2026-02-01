"use client";

import { DashboardSidebar } from "@/components/application/dashboard-sidebar";
import { ApprovalGate } from "@/components/auth/ApprovalGate";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ApprovalGate>
      <div className="flex flex-col lg:flex-row min-h-screen bg-primary">
        <DashboardSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </ApprovalGate>
  );
}
