import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { WebhookEvent } from "@clerk/backend";
import { Webhook } from "svix";
import { z } from "zod";
import { transformWebhookData } from "./paymentAttemptTypes";
import { verifyPlaidWebhook, shouldSkipVerification } from "./lib/plaidWebhookVerification";

const http = httpRouter();

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateRequest(request);
    if (!event) {
      return new Response("Error occured", { status: 400 });
    }
    switch ((event as any).type) {
      case "user.created": // intentional fallthrough
      case "user.updated":
        await ctx.runMutation(internal.users.upsertFromClerk, {
          data: event.data as any,
        });
        break;

      case "user.deleted": {
        const clerkUserId = (event.data as any).id!;
        await ctx.runMutation(internal.users.deleteFromClerk, { clerkUserId });
        break;
      }

      case "paymentAttempt.updated": {
        const paymentAttemptData = transformWebhookData((event as any).data);
        await ctx.runMutation(internal.paymentAttempts.savePaymentAttempt, {
          paymentAttemptData,
        });
        break;
      }

      case "email.created": {
        // Handle Clerk email events via Convex Resend component
        const emailData = (event as any).data;
        await ctx.runAction(internal.email.clerk.handleClerkEmail, {
          toEmailAddress: emailData.to_email_address,
          slug: emailData.slug,
          data: emailData.data || {},
        });
        break;
      }

      default:
        console.log("Ignored webhook event", (event as any).type);
    }

    return new Response(null, { status: 200 });
  }),
});

async function validateRequest(req: Request): Promise<WebhookEvent | null> {
  const payloadString = await req.text();
  const svixHeaders = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  try {
    return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
  } catch (error) {
    console.error("Error verifying webhook event", error);
    return null;
  }
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        status: "ok",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
});

// =============================================================================
// PLAID WEBHOOK
// =============================================================================

/**
 * Plaid Webhook Handler (Convex HTTP)
 *
 * Security:
 * - Verifies JWT signature from Plaid-Verification header
 * - Verifies body SHA-256 hash matches JWT claim
 * - Verifies timestamp is within 5 minutes
 * - Uses async dispatch for long-running operations
 *
 * Webhook URL: https://your-deployment.convex.site/webhooks-plaid
 */
