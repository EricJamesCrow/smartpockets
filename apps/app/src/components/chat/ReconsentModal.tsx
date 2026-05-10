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
          <div className="flex w-full flex-col gap-5 rounded-2xl border border-secondary bg-primary p-6 shadow-xl dark:border-[var(--sp-moss-line-strong)] dark:bg-[var(--sp-moss-panel)] dark:shadow-[var(--sp-shadow-panel)]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning-primary" />
              <div className="flex-1">
                {/*
                  CROWDEV-390: lift fallback `dark:text-stone-500` →
                  `dark:text-stone-400` so the Tailwind utility passes AA on
                  the moss panel (panel-strong) backdrop even if
                  `.sp-kicker`'s `var(--sp-microcopy)` color rule loses the
                  cascade. Defense-in-depth (parity with the chat home and
                  message-input kicker copy).
                */}
                <p className="sp-kicker text-tertiary dark:text-stone-400">
                  <span className="mr-2 inline-block h-1 w-1 -translate-y-0.5 rounded-full bg-[var(--sp-moss-mint)]" />
                  Action required
                </p>
                <AriaHeading slot="title" className="mt-1 text-base font-medium leading-tight tracking-[-0.02em] text-primary">
                  <em className="font-[family-name:var(--font-fraunces)] font-medium italic text-[var(--sp-fraunces-accent)]">Bank</em>{" "}
                  reconnection required
                </AriaHeading>
                <p className="mt-2 text-sm text-tertiary">
                  Your bank asked us to reconnect this item before we can sync new data.
                  Item ID: <code className="font-[family-name:var(--font-geist-mono)] text-xs">{plaidItemId}</code>
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
