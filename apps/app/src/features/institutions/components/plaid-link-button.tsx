"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useAction } from "convex/react";
import { useUser } from "@clerk/nextjs";
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

  const { user } = useUser();
  const createLinkToken = useAction(api.plaidComponent.createLinkTokenAction);
  const onboardConnection = useAction(
    api.plaidComponent.onboardNewConnectionAction
  );

  // Fetch link token on component mount
  useEffect(() => {
    const initializePlaidLink = async () => {
      if (!user?.id) return;

      try {
        const linkTokenArgs: {
          userId: string;
          products?: string[];
          accountFilters?: unknown;
        } = { userId: user.id };

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
  }, [user?.id, createLinkToken, products, accountFilters]);

  // Handle successful account connection
  const onSuccess = useCallback(
    async (publicToken: string) => {
      if (!user?.id) {
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
          userId: user.id,
        });

        toast.success("Bank connected!", {
          id: toastId,
          description: `Synced ${result.accounts} accounts with ${result.transactions} transactions.`,
        });

        // Call optional success callback
        onSuccessCallback?.();
      } catch (error) {
        console.error("Error connecting bank:", error);
        toast.error("Failed to connect bank", {
          id: toastId,
          description:
            error instanceof Error ? error.message : "Please try again later.",
        });
      } finally {
        setIsConnecting(false);
      }
    },
    [user?.id, onboardConnection, onSuccessCallback]
  );

  // Initialize Plaid Link hook
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  const isDisabled = !ready || isConnecting;

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
