// apps/app/src/lib/mcp/auth.ts

import { verifyToken } from "@clerk/backend";
import type { MCPAuthResult } from "./types";

/**
 * Verify a Clerk session token and extract user context.
 * Returns both user context and the raw token for Convex passthrough.
 *
 * @param authHeader - The Authorization header value (Bearer <token>)
 * @returns Auth result with user context and token if valid, null if invalid
 */
export async function verifyMCPToken(
  authHeader: string | null
): Promise<MCPAuthResult | null> {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const verifiedToken = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const clerkUserId = verifiedToken.sub;

    if (!clerkUserId) {
      return null;
    }

    // Return both user context and raw token for Convex queries
    return {
      userContext: {
        userId: clerkUserId,
        clerkUserId,
      },
      token,
    };
  } catch (error) {
    console.error("[MCP Auth] Token verification failed:", error);
    return null;
  }
}
