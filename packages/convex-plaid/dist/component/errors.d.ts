/**
 * Plaid Error Handling
 *
 * Structured error types with categorization for proper handling:
 * - retryable: Transient errors that should be retried with backoff
 * - auth_required: Errors requiring user re-authentication
 * - permanent: Non-recoverable errors
 */
export type PlaidErrorCategory = "retryable" | "permanent" | "auth_required";
export interface PlaidSyncError {
    category: PlaidErrorCategory;
    code: string;
    message: string;
    originalError?: unknown;
}
/**
 * Categorize an error into retryable, auth_required, or permanent.
 *
 * @param error - The caught error (any format)
 * @returns Structured PlaidSyncError with category
 */
export declare function categorizeError(error: unknown): PlaidSyncError;
/**
 * Check if an error should be retried.
 */
export declare function isRetryable(error: PlaidSyncError): boolean;
/**
 * Check if an error requires user re-authentication.
 */
export declare function requiresReauth(error: PlaidSyncError): boolean;
/**
 * Check if an error is permanent and non-recoverable.
 */
export declare function isPermanent(error: PlaidSyncError): boolean;
/**
 * Format error for logging with consistent structure.
 *
 * Accepts either a PlaidSyncError or any unknown error.
 * If passed a raw error, it will be categorized first.
 */
export declare function formatErrorForLog(error: PlaidSyncError | unknown): string;
//# sourceMappingURL=errors.d.ts.map