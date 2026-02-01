"use client";

import { BadgeWithDot } from "@repo/ui/untitledui/base/badges/badges";

interface CreditCardStatusBadgeProps {
  isLocked: boolean;
  isActive: boolean;
  isOverdue?: boolean;
  size?: "sm" | "md" | "lg";
}

/**
 * Badge component for displaying credit card status
 *
 * Shows:
 * - "Locked" (warning) if card is locked
 * - "Overdue" (error) if card has overdue payment
 * - "Active" (success) if card is active
 * - "Inactive" (gray) if card is inactive
 */
export function CreditCardStatusBadge({
  isLocked,
  isActive,
  isOverdue = false,
  size = "sm",
}: CreditCardStatusBadgeProps) {
  if (isLocked) {
    return (
      <BadgeWithDot type="pill-color" color="warning" size={size}>
        Locked
      </BadgeWithDot>
    );
  }

  if (isOverdue) {
    return (
      <BadgeWithDot type="pill-color" color="error" size={size}>
        Overdue
      </BadgeWithDot>
    );
  }

  if (!isActive) {
    return (
      <BadgeWithDot type="pill-color" color="gray" size={size}>
        Inactive
      </BadgeWithDot>
    );
  }

  return (
    <BadgeWithDot type="pill-color" color="success" size={size}>
      Active
    </BadgeWithDot>
  );
}
