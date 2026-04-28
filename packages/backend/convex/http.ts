import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { components, internal } from "./_generated/api";
import type { WebhookEvent } from "@clerk/backend";
import { Webhook } from "svix";
import { z } from "zod";
import { transformWebhookData } from "./paymentAttemptTypes";
import { verifyPlaidWebhook, shouldSkipVerification, computeSha256 } from "./lib/plaidWebhookVerification";
import { verifyUnsubscribeToken } from "./email/unsubscribeToken";
import { resend } from "./email/resend";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();
const PLAID_WEBHOOK_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

function webhookField(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

function shortRef(value: unknown): string {
  const text = typeof value === "string" ? value : "";
  if (text.length <= 8) return text ? "[redacted]" : "unknown";
  return `...${text.slice(-6)}`;
}

function webhookErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "error_code" in error) {
    const code = (error as { error_code?: unknown }).error_code;
    return typeof code === "string" && code ? code : "UNKNOWN";
  }
  return "UNKNOWN";
}

function webhookErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "error_message" in error) {
    const message = (error as { error_message?: unknown }).error_message;
    return typeof message === "string" && message ? message : "Unknown error occurred";
  }
  return "Unknown error occurred";
}

async function updatePlaidWebhookLog(
  ctx: any,
  args: {
    webhookLogId?: string;
    status: "processed" | "failed" | "processing";
    errorMessage?: string;
    scheduledFunctionIds?: string[];
  },
) {
  if (!args.webhookLogId) return;
  await ctx.runMutation((components.plaid.public as any).updateWebhookProcessingStatus, {
    webhookLogId: args.webhookLogId,
    status: args.status,
    processedAt: Date.now(),
    errorMessage: args.errorMessage,
    scheduledFunctionId:
      args.scheduledFunctionIds && args.scheduledFunctionIds.length > 0
        ? args.scheduledFunctionIds.join(",")
        : undefined,
  });
}

