/**
 * Plaid Rate Limiter and Retry Logic
 *
 * Handles rate limiting, exponential backoff, and retry logic for Plaid API calls.
 * Plaid has rate limits that vary by endpoint and plan.
 *
 * Rate Limits (typical):
 * - Sandbox: Generous limits for testing
 * - Development: 100 requests/minute
 * - Production: Varies by plan (typically 1000+ requests/minute)
 *
 * Error Codes to Retry:
 * - RATE_LIMIT_EXCEEDED: Too many requests
 * - INTERNAL_SERVER_ERROR: Plaid temporary error
 * - ITEM_LOGIN_REQUIRED: Needs re-auth (different handling)
 *
 * @see https://plaid.com/docs/errors/rate-limit-exceeded/
 */
/**
 * Calculate exponential backoff delay with jitter.
 *
 * Formula: min(baseDelay * 2^retryCount + jitter, maxDelay)
 *
 * @param retryCount - Number of retries so far (0-based)
 * @returns Delay in milliseconds before next retry
 *
 * @example
 * calculateBackoffDelay(0) // ~1000-2000ms
 * calculateBackoffDelay(1) // ~2000-3000ms
 * calculateBackoffDelay(2) // ~4000-5000ms
 * calculateBackoffDelay(3) // ~8000-9000ms
 * calculateBackoffDelay(4) // ~16000-17000ms
 */
export declare function calculateBackoffDelay(retryCount: number): number;
/**
 * Calculate delay for rate limit response.
 *
 * Plaid sometimes includes a Retry-After header with rate limit errors.
 * If provided, use that; otherwise use exponential backoff.
 *
 * @param retryAfterSeconds - Value from Retry-After header (if any)
 * @param retryCount - Number of retries so far
 * @returns Delay in milliseconds
 */
export declare function calculateRateLimitDelay(retryAfterSeconds: number | undefined, retryCount: number): number;
/**
 * Check if an error is a rate limit error.
 */
export declare function isRateLimitError(error: unknown): boolean;
/**
 * Check if an error is retriable.
 *
 * Some errors are temporary and should be retried:
 * - Rate limit exceeded
 * - Internal server errors
 * - Network timeouts
 *
 * Some errors should NOT be retried:
 * - Invalid credentials
 * - Invalid request
 * - Item login required (needs user action)
 */
export declare function isRetriableError(error: unknown): boolean;
/**
 * Extract Retry-After header value from error response.
 */
export declare function getRetryAfterSeconds(error: unknown): number | undefined;
/**
 * Retry configuration options.
 */
export interface RetryOptions {
    /** Maximum number of retry attempts (default: 5) */
    maxRetries?: number;
    /** Base delay in milliseconds (default: 1000) */
    baseDelayMs?: number;
    /** Maximum delay in milliseconds (default: 300000) */
    maxDelayMs?: number;
    /** Callback for logging retry attempts */
    onRetry?: (retryCount: number, error: unknown, delayMs: number) => void;
}
/**
 * Execute a function with automatic retry on retriable errors.
 *
 * Uses exponential backoff with jitter for delays between retries.
 *
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @returns Result of the function
 * @throws Last error if all retries fail
 *
 * @example
 * const result = await withRetry(
 *   () => plaidClient.transactionsSync({ access_token }),
 *   {
 *     maxRetries: 3,
 *     onRetry: (count, error, delay) => {
 *       console.log(`Retry ${count} after ${delay}ms: ${error}`);
 *     },
 *   }
 * );
 */
export declare function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
/**
 * Circuit breaker state.
 */
export type CircuitState = "closed" | "open" | "half-open";
/**
 * Circuit breaker for preventing cascading failures.
 *
 * States:
 * - CLOSED: Normal operation, requests go through
 * - OPEN: Circuit tripped, requests fail fast
 * - HALF-OPEN: Testing if service recovered
 *
 * Transitions:
 * - CLOSED -> OPEN: After failureThreshold consecutive failures
 * - OPEN -> HALF-OPEN: After resetTimeoutMs
 * - HALF-OPEN -> CLOSED: On success
 * - HALF-OPEN -> OPEN: On failure
 */
export declare class CircuitBreaker {
    private state;
    private failureCount;
    private lastFailureTime;
    private readonly failureThreshold;
    private readonly resetTimeoutMs;
    constructor(options?: {
        failureThreshold?: number;
        resetTimeoutMs?: number;
    });
    /**
     * Get current circuit state.
     */
    getState(): CircuitState;
    /**
     * Check if circuit allows request.
     */
    canExecute(): boolean;
    /**
     * Record a successful request.
     */
    recordSuccess(): void;
    /**
     * Record a failed request.
     */
    recordFailure(): void;
    /**
     * Execute a function with circuit breaker protection.
     */
    execute<T>(fn: () => Promise<T>): Promise<T>;
}
//# sourceMappingURL=rateLimiter.d.ts.map