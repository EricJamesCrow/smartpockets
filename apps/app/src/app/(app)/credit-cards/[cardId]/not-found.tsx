"use client";

import { useRouter } from "next/navigation";
import { CreditCard01, ArrowNarrowLeft } from "@untitledui/icons";
import { Button } from "@repo/ui/untitledui/base/buttons/button";

/**
 * Not found page for invalid card IDs
 *
 * Displays when:
 * - The card ID in the URL doesn't match any card
 * - The card has been deleted
 * - The user doesn't have access to the card
 */
export default function CardNotFound() {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      {/* Icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-tertiary">
        <CreditCard01 className="h-8 w-8 text-tertiary" />
      </div>

      {/* Title */}
      <h1 className="text-xl font-semibold text-primary">Card Not Found</h1>

      {/* Description */}
      <p className="mt-2 max-w-sm text-center text-sm text-tertiary">
        The credit card you&apos;re looking for doesn&apos;t exist or you don&apos;t have
        permission to view it.
      </p>

      {/* Action */}
      <Button
        color="secondary"
        size="md"
        className="mt-6 gap-2"
        onClick={() => router.push("/credit-cards")}
      >
        <ArrowNarrowLeft className="size-4" />
        Back to Cards
      </Button>
    </div>
  );
}
