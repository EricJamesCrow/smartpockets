/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */
import type * as actions from "../actions.js";
import type * as circuitBreaker from "../circuitBreaker.js";
import type * as encryption from "../encryption.js";
import type * as errors from "../errors.js";
import type * as health from "../health.js";
import type * as private_ from "../private.js";
import type * as public_ from "../public.js";
import type * as rateLimiter from "../rateLimiter.js";
import type * as reasonCode from "../reasonCode.js";
import type * as scheduledActions from "../scheduledActions.js";
import type * as testAuth from "../testAuth.js";
import type * as utils from "../utils.js";
import type * as webhooks from "../webhooks.js";
import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
declare const fullApi: ApiFromModules<{
    actions: typeof actions;
    circuitBreaker: typeof circuitBreaker;
    encryption: typeof encryption;
    errors: typeof errors;
    health: typeof health;
    private: typeof private_;
    public: typeof public_;
    rateLimiter: typeof rateLimiter;
    reasonCode: typeof reasonCode;
    scheduledActions: typeof scheduledActions;
    testAuth: typeof testAuth;
    utils: typeof utils;
    webhooks: typeof webhooks;
}>;
/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
export declare const components: {};
export {};
//# sourceMappingURL=api.d.ts.map