"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useAction, useConvexAuth, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import { Plus } from "@untitledui/icons";
import { Button } from "@repo/ui/untitledui/base/buttons/button";

interface PlaidLinkButtonProps {
  /** Custom button content - if provided, renders as clickable wrapper */
  children?: ReactNode;
  /** Callback fired after successful bank connection */
  onSuccess?: () => void;
  /** Button label text for default rendering */
  buttonLabel?: string;
  /** Button size - sm, md, lg, xl */
  size?: "sm" | "md" | "lg" | "xl";
  /** Button color variant */
  color?: "primary" | "secondary" | "tertiary";
  /** Plaid products for link token creation */
  products?: string[];
  /** Plaid account filters for link token creation */
  accountFilters?: unknown;
  /** Custom className for the button */
  className?: string;
}

/**
 * Plaid Link Button Component
 *
 * Opens the Plaid Link UI to connect a bank account.
 * Handles the full connection flow including token creation and account onboarding.
 *
 * Features:
 * - Automatically fetches link token on mount
 * - Opens Plaid Link modal for bank selection
 * - Orchestrates full onboarding (accounts, transactions, liabilities, credit cards)
 * - Shows toast notifications for success/error states
 *
 * @example
 * // Default button
 * <PlaidLinkButton onSuccess={() => router.refresh()} />
 *
 * // Custom trigger
 * <PlaidLinkButton onSuccess={() => router.refresh()}>
 *   <div className="custom-trigger">Connect Bank</div>
 * </PlaidLinkButton>
 */
export function PlaidLinkButton({
  children,
  onSuccess: onSuccessCallback,
  buttonLabel = "Link Bank Account",
  size = "md",
  color = "primary",
  products,
  accountFilters,
  className,
}: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const { isAuthenticated } = useConvexAuth();
  const createLinkToken = useAction(api.plaidComponent.createLinkTokenAction);
  const onboardConnection = useAction(
    api.plaidComponent.onboardNewConnectionAction
  );

  // CROWDEV-330: gate by the plan's connection cap.
  const planUsage = useQuery(api.billing.queries.getMyPlanAndUsage);
  const atPlaidCap =
    planUsage !== undefined &&
    planUsage.plan !== "unlimited" &&
    planUsage.plaid.used >= planUsage.plaid.limit;

  // Fetch link token on component mount
  useEffect(() => {
    const initializePlaidLink = async () => {
      if (!isAuthenticated || atPlaidCap) return;

      try {
        const linkTokenArgs: {
          products?: string[];
          accountFilters?: unknown;
        } = {};

        if (products) {
          linkTokenArgs.products = products;
        }
        if (accountFilters !== undefined) {
          linkTokenArgs.accountFilters = accountFilters;
        }

        const result = await createLinkToken(linkTokenArgs);
        setLinkToken(result.linkToken);
      } catch (error) {
        console.error("Error creating link token:", error);
        toast.error("Failed to initialize bank connection", {
          description: "Please try again later.",
        });
      }
    };

    initializePlaidLink();
  }, [isAuthenticated, atPlaidCap, createLinkToken, products, accountFilters]);

  // Handle successful account connection
  const onSuccess = useCallback(
    async (publicToken: string) => {
      if (!isAuthenticated) {
        toast.error("Authentication required", {
          description: "Please sign in to connect a bank account.",
        });
        return;
      }

      setIsConnecting(true);

      const toastId = toast.loading("Connecting bank...", {
        description: "This may take a moment.",
      });

      try {
        // Call Convex action directly (orchestrates full onboarding flow)
        const result = await onboardConnection({
          publicToken,
        });

        toast.success("Bank connected!", {
          id: toastId,
          description: `Synced ${result.accounts} accounts with ${result.transactions} transactions.`,
        });

        // Call optional success callback
        onSuccessCallback?.();
      } catch (error) {
        console.error("Error connecting bank:", error);
        const msg = error instanceof Error ? error.message : "";
        if (msg.includes("plaid_connection_limit")) {
          toast.error("Connection limit reached", {
            id: toastId,
            description: "Upgrade to Pro to connect more banks.",
          });
          return;
        }
        toast.error("Failed to connect bank", {
          id: toastId,
          description:
            error instanceof Error ? error.message : "Please try again later.",
        });
      } finally {
        setIsConnecting(false);
      }
    },
    [isAuthenticated, onboardConnection, onSuccessCallback]
  );

  // Initialize Plaid Link hook
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  const isDisabled = !ready || isConnecting;

  // CROWDEV-330: at the plan's connection cap, prompt upgrade instead of Link.
  if (atPlaidCap) {
    return (
      <Button
        size={size}
        color={color}
        href="/settings/billing"
        iconLeading={Plus}
        className={className}
      >
        Upgrade to connect more
      </Button>
    );
  }

  // If custom children provided, render as clickable wrapper
  if (children) {
    const handleClick = () => {
      if (!isDisabled) {
        open();
      }
    };

    return (
      <div
        onClick={handleClick}
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleClick();
          }
        }}
        style={{
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: isDisabled ? 0.5 : 1,
        }}
        aria-disabled={isDisabled}
      >
        {children}
      </div>
    );
  }

  // Default rendering with UntitledUI Button
  return (
    <Button
      onClick={() => open()}
      isDisabled={isDisabled}
      isLoading={isConnecting}
      size={size}
      color={color}
      iconLeading={Plus}
      className={className}
    >
      {isConnecting ? "Connecting..." : buttonLabel}
    </Button>
  );
}
