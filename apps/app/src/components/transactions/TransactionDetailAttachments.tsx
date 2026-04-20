"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { FileUpload } from "@repo/ui/untitledui/application/file-upload/file-upload-base";
import { ButtonUtility } from "@repo/ui/untitledui/base/buttons/button-utility";
import { Attachment01, Trash01 } from "@untitledui/icons";
import { toast } from "sonner";

interface TransactionDetailAttachmentsProps {
  plaidTransactionId: string;
}

const ACCEPT =
  "image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,application/pdf";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Attachment section: upload, list, preview, and delete transaction attachments.
 * Uses Convex file storage with UntitledUI FileUpload component.
 */
export function TransactionDetailAttachments({
  plaidTransactionId,
}: TransactionDetailAttachmentsProps) {
  const [uploading, setUploading] = useState(false);

  const attachments = useQuery(
    api.transactionAttachments.queries.getByTransactionId,
    { plaidTransactionId },
  );
  const generateUploadUrl = useMutation(
    api.transactionAttachments.mutations.generateUploadUrl,
  );
  const createAttachment = useMutation(
    api.transactionAttachments.mutations.createAttachment,
  );
  const deleteAttachmentMutation = useMutation(
    api.transactionAttachments.mutations.deleteAttachment,
  );

  const handleDropFiles = async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();

      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await result.json();

      await createAttachment({
        plaidTransactionId,
        storageId,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });

      toast.success("Attachment uploaded");
    } catch {
      toast.error("Failed to upload attachment");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (
    attachmentId: Id<"transactionAttachments">,
    fileName: string,
  ) => {
    try {
      await deleteAttachmentMutation({ attachmentId });
      toast.success(`Removed ${fileName}`);
    } catch {
      toast.error("Failed to delete attachment");
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Attachment01 className="size-4 text-tertiary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-tertiary">
          Attachments
        </span>
      </div>

      {/* Existing attachments */}
      {attachments && attachments.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {attachments.map((att) => (
            <div
              key={att._id}
              className="flex items-center gap-3 rounded-lg border border-secondary p-2"
            >
              {att.mimeType.startsWith("image/") && att.url ? (
                <a href={att.url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={att.url}
                    alt={att.fileName}
                    className="size-10 rounded object-cover"
                  />
                </a>
              ) : (
                <div className="flex size-10 items-center justify-center rounded bg-secondary text-xs font-medium text-tertiary">
                  PDF
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-primary">
                  {att.url ? (
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {att.fileName}
                    </a>
                  ) : (
                    att.fileName
                  )}
                </p>
                <p className="text-xs text-tertiary">
                  {formatFileSize(att.fileSize)}
                </p>
              </div>
              <ButtonUtility
                icon={Trash01}
                size="xs"
                color="tertiary"
                tooltip="Remove attachment"
                onClick={() => handleDelete(att._id, att.fileName)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Upload drop zone */}
      <FileUpload.DropZone
        isDisabled={uploading}
        hint={uploading ? "Uploading..." : "PNG, JPG or PDF (max. 5MB)"}
        accept={ACCEPT}
        maxSize={MAX_SIZE}
        onDropFiles={handleDropFiles}
        onSizeLimitExceed={() => toast.error("File exceeds 5MB limit")}
        onDropUnacceptedFiles={() =>
          toast.error("Only images and PDFs are allowed")
        }
      />
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
