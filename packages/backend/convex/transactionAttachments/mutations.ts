/**
 * Transaction Attachment Mutations
 *
 * Upload and delete file attachments for transactions.
 * Uses Convex built-in file storage.
 *
 * SECURITY: All mutations verify ownership via authenticated user context.
 */

import { v } from "convex/values";
import { mutation } from "../functions";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Generate a signed upload URL for Convex file storage.
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  async handler(ctx) {
    ctx.viewerX(); // Ensure authenticated
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Save attachment metadata after a successful file upload.
 *
 * @param plaidTransactionId - The Plaid transaction to attach to
 * @param storageId - The Convex storage ID from the upload
 * @param fileName - Original file name
 * @param mimeType - File MIME type (validated against allowlist)
 * @param fileSize - File size in bytes (validated against max)
 */
export const createAttachment = mutation({
  args: {
    plaidTransactionId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
  },
  returns: v.null(),
  async handler(ctx, { plaidTransactionId, storageId, fileName, mimeType, fileSize }) {
    const viewer = ctx.viewerX();

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`File type "${mimeType}" is not allowed`);
    }

    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum of 5MB`);
    }

    await ctx.table("transactionAttachments").insert({
      userId: viewer._id,
      plaidTransactionId,
      storageId,
      fileName,
      mimeType,
      fileSize,
    });

    return null;
  },
});

/**
 * Delete an attachment and its stored file.
 *
 * @param attachmentId - The attachment record to delete
 */
export const deleteAttachment = mutation({
  args: {
    attachmentId: v.id("transactionAttachments"),
  },
  returns: v.null(),
  async handler(ctx, { attachmentId }) {
    const viewer = ctx.viewerX();
    const attachment = await ctx.table("transactionAttachments").getX(attachmentId);

    if (attachment.userId !== viewer._id) {
      throw new Error("Not authorized");
    }

    await ctx.storage.delete(attachment.storageId);
    await attachment.delete();

    return null;
  },
});
