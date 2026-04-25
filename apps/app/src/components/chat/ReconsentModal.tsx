"use client";

import { Heading as AriaHeading } from "react-aria-components";
import { AlertTriangle } from "@untitledui/icons";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import {
  Dialog,
  Modal,
  ModalOverlay,
} from "@repo/ui/untitledui/application/modals/modal";

interface ReconsentModalProps {
  plaidItemId: string;
  onDismiss: () => void;
}

export function ReconsentModal({ plaidItemId, onDismiss }: ReconsentModalProps) {
  return (
    <ModalOverlay
      isOpen
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
      isDismissable
    >
      <Modal className="max-w-md">
        <Dialog className="flex-col">
          <div className="flex w-full flex-col gap-5 rounded-xl bg-primary p-6 shadow-xl ring-1 ring-primary ring-inset">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning-primary" />
              <div className="flex-1">
                <AriaHeading slot="title" className="text-base font-semibold text-primary">
                  Bank reconnection required
                </AriaHeading>
                <p className="mt-2 text-sm text-tertiary">
                  Your bank asked us to reconnect this item before we can sync new data.
                  Item ID: <code className="text-xs">{plaidItemId}</code>
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button color="secondary" size="md" onClick={onDismiss} className="w-full sm:w-auto">
                Later
              </Button>
              <Button href="/settings/institutions" size="md" className="w-full sm:w-auto">
                Reconnect in Settings
              </Button>
            </div>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
