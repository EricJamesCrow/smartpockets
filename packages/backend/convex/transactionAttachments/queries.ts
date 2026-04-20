/**
 * Transaction Attachment Queries
 *
 * Read operations for transaction file attachments.
 *
 * SECURITY: All queries verify ownership via authenticated user context.
 */

import { v } from "convex/values";
import { query } from "../functions";

/**
 * Get all attachments for a transaction, with serving URLs.
 *
 * @param plaidTransactionId - The Plaid transaction ID
 * @returns Array of attachments with file URLs
 */
export const getByTransactionId = query({
  args: {
    plaidTransactionId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("transactionAttachments"),
      fileName: v.string(),
      mimeType: v.string(),
      fileSize: v.number(),
      url: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx, { plaidTransactionId }) => {
    const viewer = ctx.viewerX();

    const attachments = await ctx
      .table("transactionAttachments", "by_user_and_transaction", (q) =>
        q.eq("userId", viewer._id).eq("plaidTransactionId", plaidTransactionId)
      );

    return Promise.all(
      attachments.map(async (att) => ({
        _id: att._id,
        fileName: att.fileName,
        mimeType: att.mimeType,
        fileSize: att.fileSize,
        url: await ctx.storage.getUrl(att.storageId),
      }))
    );
  },
});
