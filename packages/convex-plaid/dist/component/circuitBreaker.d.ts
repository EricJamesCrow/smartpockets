/**
 * Circuit Breaker for Plaid API Calls
 *
 * Implements the circuit breaker pattern to prevent cascading failures.
 * After consecutive failures, the circuit "opens" and blocks further attempts,
 * giving the upstream service time to recover.
 *
 * States:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Requests blocked, waiting for recovery timeout
 * - HALF_OPEN: Testing if service recovered, allowing limited requests
 *
 * State transitions:
 * - CLOSED → OPEN: After `failureThreshold` consecutive failures
 * - OPEN → HALF_OPEN: After `openDurationMs` timeout expires
 * - HALF_OPEN → CLOSED: After `successThreshold` consecutive successes
 * - HALF_OPEN → OPEN: On any failure
 *
 * @see https://martinfowler.com/bliki/CircuitBreaker.html
 */
import type { ActionCtx } from "./_generated/server.js";
/**
 * Circuit breaker configuration
 */
export declare const CIRCUIT_CONFIG: {
    /** Number of consecutive failures before circuit opens */
    readonly failureThreshold: 5;
    /** Number of consecutive successes in half-open state before circuit closes */
    readonly successThreshold: 2;
    /** Duration circuit stays open before transitioning to half-open (5 minutes) */
    readonly openDurationMs: 300000;
};
/**
 * Circuit breaker state
 */
export type CircuitState = "closed" | "open" | "half_open";
/**
 * Result of circuit status check
 */
export interface CircuitStatus {
    /** Current circuit state */
    state: CircuitState;
    /** Whether a request can be attempted */
    canAttempt: boolean;
    /** Unix timestamp when circuit will transition to half-open (if open) */
    nextAttemptAt?: number;
    /** Time in ms until next attempt allowed (if blocked) */
    retryAfterMs?: number;
    /** Current count of consecutive failures */
    consecutiveFailures: number;
    /** Current count of consecutive successes (relevant in half-open) */
    consecutiveSuccesses: number;
}
/**
 * Get the current circuit breaker status for a plaidItem.
 *
 * This function checks the stored circuit state and handles
 * automatic transitions from OPEN to HALF_OPEN when timeout expires.
 *
 * @param ctx - Convex action context
 * @param plaidItemId - Convex plaidItem _id as string
 * @returns Circuit status including whether requests are allowed
 */
export declare function getCircuitStatus(ctx: ActionCtx, plaidItemId: string): Promise<CircuitStatus>;
/**
 * Record a successful operation.
 *
 * In HALF_OPEN state, this counts towards closing the circuit.
 * In CLOSED state, this resets the failure counter.
 *
 * @param ctx - Convex action context
 * @param plaidItemId - Convex plaidItem _id as string
 */
export declare function recordSuccess(ctx: ActionCtx, plaidItemId: string): Promise<void>;
/**
 * Record a failed operation.
 *
 * In HALF_OPEN state, this immediately reopens the circuit.
 * In CLOSED state, this increments the failure counter and may open the circuit.
 *
 * @param ctx - Convex action context
 * @param plaidItemId - Convex plaidItem _id as string
 */
export declare function recordFailure(ctx: ActionCtx, plaidItemId: string): Promise<void>;
/**
 * Manually reset the circuit breaker to closed state.
 *
 * Useful for administrative intervention or after fixing an underlying issue.
 *
 * @param ctx - Convex action context
 * @param plaidItemId - Convex plaidItem _id as string
 */
export declare function resetCircuit(ctx: ActionCtx, plaidItemId: string): Promise<void>;
/**
 * Check if circuit should block the current request.
 *
 * Convenience wrapper around getCircuitStatus that logs when blocked.
 *
 * @param ctx - Convex action context
 * @param plaidItemId - Convex plaidItem _id as string
 * @returns true if request should be blocked
 */
export declare function shouldBlockRequest(ctx: ActionCtx, plaidItemId: string): Promise<boolean>;
//# sourceMappingURL=circuitBreaker.d.ts.map