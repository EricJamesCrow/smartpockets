"use client";

import { useClerk } from "@clerk/nextjs";
import { UntitledLogo } from "@repo/ui/untitledui/foundations/logo/untitledui-logo";
import { Clock } from "@untitledui/icons";

export function PendingApproval() {
  const { signOut } = useClerk();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-primary px-4">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <UntitledLogo className="h-10 w-auto" />

        <div className="flex size-16 items-center justify-center rounded-full bg-bg-warning-secondary">
          <Clock className="size-8 text-fg-warning-secondary" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-display-sm font-semibold text-text-primary">
            Account Pending Approval
          </h1>
          <p className="text-text-tertiary">
            Your account has been created but is awaiting administrator
            approval. You&apos;ll be able to access the app once your account
            has been approved.
          </p>
        </div>

        <button
          type="button"
          onClick={() => signOut({ redirectUrl: "/" })}
          className="text-sm font-semibold text-text-brand-secondary hover:text-text-brand-secondary-hover"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
