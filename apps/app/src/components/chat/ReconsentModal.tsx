"use client";

import Link from "next/link";
import { AlertTriangle } from "@untitledui/icons";

interface ReconsentModalProps {
  plaidItemId: string;
  onDismiss: () => void;
}

export function ReconsentModal({ plaidItemId, onDismiss }: ReconsentModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reconsent-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/70 p-4"
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-md rounded-xl bg-primary p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-5 text-warning-primary" />
          <div className="flex-1">
            <h2 id="reconsent-title" className="text-base font-semibold text-primary">
              Bank reconnection required
            </h2>
            <p className="mt-2 text-sm text-tertiary">
              Your bank asked us to reconnect this item before we can sync new data.
              Item ID: <code className="text-xs">{plaidItemId}</code>
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href="/settings/institutions"
                className="rounded-md bg-brand-solid px-3 py-1.5 text-sm text-white"
              >
                Reconnect in Settings
              </Link>
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-md border border-secondary px-3 py-1.5 text-sm text-secondary"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
