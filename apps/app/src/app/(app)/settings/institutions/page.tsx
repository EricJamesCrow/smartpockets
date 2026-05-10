"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { SearchLg, Building07 } from "@untitledui/icons";
import { SectionHeader } from "@repo/ui/untitledui/application/section-headers/section-headers";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Toggle } from "@repo/ui/untitledui/base/toggle/toggle";
import { Input } from "@repo/ui/untitledui/base/input/input";
import { Tabs } from "@repo/ui/untitledui/application/tabs/tabs";
import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import { FeaturedIcon } from "@repo/ui/untitledui/foundations/featured-icon/featured-icon";
import { PlaidLinkButton, useTogglePlaidItem, InstitutionLogo } from "@/features/institutions";

/**
 * Banking Institutions List Page
 *
 * Displays all connected Plaid banking institutions.
 * Features:
 * - Connect new bank via PlaidLinkButton
 * - Filter by All/Active/Inactive tabs
 * - Search institutions
 * - Toggle enable/disable
 * - Navigate to detail page
 */
export default function InstitutionsPage() {
  const router = useRouter();
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">("all");

  // Fetch user's plaid items
  const plaidItems = useQuery(
    api.items.queries.getItemsForViewer,
    isAuthenticated ? {} : "skip"
  );

  // Toggle hook
  const { toggle: toggleItem, isLoading: isToggling } = useTogglePlaidItem();

  if (isAuthLoading) {
    return null;
  }

  // Filter items based on tab and search
  const filteredItems = (plaidItems ?? []).filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      (item.institutionName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const isActive = item.isActive !== false; // undefined or true = active

    switch (activeTab) {
      case "active":
        return matchesSearch && isActive;
      case "inactive":
        return matchesSearch && !isActive;
      default:
        return matchesSearch;
    }
  });

  const activeCount = (plaidItems ?? []).filter((i) => i.isActive !== false).length;
  const inactiveCount = (plaidItems ?? []).filter((i) => i.isActive === false).length;

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-8">
      {/* Header */}
      <SectionHeader.Root className="border-none pb-0">
        <SectionHeader.Group>
          <div className="flex flex-1 flex-col justify-center gap-0.5">
            <SectionHeader.Heading>Banking Institutions</SectionHeader.Heading>
            <SectionHeader.Subheading>
              Connect and manage your bank accounts for credit card syncing.
            </SectionHeader.Subheading>
          </div>
          <PlaidLinkButton
            onSuccess={() => router.refresh()}
            size="md"
            color="primary"
          />
        </SectionHeader.Group>
      </SectionHeader.Root>

      {/* Filter tabs and search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as "all" | "active" | "inactive")}
        >
          <Tabs.List
            size="sm"
            type="button-gray"
            items={[
              { id: "all", label: `All (${plaidItems?.length ?? 0})` },
              { id: "active", label: `Active (${activeCount})` },
              { id: "inactive", label: `Inactive (${inactiveCount})` },
            ]}
          >
            {(item) => <Tabs.Item id={item.id}>{item.label}</Tabs.Item>}
          </Tabs.List>
        </Tabs>
        <div className="w-full sm:w-80">
          <Input
            size="sm"
            shortcut
            aria-label="Search institutions"
            placeholder="Search institutions"
            icon={SearchLg}
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
      </div>

      {/* Institutions list */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <FeaturedIcon
            theme="outline"
            color="gray"
            size="xl"
            icon={Building07}
          />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-primary">
              {plaidItems?.length === 0
                ? "No institutions connected"
                : "No matching institutions"}
            </h3>
            <p className="text-sm text-tertiary">
              {plaidItems?.length === 0
                ? "Connect a bank to start syncing your credit card data."
                : "Try adjusting your search or filter criteria."}
            </p>
          </div>
          {plaidItems?.length === 0 && (
            <PlaidLinkButton onSuccess={() => router.refresh()} />
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-4 lg:gap-0">
          {filteredItems.map((item) => {
            const isActive = item.isActive !== false;
            const hasError = !!item.syncError;
            const lastSynced = item.lastSyncedAt
              ? new Date(item.lastSyncedAt).toLocaleDateString()
              : "Never";

            return (
              <li
                key={item._id}
                className="flex flex-col gap-4 border-b border-secondary py-4 last:border-none lg:flex-row lg:items-center"
              >
                <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center">
                  {/* Institution logo (Plaid) or fallback icon */}
                  <div className="flex items-center justify-between">
                    <InstitutionLogo
                      institutionName={item.institutionName}
                      logoBase64={item.institutionLogoBase64}
                      size="md"
                    />
                    <div className="lg:hidden">
                      <Toggle
                        isSelected={isActive}
                        size="md"
                        onChange={() => toggleItem(item._id)}
                        isDisabled={isToggling}
                      />
                    </div>
                  </div>
                  {/* Institution details */}
                  <div className="flex flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-md font-semibold text-secondary">
                        {item.institutionName || "Unknown Institution"}
                      </p>
                      {!isActive && (
                        <Badge color="gray" size="sm">
                          Paused
                        </Badge>
                      )}
                      {hasError && (
                        <Badge color="error" size="sm">
                          Error
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-tertiary">
                      Last synced: {lastSynced}
                    </p>
                  </div>
                </div>
                {/* Actions */}
                <div className="-mt-1 flex items-center gap-4 lg:mt-0">
                  <Button
                    color="link-gray"
                    size="md"
                    onClick={() =>
                      router.push(`/settings/institutions/${item._id}`)
                    }
                  >
                    View details
                  </Button>
                  <div className="max-lg:hidden">
                    <Toggle
                      isSelected={isActive}
                      size="md"
                      onChange={() => toggleItem(item._id)}
                      isDisabled={isToggling}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
