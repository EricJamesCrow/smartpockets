"use client";

import { AlertBanner } from "./dashboard/components/AlertBanner";
import { HeroMetrics } from "./dashboard/components/HeroMetrics";
import { UpcomingPayments } from "./dashboard/components/UpcomingPayments";
import { YourCards } from "./dashboard/components/YourCards";
import { ConnectedBanks } from "./dashboard/components/ConnectedBanks";
import { SpendingBreakdown } from "./dashboard/components/SpendingBreakdown";
import { RecentTransactions } from "./dashboard/components/RecentTransactions";

export default function HomePage() {
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
