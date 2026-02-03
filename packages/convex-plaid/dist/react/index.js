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
import { useState, useEffect, useCallback, useRef } from "react";
import { usePlaidLink as usePlaidLinkBase } from "react-plaid-link";
import { useAction } from "convex/react";
// =============================================================================
// HOOK
// =============================================================================
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
export function usePlaidLink(options) {
    const { createLinkToken, exchangePublicToken, userId, products, webhookUrl, onSuccess, onExit, onError, autoFetchToken = true, } = options;
    // State
    const [linkToken, setLinkToken] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isExchanging, setIsExchanging] = useState(false);
    const [error, setError] = useState(null);
    // Refs to track current fetch and prevent race conditions
    const abortControllerRef = useRef(null);
    const isFetchingRef = useRef(false);
    // Convex actions
    const createToken = useAction(createLinkToken);
    const exchangeToken = useAction(exchangePublicToken);
    // Fetch link token
    const fetchLinkToken = useCallback(async () => {
        if (!userId)
            return;
        // Prevent concurrent fetches
        if (isFetchingRef.current)
            return;
        // Abort any previous pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        isFetchingRef.current = true;
        setIsLoading(true);
        setError(null);
        try {
            const result = await createToken({
                userId,
                products,
                webhookUrl,
            });
            // Check if this request was aborted
            if (abortController.signal.aborted)
                return;
            setLinkToken(result.linkToken);
        }
        catch (e) {
            if (abortController.signal.aborted)
                return;
            const err = e instanceof Error ? e : new Error(String(e));
            setError(err);
            onError?.(err);
        }
        finally {
            if (!abortController.signal.aborted) {
                setIsLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, [userId, products, webhookUrl, createToken, onError]);
    // Fetch token on mount if autoFetchToken is true
    useEffect(() => {
        if (autoFetchToken && userId) {
            fetchLinkToken();
        }
    }, [autoFetchToken, userId, fetchLinkToken]);
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);
    // Handle Plaid Link success
    const handleSuccess = useCallback(async (publicToken, metadata) => {
        setIsExchanging(true);
        setError(null);
        try {
            const result = await exchangeToken({
                publicToken,
                userId,
            });
            if (result.success) {
                onSuccess?.(result.plaidItemId, metadata);
            }
            else {
                throw new Error("Token exchange failed");
            }
        }
        catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            setError(err);
            onError?.(err);
        }
        finally {
            setIsExchanging(false);
        }
    }, [userId, exchangeToken, onSuccess, onError]);
    // Handle Plaid Link exit
    const handleExit = useCallback(() => {
        onExit?.();
    }, [onExit]);
    // Configure Plaid Link
    const plaidConfig = {
        token: linkToken,
        onSuccess: handleSuccess,
        onExit: handleExit,
    };
    // Use the base Plaid Link hook
    const { open: openBase, ready } = usePlaidLinkBase(plaidConfig);
    // Wrap open to ensure correct type signature
    const open = useCallback(() => {
        openBase();
    }, [openBase]);
    return {
        open,
        ready: ready && !!linkToken && !isExchanging,
        isLoading,
        isExchanging,
        error,
        linkToken,
        refreshToken: fetchLinkToken,
    };
}
/**
 * React hook for re-authenticating a Plaid connection.
 *
 * Used when a plaidItem is in 'needs_reauth' status.
 * Opens Plaid Link in update mode.
 */
export function useUpdatePlaidLink(options) {
    const { createUpdateLinkToken, completeReauth, plaidItemId, onSuccess, onExit, onError, autoFetchToken = false, } = options;
    // State
    const [linkToken, setLinkToken] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isExchanging, setIsExchanging] = useState(false);
    const [error, setError] = useState(null);
    // Refs to track current fetch and prevent race conditions
    const abortControllerRef = useRef(null);
    const isFetchingRef = useRef(false);
    // Convex actions
    const createToken = useAction(createUpdateLinkToken);
    const completeAuth = useAction(completeReauth);
    // Fetch update link token
    const fetchLinkToken = useCallback(async () => {
        if (!plaidItemId)
            return;
        // Prevent concurrent fetches
        if (isFetchingRef.current)
            return;
        // Abort any previous pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        isFetchingRef.current = true;
        setIsLoading(true);
        setError(null);
        try {
            const result = await createToken({ plaidItemId });
            // Check if this request was aborted
            if (abortController.signal.aborted)
                return;
            setLinkToken(result.linkToken);
        }
        catch (e) {
            if (abortController.signal.aborted)
                return;
            const err = e instanceof Error ? e : new Error(String(e));
            setError(err);
            onError?.(err);
        }
        finally {
            if (!abortController.signal.aborted) {
                setIsLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, [plaidItemId, createToken, onError]);
    // Fetch token on mount if autoFetchToken is true
    useEffect(() => {
        if (autoFetchToken && plaidItemId) {
            fetchLinkToken();
        }
    }, [autoFetchToken, plaidItemId, fetchLinkToken]);
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);
    // Handle Plaid Link success (re-auth doesn't return new public token)
    const handleSuccess = useCallback(async (_publicToken, _metadata) => {
        setIsExchanging(true);
        setError(null);
        try {
            const result = await completeAuth({ plaidItemId });
            if (result.success) {
                onSuccess?.();
            }
            else {
                throw new Error("Re-auth completion failed");
            }
        }
        catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            setError(err);
            onError?.(err);
        }
        finally {
            setIsExchanging(false);
        }
    }, [plaidItemId, completeAuth, onSuccess, onError]);
    // Handle Plaid Link exit
    const handleExit = useCallback(() => {
        onExit?.();
    }, [onExit]);
    // Configure Plaid Link
    const plaidConfig = {
        token: linkToken,
        onSuccess: handleSuccess,
        onExit: handleExit,
    };
    // Use the base Plaid Link hook
    const { open: openBase, ready } = usePlaidLinkBase(plaidConfig);
    // Wrap open to ensure correct type signature
    const open = useCallback(() => {
        openBase();
    }, [openBase]);
    return {
        open,
        ready: ready && !!linkToken && !isExchanging,
        isLoading,
        isExchanging,
        error,
        linkToken,
        refreshToken: fetchLinkToken,
    };
}
//# sourceMappingURL=index.js.map