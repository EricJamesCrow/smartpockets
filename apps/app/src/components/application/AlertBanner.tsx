"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { AlertCircle, XClose } from "@untitledui/icons";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { cx } from "@repo/ui/utils";
import { useState } from "react";
import Link from "next/link";

export function AlertBanner() {
  const { isAuthenticated } = useConvexAuth();
  const alerts = useQuery(
    api.dashboard.queries.getAlerts,
    isAuthenticated ? {} : "skip"
  );
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  if (!alerts || alerts.length === 0) return null;

  const visibleAlerts = alerts
    .filter((a) => !dismissedIds.has(a.id))
    .slice(0, 3);

  if (visibleAlerts.length === 0) return null;

  const dismissAlert = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  const severityStyles = {
    critical: "bg-error-50 border-error-200 text-error-700",
    warning: "bg-warning-50 border-warning-200 text-warning-700",
    info: "bg-primary-50 border-primary-200 text-primary-700",
  };

  const hiddenCount = alerts.length - visibleAlerts.length - dismissedIds.size;

  return (
    <div className="flex flex-col gap-2 px-4 pt-4 lg:px-8 lg:pt-6">
      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className={cx(
            "flex items-center justify-between gap-4 rounded-lg border px-4 py-3",
            severityStyles[alert.severity]
          )}
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{alert.title}</p>
              <p className="text-sm">{alert.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {alert.actionHref && alert.actionLabel && (
              <Link href={alert.actionHref}>
                <Button size="sm" color="secondary">
                  {alert.actionLabel}
                </Button>
              </Link>
            )}
            <button
              onClick={() => dismissAlert(alert.id)}
              className="rounded p-1 hover:bg-black/5"
              aria-label="Dismiss"
            >
              <XClose className="size-4" />
            </button>
          </div>
        </div>
      ))}
      {hiddenCount > 0 && (
        <p className="text-sm text-tertiary">+{hiddenCount} more alerts</p>
      )}
    </div>
  );
}
