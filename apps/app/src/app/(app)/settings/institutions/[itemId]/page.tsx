import { Suspense } from "react";
import { InstitutionDetailContent } from "./institution-detail-content";

interface InstitutionDetailPageProps {
  params: Promise<{
    itemId: string;
  }>;
}

/**
 * Institution Detail Page (Server Component)
 *
 * Wrapper that passes params to client component via Suspense.
 * Uses Next.js 15 async params pattern.
 */
export default async function InstitutionDetailPage({
  params,
}: InstitutionDetailPageProps) {
  const { itemId } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8">
          <div className="text-sm text-tertiary">Loading institution...</div>
        </div>
      }
    >
      <InstitutionDetailContent itemId={itemId} />
    </Suspense>
  );
}
