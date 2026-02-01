"use client";

import { AlertTriangle, LinkBroken01 } from "@untitledui/icons";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import {
  DialogTrigger,
  ModalOverlay,
  Modal,
  Dialog,
} from "@repo/ui/untitledui/application/modals/modal";
import { FeaturedIcon } from "@repo/ui/untitledui/foundations/featured-icon/featured-icon";
import { useDisconnectPlaidItem } from "../hooks/useDisconnectPlaidItem";

interface DisconnectBankModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback to control open state */
  onOpenChange: (open: boolean) => void;
  /** The Plaid item to disconnect */
  item: {
    _id: string; // Component returns string IDs
    institutionName?: string;
    accountCount: number;
  };
}

/**
 * Disconnect Bank Confirmation Modal
 *
 * Shows warning and confirmation before disconnecting a Plaid Item.
 *
 * Features:
 * - Displays data deletion warning
 * - Shows what will be deleted (accounts, transactions, liabilities)
 * - Requires explicit confirmation
 * - Calls deletePlaidItem mutation with CASCADE delete
 * - Shows success/error toast
 */
export function DisconnectBankModal({
  open,
  onOpenChange,
  item,
}: DisconnectBankModalProps) {
  // Disconnect hook with automatic toast notifications
  const { disconnect, isLoading: isDisconnecting } = useDisconnectPlaidItem({
    onSuccess: () => {
      // Close modal on success
      onOpenChange(false);
    },
  });

  const handleDisconnect = () => {
    disconnect(item._id);
  };

  return (
    <ModalOverlay isOpen={open} onOpenChange={onOpenChange}>
      <Modal className="max-w-md">
        <Dialog className="flex-col">
          <div className="flex w-full flex-col gap-5 rounded-xl bg-primary p-6 shadow-xl ring-1 ring-primary ring-inset">
            {/* Header with warning icon */}
            <div className="flex flex-col gap-4">
              <FeaturedIcon
                theme="light"
                color="warning"
                size="lg"
                icon={AlertTriangle}
              />
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-primary">
                  Disconnect {item.institutionName || "Bank"}?
                </h2>
                <p className="text-sm text-tertiary">
                  This action will permanently remove this connection and all
                  associated data.
                </p>
              </div>
            </div>

            {/* Warning content */}
            <div className="rounded-lg border border-warning-subtle bg-warning-primary p-4">
              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold text-warning-primary">
                  The following data will be deleted:
                </p>
                <ul className="list-inside list-disc space-y-1 text-sm text-warning-secondary">
                  <li>
                    {item.accountCount} account
                    {item.accountCount !== 1 ? "s" : ""}
                  </li>
                  <li>All transactions for these accounts</li>
                  <li>All liability data (APRs, payment schedules)</li>
                  <li>All credit card sync data</li>
                </ul>
                <p className="text-sm font-semibold text-warning-primary">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Footer with actions */}
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button
                color="secondary"
                size="lg"
                onClick={() => onOpenChange(false)}
                isDisabled={isDisconnecting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                color="primary-destructive"
                size="lg"
                onClick={handleDisconnect}
                isDisabled={isDisconnecting}
                isLoading={isDisconnecting}
                iconLeading={LinkBroken01}
                className="w-full sm:w-auto"
              >
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            </div>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
