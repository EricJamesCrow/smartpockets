// apps/app/src/app/(app)/dashboard/page.tsx
"use client";

import { AlertBanner } from "./components/AlertBanner";
import { HeroMetrics } from "./components/HeroMetrics";
import { UpcomingPayments } from "./components/UpcomingPayments";
import { YourCards } from "./components/YourCards";
import { ConnectedBanks } from "./components/ConnectedBanks";
import { SpendingBreakdown } from "./components/SpendingBreakdown";
import { RecentTransactions } from "./components/RecentTransactions";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      {/* Critical Alert Banner */}
      <AlertBanner />

      {/* Hero Metrics */}
      <HeroMetrics />

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          <UpcomingPayments />
          <ConnectedBanks />
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          <YourCards />
          <SpendingBreakdown />
        </div>
      </div>

      {/* Recent Transactions - Full Width */}
      <RecentTransactions />
    </div>
  );
}
