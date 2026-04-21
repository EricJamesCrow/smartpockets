import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { WebhookEvent } from "@clerk/backend";
import { Webhook } from "svix";
import { transformWebhookData } from "./paymentAttemptTypes";
import { verifyPlaidWebhook, shouldSkipVerification } from "./lib/plaidWebhookVerification";
import { verifyUnsubscribeToken } from "./email/unsubscribeToken";
import { resend } from "./email/resend";
import type { Id } from "./_generated/dataModel";

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

// =============================================================================
// EMAIL UNSUBSCRIBE (RFC 8058 one-click)
// =============================================================================

http.route({
  path: "/email/unsubscribe",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return new Response("missing token", { status: 400 });

    const signingKey = process.env.EMAIL_UNSUBSCRIBE_SIGNING_KEY;
    if (!signingKey) {
      console.error("[Unsubscribe] EMAIL_UNSUBSCRIBE_SIGNING_KEY is not set");
      return new Response("server misconfigured", { status: 500 });
    }

    const verified = verifyUnsubscribeToken(token, signingKey);
    if (!verified.ok) {
      return new Response(`invalid signature: ${verified.reason}`, { status: 400 });
    }

    await ctx.runMutation(internal.email.mutations.flipPreferenceFromToken, {
      userId: verified.data.userId as Id<"users">,
      templateKey: verified.data.templateKey,
    });

    // Flip still performed for expired tokens; surface a 410 so the
    // client knows the token is stale without rejecting the action.
    return new Response(null, { status: verified.data.expired ? 410 : 200 });
  }),
});

http.route({
  path: "/email/unsubscribe",
  method: "GET",
  handler: httpAction(async (_ctx, req) => {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") ?? "";
    const safeToken = encodeURIComponent(token);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Unsubscribe</title></head><body style="font-family:system-ui,-apple-system,sans-serif;padding:24px;max-width:560px;margin:0 auto"><h1 style="font-size:20px">Unsubscribe</h1><p>Click the button below to stop receiving this type of email from SmartPockets.</p><form method="POST" action="/email/unsubscribe?token=${safeToken}"><button type="submit" style="padding:12px 20px;background:#16a34a;color:white;border:0;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600">Confirm unsubscribe</button></form></body></html>`;
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }),
});

// =============================================================================
// RESEND WEBHOOK
// =============================================================================

http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});

export default http;