async function resolveNativeUserIdFromExternalId(
  ctx: any,
  externalId: string,
  context: string,
): Promise<Id<"users"> | null> {
  const user = await ctx.runQuery(internal.users.getByExternalId, { externalId });
  if (!user) {
    console.warn(`[Webhook] ${context} email skipped: missing native user`);
    return null;
  }
  return user._id;
}

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
    let webhookLogId: string | undefined;
    const scheduledFunctionIds: string[] = [];
    const processingNotes: string[] = [];

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
      const webhookType = webhookField(webhook_type, "UNKNOWN");
      const webhookCode = webhookField(webhook_code, "UNKNOWN");
      const itemId = webhookField(item_id, "UNKNOWN");
      const bodyHash = await computeSha256(rawBody);

      const webhookLog = await ctx.runMutation(
        (components.plaid.public as any).recordWebhookReceived,
        {
          itemId,
          webhookType,
          webhookCode,
          bodyHash,
          receivedAt: Date.now(),
          dedupeWindowMs: PLAID_WEBHOOK_DEDUPE_WINDOW_MS,
        },
      );
      webhookLogId = webhookLog.webhookLogId;

      if (webhookLog.duplicate) {
        console.log(
          `[Webhook] Duplicate Plaid delivery ignored (${webhookType}/${webhookCode}, item ${shortRef(itemId)})`,
        );
        return new Response(
          JSON.stringify({ received: true, duplicate: true }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      await updatePlaidWebhookLog(ctx, {
        webhookLogId,
        status: "processing",
      });

      console.log(`\n=== PLAID WEBHOOK RECEIVED ===`);
      console.log("Type:", webhookType);
      console.log("Code:", webhookCode);
      console.log("Item:", shortRef(itemId));
      if (error) {
        console.log("Error code:", webhookErrorCode(error));
      }
      console.log("==============================\n");

      // =================================================================
      // STEP 3: Find Plaid item using INTERNAL query (includes accessToken)
      // =================================================================
      const plaidItem = await ctx.runQuery(internal.items.queries.getByPlaidItemId, {
        itemId,
      });

      if (!plaidItem) {
        console.warn(`[Webhook] Unknown Plaid item ${shortRef(itemId)}`);
        await updatePlaidWebhookLog(ctx, {
          webhookLogId,
          status: "processed",
          errorMessage: "unknown_item",
        });
        return new Response(
          JSON.stringify({ ok: true, ignored: "unknown_item" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log(`[Webhook] Found plaidItem ${shortRef(plaidItem._id)}`);

      // =================================================================
      // STEP 4: Handle webhook using async dispatch (scheduler)
      // This returns 200 immediately, then processes in background
      // =================================================================

      // ----- TRANSACTIONS WEBHOOKS -----
      if (webhookType === "TRANSACTIONS") {
        if (webhookCode === "SYNC_UPDATES_AVAILABLE") {
          console.log("[Webhook] Scheduling transaction sync...");

          // Async dispatch - sync transactions (with webhook trigger for monitoring)
          const syncId = await ctx.scheduler.runAfter(0, internal.plaidComponent.syncTransactionsInternal, {
            plaidItemId: plaidItem._id,
            trigger: "webhook",
          });
          scheduledFunctionIds.push(String(syncId));

          // Async dispatch - refresh accounts then sync credit cards (chained sequentially)
          const refreshId = await ctx.scheduler.runAfter(500, internal.plaidComponent.refreshAccountsAndSyncCreditCardsInternal, {
            plaidItemId: plaidItem._id,
            userId: plaidItem.userId,
            trigger: "webhook",
          });
          scheduledFunctionIds.push(String(refreshId));
        } else if (webhookCode === "INITIAL_UPDATE" || webhookCode === "HISTORICAL_UPDATE") {
          // These are informational - initial sync already handles them
          console.log(`[Webhook] ${webhookCode} - informational only`);
        } else if (webhookCode === "RECURRING_TRANSACTIONS_UPDATE") {
          console.log("[Webhook] Scheduling recurring streams sync...");
          const recurringId = await ctx.scheduler.runAfter(0, internal.plaidComponent.fetchRecurringStreamsInternal, {
            plaidItemId: plaidItem._id,
            trigger: "webhook",
          });
          scheduledFunctionIds.push(String(recurringId));
        } else if (webhookCode === "DEFAULT_UPDATE") {
          // W4: legacy TRANSACTIONS webhook (older items not migrated to sync-based).
          // Mirror SYNC_UPDATES_AVAILABLE: schedule sync + 500ms offset refresh.
          console.log("[Webhook] TRANSACTIONS DEFAULT_UPDATE: scheduling sync (legacy path)...");
          const syncId = await ctx.scheduler.runAfter(0, internal.plaidComponent.syncTransactionsInternal, {
            plaidItemId: plaidItem._id,
            trigger: "webhook",
          });
          scheduledFunctionIds.push(String(syncId));
          const refreshId = await ctx.scheduler.runAfter(500, internal.plaidComponent.refreshAccountsAndSyncCreditCardsInternal, {
            plaidItemId: plaidItem._id,
            userId: plaidItem.userId,
            trigger: "webhook",
          });
          scheduledFunctionIds.push(String(refreshId));
        }
      }

      // ----- LIABILITIES WEBHOOKS -----
      else if (webhookType === "LIABILITIES" && webhookCode === "DEFAULT_UPDATE") {
        console.log("[Webhook] Scheduling liabilities sync...");
        const liabilitiesId = await ctx.scheduler.runAfter(0, internal.plaidComponent.fetchLiabilitiesInternal, {
          plaidItemId: plaidItem._id,
          trigger: "webhook",
        });
        scheduledFunctionIds.push(String(liabilitiesId));

        // Async dispatch - refresh accounts then sync credit cards (chained sequentially)
        const refreshId = await ctx.scheduler.runAfter(500, internal.plaidComponent.refreshAccountsAndSyncCreditCardsInternal, {
          plaidItemId: plaidItem._id,
          userId: plaidItem.userId,
          trigger: "webhook",
        });
        scheduledFunctionIds.push(String(refreshId));
      }

      // ----- ITEM WEBHOOKS (P1 Security) -----
      else if (webhookType === "ITEM") {
        if (webhookCode === "ERROR") {
          // Handle item errors (e.g., ITEM_LOGIN_REQUIRED)
          const errorCode = error?.error_code || "UNKNOWN";
          const errorMessage = error?.error_message || "Unknown error occurred";

          console.log(`[Webhook] Item error: ${errorCode} - ${errorMessage}`);

          // W4: stamp firstErrorAt on first transition into error-class status.
          await ctx.runMutation(components.plaid.public.markFirstErrorAtInternal, {
            plaidItemId: plaidItem._id,
          });

          // Special handling for login required errors
          if (errorCode === "ITEM_LOGIN_REQUIRED") {
            await ctx.runMutation(internal.plaidComponent.markNeedsReauthInternal, {
              itemId: plaidItem._id,
              reason: errorMessage,
            });
            // W4: dispatch reconsent-required email per contracts §15.
            const nativeUserId = await resolveNativeUserIdFromExternalId(
              ctx,
              plaidItem.userId,
              "reconsent",
            );
            if (nativeUserId) {
              const emailId = await ctx.scheduler.runAfter(
                0,
                internal.email.dispatch.dispatchReconsentRequired,
                {
                  userId: nativeUserId,
                  plaidItemId: plaidItem._id,
                  institutionName: plaidItem.institutionName ?? "your bank",
                  reason: "ITEM_LOGIN_REQUIRED",
                },
              );
              scheduledFunctionIds.push(String(emailId));
            } else {
              processingNotes.push("missing_native_user:reconsent");
            }
          } else {
            await ctx.runMutation(internal.plaidComponent.setItemErrorInternal, {
              itemId: plaidItem._id,
              errorCode,
              errorMessage,
            });
          }
        } else if (webhookCode === "PENDING_EXPIRATION") {
          // Credentials will expire soon - user should re-authenticate
          const expirationDate = body.consent_expiration_time || "soon";
          console.log(`[Webhook] Item pending expiration: ${expirationDate}`);

          // W4: stamp firstErrorAt on first transition into needs_reauth.
          await ctx.runMutation(components.plaid.public.markFirstErrorAtInternal, {
            plaidItemId: plaidItem._id,
          });

          await ctx.runMutation(internal.plaidComponent.markNeedsReauthInternal, {
            itemId: plaidItem._id,
            reason: `Credentials expiring: ${expirationDate}`,
          });

          // W4: dispatch reconsent-required email per contracts §15.
          const nativeUserId = await resolveNativeUserIdFromExternalId(
            ctx,
            plaidItem.userId,
            "reconsent",
          );
          if (nativeUserId) {
            const emailId = await ctx.scheduler.runAfter(
              0,
              internal.email.dispatch.dispatchReconsentRequired,
              {
                userId: nativeUserId,
                plaidItemId: plaidItem._id,
                institutionName: plaidItem.institutionName ?? "your bank",
                reason: "PENDING_EXPIRATION",
              },
            );
            scheduledFunctionIds.push(String(emailId));
          } else {
            processingNotes.push("missing_native_user:reconsent");
          }
        } else if (webhookCode === "USER_PERMISSION_REVOKED") {
          // User revoked access in their bank's settings
          console.log("[Webhook] User permission revoked");

          await ctx.runMutation(internal.plaidComponent.deactivateItemInternal, {
            itemId: plaidItem._id,
            reason: "User revoked access from bank settings",
          });
        } else if (webhookCode === "PENDING_DISCONNECT") {
          // Account will be disconnected (user action or bank policy)
          console.log("[Webhook] Pending disconnect");

          await ctx.runMutation(internal.plaidComponent.deactivateItemInternal, {
            itemId: plaidItem._id,
            reason: "Account pending disconnect",
          });
        } else if (webhookCode === "WEBHOOK_UPDATE_ACKNOWLEDGED") {
          // Webhook URL was successfully updated
          console.log("[Webhook] Webhook URL update acknowledged");
        } else if (webhookCode === "LOGIN_REPAIRED") {
          // W4: log-only (see spec §3.4). The dominant repair path is
          // update-mode Link via completeReauthAction which already resets
          // status. Log preserves empirical data in webhookLogs for future
          // decisions about whether to act on this code.
          console.log("[Webhook] ITEM LOGIN_REPAIRED: log-only");
        } else if (webhookCode === "NEW_ACCOUNTS_AVAILABLE") {
          // W4: stamp newAccountsAvailableAt so the UI surfaces the
          // "Update accounts" CTA via the account_select update-mode flow.
          console.log("[Webhook] ITEM NEW_ACCOUNTS_AVAILABLE: stamping flag");
          await ctx.runMutation(
            components.plaid.public.setNewAccountsAvailableInternal,
            { plaidItemId: plaidItem._id },
          );
        } else {
          console.log(`[Webhook] Unhandled ITEM code: ${webhookCode}`);
        }
      }

      // ----- HOLDINGS WEBHOOKS (W4 stub; investments deferred per spec §3.1) -----
      else if (webhookType === "HOLDINGS") {
        console.log(
          `[Webhook] HOLDINGS ${webhookCode}: log-only (investments deferred)`,
        );
      }

      // ----- INVESTMENTS_TRANSACTIONS WEBHOOKS (W4 stub) -----
      else if (webhookType === "INVESTMENTS_TRANSACTIONS") {
        console.log(
          `[Webhook] INVESTMENTS_TRANSACTIONS ${webhookCode}: log-only (investments deferred)`,
        );
      }

      // ----- AUTH WEBHOOKS (W4 stub; AUTH product not in MVP) -----
      else if (webhookType === "AUTH") {
        console.log(
          `[Webhook] AUTH ${webhookCode}: log-only (AUTH product not in MVP)`,
        );
      }

      // ----- IDENTITY WEBHOOKS (W4 stub; identity merge deferred to post-MVP) -----
      else if (webhookType === "IDENTITY") {
        console.log(
          `[Webhook] IDENTITY ${webhookCode}: log-only (identity merge deferred)`,
        );
      }

      // ----- UNKNOWN WEBHOOKS -----
      else {
        console.log(`[Webhook] Unknown type: ${webhookType}/${webhookCode}`);
      }

      // Always return 200 to acknowledge receipt
      await updatePlaidWebhookLog(ctx, {
        webhookLogId,
        status: "processed",
        errorMessage: processingNotes.length > 0 ? processingNotes.join(",") : undefined,
        scheduledFunctionIds,
      });
      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("[Webhook] Processing error:", error instanceof Error ? error.name : "unknown");
      await updatePlaidWebhookLog(ctx, {
        webhookLogId,
        status: "failed",
        errorMessage: "processing_failed",
        scheduledFunctionIds,
      });

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

    const verified = await verifyUnsubscribeToken(token, signingKey);
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

// ============================================================================
// Agent HTTP Action (W2) — POST /api/agent/send
// ============================================================================

const SendBody = z.object({
  threadId: z.string().optional(),
  prompt: z.string().min(1).max(8192),
  toolHint: z
    .object({
      tool: z.string(),
      args: z.record(z.string(), z.unknown()),
    })
    .optional(),
});

function parseAgentAllowedOrigins(): Set<string> {
  const raw = process.env.AGENT_ALLOWED_ORIGINS ?? process.env.APP_ORIGIN ?? "";
  return new Set(
    raw
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

const agentAllowedOrigins = parseAgentAllowedOrigins();

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
  if (agentAllowedOrigins.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function isTrustedAgentOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  return agentAllowedOrigins.has(origin);
}

http.route({
  path: "/api/agent/send",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    if (!isTrustedAgentOrigin(request)) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders(request) });
    }
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }),
});

http.route({
  path: "/api/agent/send",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const cors = corsHeaders(request);
    if (!isTrustedAgentOrigin(request)) {
      return new Response("Forbidden", { status: 403, headers: cors });
    }
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return new Response("Unauthorized", { status: 401, headers: cors });

    const viewer = await ctx.runQuery(internal.users.getByExternalId, {
      externalId: identity.subject,
    });
    if (!viewer) return new Response("No viewer", { status: 401, headers: cors });

    let body: z.infer<typeof SendBody>;
    try {
      body = SendBody.parse(await request.json());
    } catch (err) {
      return Response.json(
        { error: "validation_failed", reason: String(err) },
        { status: 400, headers: cors },
      );
    }

    const agentApi = (internal as any).agent;
    const budget = await ctx.runQuery(agentApi.budgets.checkHeadroom, {
      userId: viewer._id,
      threadId: body.threadId,
    });
    if (!budget.ok) {
      return Response.json(
        { error: "budget_exhausted", reason: budget.reason },
        { status: 429, headers: cors },
      );
    }

    const { threadId, messageId } = await ctx.runMutation(
      agentApi.threads.appendUserTurn,
      {
        userId: viewer._id,
        threadId: body.threadId,
        prompt: body.prompt,
        toolHint: body.toolHint
          ? JSON.stringify(body.toolHint)
          : undefined,
      },
    );

    await ctx.scheduler.runAfter(0, agentApi.runtime.runAgentTurn, {
      userId: viewer._id,
      threadId,
      userMessageId: messageId,
    });

    return Response.json({ threadId, messageId }, { headers: cors });
  }),
});

export default http;
