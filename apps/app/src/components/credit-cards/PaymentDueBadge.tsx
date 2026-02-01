"use client";

import { Calendar } from "@untitledui/icons";
import { BadgeWithIcon } from "@repo/ui/untitledui/base/badges/badges";
import {
  getDaysUntilDue,
  getPaymentUrgency,
  formatDaysUntilDue,
  type PaymentUrgency,
} from "@/types/credit-cards";

interface PaymentDueBadgeProps {
  nextPaymentDueDate: string | null;
  isOverdue?: boolean;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

/**
 * Badge component for displaying payment due date status
 *
 * Color coding:
 * - Success (green): 14+ days
 * - Warning (yellow): 7-13 days
 * - Orange: 3-6 days
 * - Error (red): 0-2 days or overdue
 */
export function PaymentDueBadge({
  nextPaymentDueDate,
  isOverdue = false,
  size = "sm",
  showIcon = true,
}: PaymentDueBadgeProps) {
  const daysUntilDue = getDaysUntilDue(nextPaymentDueDate);

  // If overdue prop is true but we don't have a date, show generic overdue
  if (isOverdue && (daysUntilDue === null || daysUntilDue >= 0)) {
    return (
      <BadgeWithIcon
        type="pill-color"
        color="error"
        size={size}
        iconLeading={showIcon ? Calendar : undefined}
      >
        Overdue
      </BadgeWithIcon>
    );
  }

  // No due date
  if (daysUntilDue === null) {
    return null;
  }

  const urgency = getPaymentUrgency(daysUntilDue);
  const color = getUrgencyBadgeColor(urgency);
  const label = formatDaysUntilDue(daysUntilDue);

  return (
    <BadgeWithIcon
      type="pill-color"
      color={color}
      size={size}
      iconLeading={showIcon ? Calendar : undefined}
    >
      {label}
    </BadgeWithIcon>
  );
}

/**
 * Map payment urgency to Untitled UI badge color
 */
function getUrgencyBadgeColor(
  urgency: PaymentUrgency | null
): "success" | "warning" | "orange" | "error" | "gray" {
  switch (urgency) {
    case "safe":
      return "success";
    case "warning":
      return "warning";
    case "urgent":
      return "orange";
    case "critical":
    case "overdue":
      return "error";
    default:
      return "gray";
  }
}
