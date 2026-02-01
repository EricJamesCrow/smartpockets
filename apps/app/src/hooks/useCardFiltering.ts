"use client";

import { useMemo } from "react";
import type {
  CardFilters,
  ExtendedCreditCardData,
} from "@/types/credit-cards";
import {
  getDaysUntilDue,
  getUtilizationLevel,
} from "@/types/credit-cards";

/**
 * Hook for filtering and sorting credit cards
 *
 * Supports:
 * - Brand filtering (Visa, Mastercard, Amex, Discover)
 * - Status filtering (Active, Locked, Inactive)
 * - Payment due filtering (7 days, 14 days, Overdue)
 * - Utilization filtering (Low <30%, Medium 30-70%, High >70%)
 * - Multiple sort options
 *
 * Uses AND logic: cards must match ALL active filters
 */
export function useCardFiltering(
  cards: ExtendedCreditCardData[],
  filters: CardFilters
): ExtendedCreditCardData[] {
  return useMemo(() => {
    let result = [...cards];

    // 1. Brand filter
    if (filters.brand !== "all") {
      result = result.filter((card) => card.brand === filters.brand);
    }

    // 2. Status filter
    if (filters.status !== "all") {
      result = result.filter((card) => {
        switch (filters.status) {
          case "locked":
            return card.isLocked;
          case "active":
            return card.isActive && !card.isLocked;
          case "inactive":
            return !card.isActive;
          default:
            return true;
        }
      });
    }

    // 3. Payment due filter
    if (filters.paymentDue !== "all") {
      result = result.filter((card) => {
        const days = getDaysUntilDue(card.nextPaymentDueDate);
        if (days === null) return false;

        switch (filters.paymentDue) {
          case "overdue":
            return days < 0 || card.isOverdue;
          case "due_7_days":
            return days >= 0 && days <= 7;
          case "due_14_days":
            return days >= 0 && days <= 14;
          default:
            return true;
        }
      });
    }

    // 4. Utilization filter
    if (filters.utilization !== "all") {
      result = result.filter((card) => {
        const level = getUtilizationLevel(card.utilization);
        return level === filters.utilization;
      });
    }

    // 5. Sorting
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case "cardName":
          return a.cardName.localeCompare(b.cardName);

        case "company":
          return a.company.localeCompare(b.company);

        case "apr_asc":
          return (a.apr ?? 999) - (b.apr ?? 999);

        case "apr_desc":
          return (b.apr ?? 0) - (a.apr ?? 0);

        case "utilization_asc":
          return (a.utilization ?? 999) - (b.utilization ?? 999);

        case "utilization_desc":
          return (b.utilization ?? 0) - (a.utilization ?? 0);

        case "payment_due": {
          const daysA = getDaysUntilDue(a.nextPaymentDueDate) ?? 999;
          const daysB = getDaysUntilDue(b.nextPaymentDueDate) ?? 999;
          return daysA - daysB;
        }

        case "available_credit":
          return (b.availableCredit ?? 0) - (a.availableCredit ?? 0);

        case "current_balance":
          return (b.currentBalance ?? 0) - (a.currentBalance ?? 0);

        default:
          return 0;
      }
    });

    return result;
  }, [cards, filters]);
}

/**
 * Check if any filters are active (not "all")
 */
export function hasActiveFilters(filters: CardFilters): boolean {
  return (
    filters.brand !== "all" ||
    filters.status !== "all" ||
    filters.paymentDue !== "all" ||
    filters.utilization !== "all"
  );
}

/**
 * Get a human-readable description of active filters
 */
export function getActiveFilterDescriptions(filters: CardFilters): string[] {
  const descriptions: string[] = [];

  if (filters.brand !== "all") {
    const brandMap: Record<string, string> = {
      visa: "Visa",
      mastercard: "Mastercard",
      amex: "Amex",
      discover: "Discover",
    };
    descriptions.push(`Brand: ${brandMap[filters.brand] || filters.brand}`);
  }
  if (filters.status !== "all") {
    const statusMap = {
      active: "Active",
      locked: "Locked",
      inactive: "Inactive",
    };
    descriptions.push(`Status: ${statusMap[filters.status]}`);
  }
  if (filters.paymentDue !== "all") {
    const dueMap = {
      due_7_days: "Due within 7 days",
      due_14_days: "Due within 14 days",
      overdue: "Overdue",
    };
    descriptions.push(`Payment: ${dueMap[filters.paymentDue]}`);
  }
  if (filters.utilization !== "all") {
    const utilizationMap = {
      low: "Low (<30%)",
      medium: "Medium (30-70%)",
      high: "High (>70%)",
    };
    descriptions.push(`Utilization: ${utilizationMap[filters.utilization]}`);
  }

  return descriptions;
}
