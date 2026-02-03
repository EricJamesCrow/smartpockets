/**
 * Plaid Component React Hooks
 *
 * React hooks for integrating Plaid Link with Convex.
 * Wraps react-plaid-link with Convex action integration.
 *
 * @example
 * ```tsx
 * import { usePlaidLink } from "@crowdevelopment/convex-plaid/react";
 * import { api } from "../convex/_generated/api";
 *
 * function ConnectBank() {
 *   const { open, ready, isLoading, error } = usePlaidLink({
 *     createLinkToken: api.plaid.createLinkToken,
 *     exchangePublicToken: api.plaid.exchangePublicToken,
 *     userId: user.id,
 *     onSuccess: (plaidItemId) => {
 *       console.log("Connected:", plaidItemId);
 *     },
 *   });
 *
 *   return (
 *     <button onClick={open} disabled={!ready || isLoading}>
 *       {isLoading ? "Connecting..." : "Connect Bank"}
 *     </button>
 *   );
 * }
 * ```
 */
import type { FunctionReference } from "convex/server";
/**
 * Configuration for usePlaidLink hook.
 */
export interface UsePlaidLinkOptions {
    /**
     * Convex action reference to create a link token.
     * Should be your wrapped action that calls plaid.createLinkToken.
     */
    createLinkToken: FunctionReference<"action", "public", {
        userId: string;
        products?: string[];
        webhookUrl?: string;
    }, {
        linkToken: string;
    }>;
    /**
     * Convex action reference to exchange the public token.
     * Should be your wrapped action that calls plaid.exchangePublicToken.
     */
    exchangePublicToken: FunctionReference<"action", "public", {
        publicToken: string;
        userId: string;
    }, {
        success: boolean;
        itemId: string;
        plaidItemId: string;
    }>;
    /**
     * User ID to associate with the Plaid connection.
     */
    userId: string;
    /**
     * Products to request from Plaid (default: ["transactions", "liabilities"]).
     */
    products?: string[];
    /**
     * Webhook URL for Plaid to send updates (optional).
     */
    webhookUrl?: string;
    /**
     * Callback when connection is successful.
     * @param plaidItemId - The Convex document ID of the created plaidItem
     * @param metadata - Plaid Link metadata
     */
    onSuccess?: (plaidItemId: string, metadata: any) => void;
    /**
     * Callback when user exits Plaid Link.
     */
    onExit?: () => void;
    /**
     * Callback when an error occurs.
     */
    onError?: (error: Error) => void;
    /**
     * Whether to automatically fetch the link token on mount.
     * Default: true
     */
    autoFetchToken?: boolean;
}
/**
 * Return value from usePlaidLink hook.
 */
export interface UsePlaidLinkResult {
    /**
     * Open Plaid Link modal.
     */
    open: () => void;
    /**
     * Whether Plaid Link is ready to open.
     */
    ready: boolean;
    /**
     * Whether a link token is being fetched.
     */
    isLoading: boolean;
    /**
     * Whether the public token is being exchanged.
     */
    isExchanging: boolean;
    /**
     * Any error that occurred.
     */
    error: Error | null;
    /**
     * The current link token (for debugging).
     */
    linkToken: string | null;
    /**
     * Manually fetch a new link token.
     */
    refreshToken: () => Promise<void> | void;
}
/**
 * React hook for integrating Plaid Link with Convex.
 *
 * Handles:
 * - Fetching link token from Convex action
 * - Opening Plaid Link modal
 * - Exchanging public token for access token
 * - Calling success callback with plaidItemId
 *
 * @param options - Configuration options
 * @returns Object with open function, ready state, and error
 */
export declare function usePlaidLink(options: UsePlaidLinkOptions): UsePlaidLinkResult;
/**
 * Configuration for useUpdatePlaidLink hook.
 */
export interface UseUpdatePlaidLinkOptions {
    /**
     * Convex action reference to create an update link token.
     * Should be your wrapped action that calls plaid.createUpdateLinkToken.
     */
    createUpdateLinkToken: FunctionReference<"action", "public", {
        plaidItemId: string;
    }, {
        linkToken: string;
    }>;
    /**
     * Convex action reference to complete re-auth.
     * Should be your wrapped action that calls plaid.completeReauth.
     */
    completeReauth: FunctionReference<"action", "public", {
        plaidItemId: string;
    }, {
        success: boolean;
    }>;
    /**
     * The plaidItemId that needs re-authentication.
     */
    plaidItemId: string;
    /**
     * Callback when re-auth is successful.
     */
    onSuccess?: () => void;
    /**
     * Callback when user exits without completing re-auth.
     */
    onExit?: () => void;
    /**
     * Callback when an error occurs.
     */
    onError?: (error: Error) => void;
    /**
     * Whether to automatically fetch the link token on mount.
     * Default: false (requires manual trigger for re-auth)
     */
    autoFetchToken?: boolean;
}
/**
 * React hook for re-authenticating a Plaid connection.
 *
 * Used when a plaidItem is in 'needs_reauth' status.
 * Opens Plaid Link in update mode.
 */
export declare function useUpdatePlaidLink(options: UseUpdatePlaidLinkOptions): UsePlaidLinkResult;
//# sourceMappingURL=index.d.ts.map