http.route({
  path: "/webhooks-plaid",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Get raw body BEFORE parsing (needed for signature verification)
    const rawBody = await request.text();

    try {
      // =================================================================
      // STEP 1: Verify webhook signature (CRITICAL in production)
      // =================================================================
      const skipVerification = shouldSkipVerification();

      if (!skipVerification) {
        const jwt = request.headers.get("Plaid-Verification");
        if (!jwt) {
          console.error("[Webhook] Missing Plaid-Verification header");
          return new Response(
            JSON.stringify({ error: "Missing verification header" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        }

        try {
          await verifyPlaidWebhook(jwt, rawBody);
          console.log("[Webhook] Signature verification passed");
        } catch (error) {
          console.error("[Webhook] Signature verification failed:", error);
          return new Response(
            JSON.stringify({ error: "Invalid signature" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        }
      } else {
        console.log("[Webhook] Signature verification SKIPPED (sandbox mode)");
      }

      // =================================================================
      // STEP 2: Parse webhook payload
      // =================================================================
      const body = JSON.parse(rawBody);
      const { webhook_type, webhook_code, item_id, error } = body;

      console.log(`\n=== PLAID WEBHOOK RECEIVED ===`);
      console.log("Type:", webhook_type);
      console.log("Code:", webhook_code);
      console.log("Item ID:", item_id);
      if (error) {
        console.log("Error:", JSON.stringify(error));
      }
      console.log("==============================\n");

      // =================================================================
      // STEP 3: Find Plaid item using INTERNAL query (includes accessToken)
      // =================================================================
      const plaidItem = await ctx.runQuery(internal.items.queries.getByPlaidItemId, {
        itemId: item_id,
      });

      if (!plaidItem) {
        console.warn(`[Webhook] Unknown item_id: ${item_id}`);
        return new Response(
          JSON.stringify({ ok: true, ignored: "unknown_item" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log(`[Webhook] Found plaidItem: ${plaidItem._id}`);

      // =================================================================
      // STEP 4: Handle webhook using async dispatch (scheduler)
      // This returns 200 immediately, then processes in background
      // =================================================================

      // ----- TRANSACTIONS WEBHOOKS -----
      if (webhook_type === "TRANSACTIONS") {
        if (webhook_code === "SYNC_UPDATES_AVAILABLE") {
          console.log("[Webhook] Scheduling transaction sync...");

          // Async dispatch - sync transactions (with webhook trigger for monitoring)
          await ctx.scheduler.runAfter(0, internal.plaidComponent.syncTransactionsInternal, {
            plaidItemId: plaidItem._id,
            trigger: "webhook",
          });

          // Async dispatch - refresh accounts then sync credit cards (chained sequentially)
          await ctx.scheduler.runAfter(500, internal.plaidComponent.refreshAccountsAndSyncCreditCardsInternal, {
            plaidItemId: plaidItem._id,
            userId: plaidItem.userId,
            trigger: "webhook",
          });
        } else if (webhook_code === "INITIAL_UPDATE" || webhook_code === "HISTORICAL_UPDATE") {
          // These are informational - initial sync already handles them
          console.log(`[Webhook] ${webhook_code} - informational only`);
        } else if (webhook_code === "RECURRING_TRANSACTIONS_UPDATE") {
          console.log("[Webhook] Scheduling recurring streams sync...");
          await ctx.scheduler.runAfter(0, internal.plaidComponent.fetchRecurringStreamsInternal, {
            plaidItemId: plaidItem._id,
            trigger: "webhook",
          });
        }
      }

      // ----- LIABILITIES WEBHOOKS -----
      else if (webhook_type === "LIABILITIES" && webhook_code === "DEFAULT_UPDATE") {
        console.log("[Webhook] Scheduling liabilities sync...");
        await ctx.scheduler.runAfter(0, internal.plaidComponent.fetchLiabilitiesInternal, {
          plaidItemId: plaidItem._id,
          trigger: "webhook",
        });

        // Async dispatch - refresh accounts then sync credit cards (chained sequentially)
        await ctx.scheduler.runAfter(500, internal.plaidComponent.refreshAccountsAndSyncCreditCardsInternal, {
          plaidItemId: plaidItem._id,
          userId: plaidItem.userId,
          trigger: "webhook",
        });
      }

      // ----- ITEM WEBHOOKS (P1 Security) -----
      else if (webhook_type === "ITEM") {
        if (webhook_code === "ERROR") {
          // Handle item errors (e.g., ITEM_LOGIN_REQUIRED)
          const errorCode = error?.error_code || "UNKNOWN";
          const errorMessage = error?.error_message || "Unknown error occurred";

          console.log(`[Webhook] Item error: ${errorCode} - ${errorMessage}`);

          // Special handling for login required errors
          if (errorCode === "ITEM_LOGIN_REQUIRED") {
            await ctx.runMutation(internal.plaidComponent.markNeedsReauthInternal, {
              itemId: plaidItem._id,
              reason: errorMessage,
            });
          } else {
            await ctx.runMutation(internal.plaidComponent.setItemErrorInternal, {
              itemId: plaidItem._id,
              errorCode,
              errorMessage,
            });
          }
        } else if (webhook_code === "PENDING_EXPIRATION") {
          // Credentials will expire soon - user should re-authenticate
          const expirationDate = body.consent_expiration_time || "soon";
          console.log(`[Webhook] Item pending expiration: ${expirationDate}`);

          await ctx.runMutation(internal.plaidComponent.markNeedsReauthInternal, {
            itemId: plaidItem._id,
            reason: `Credentials expiring: ${expirationDate}`,
          });
        } else if (webhook_code === "USER_PERMISSION_REVOKED") {
          // User revoked access in their bank's settings
          console.log("[Webhook] User permission revoked");

          await ctx.runMutation(internal.plaidComponent.deactivateItemInternal, {
            itemId: plaidItem._id,
            reason: "User revoked access from bank settings",
          });
        } else if (webhook_code === "PENDING_DISCONNECT") {
          // Account will be disconnected (user action or bank policy)
          console.log("[Webhook] Pending disconnect");

          await ctx.runMutation(internal.plaidComponent.deactivateItemInternal, {
            itemId: plaidItem._id,
            reason: "Account pending disconnect",
          });
        } else if (webhook_code === "WEBHOOK_UPDATE_ACKNOWLEDGED") {
          // Webhook URL was successfully updated
          console.log("[Webhook] Webhook URL update acknowledged");
        } else {
          console.log(`[Webhook] Unhandled ITEM code: ${webhook_code}`);
        }
      }

      // ----- UNKNOWN WEBHOOKS -----
      else {
        console.log(`[Webhook] Unknown type: ${webhook_type}/${webhook_code}`);
      }

      // Always return 200 to acknowledge receipt
      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("[Webhook] Processing error:", error);

      // Still return 200 to prevent Plaid from retrying
      return new Response(
        JSON.stringify({ received: true, error: "Processing failed" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// ============================================================================
// Agent HTTP Action (W2) — POST /api/agent/send
// ============================================================================

const SendBody = z.object({
  threadId: z.string().optional(),
  prompt: z.string().min(1).max(8192),
});

http.route({
  path: "/api/agent/send",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return new Response("Unauthorized", { status: 401 });

    const viewer = await ctx.runQuery(internal.users.getByExternalId, {
      externalId: identity.subject,
    });
    if (!viewer) return new Response("No viewer", { status: 401 });

    let body: z.infer<typeof SendBody>;
    try {
      body = SendBody.parse(await request.json());
    } catch (err) {
      return Response.json(
        { error: "validation_failed", reason: String(err) },
        { status: 400 },
      );
    }

    // `internal.agent.*` resolves after `npx convex dev --once` regenerates
    // `_generated/api.d.ts` with the new agent module. The cast is temporary.
    const agentApi = (internal as any).agent;
    const budget = await ctx.runQuery(agentApi.budgets.checkHeadroom, {
      userId: viewer._id,
      threadId: body.threadId,
    });
    if (!budget.ok) {
      return Response.json(
        { error: "budget_exhausted", reason: budget.reason },
        { status: 429 },
      );
    }

    const { threadId, messageId } = await ctx.runMutation(
      agentApi.threads.appendUserTurn,
      {
        userId: viewer._id,
        threadId: body.threadId,
        prompt: body.prompt,
      },
    );

    await ctx.scheduler.runAfter(0, agentApi.runtime.runAgentTurn, {
      userId: viewer._id,
      threadId,
      userMessageId: messageId,
    });

    return Response.json({ threadId, messageId });
  }),
});

export default http;
