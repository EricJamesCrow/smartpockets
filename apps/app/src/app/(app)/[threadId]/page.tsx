import { notFound } from "next/navigation";
import type { Id } from "@convex/_generated/dataModel";
import { ChatView } from "@/components/chat/ChatView";

// Slugs that correspond to real top-level routes in (app)/. Any navigation to
// /{slug} for one of these must route to the actual page, not be caught by
// this [threadId] catch-all. Keep in sync with directories under (app)/ via
// the verify-reserved-slugs lint script (T-6.2).
const RESERVED_SLUGS = new Set([
  "credit-cards",
  "transactions",
  "wallets",
  "settings",
  "sign-in",
  "sign-up",
  "dev",
]);

// Convex Ents IDs for agentThreads are base32-style, 32+ chars.
const THREAD_ID_PATTERN = /^[a-z0-9]{32,}$/i;

function isThreadIdShaped(slug: string): boolean {
  return THREAD_ID_PATTERN.test(slug);
}

interface ChatThreadPageProps {
  params: Promise<{ threadId: string }>;
}

export default async function ChatThreadPage({ params }: ChatThreadPageProps) {
  const { threadId } = await params;

  if (RESERVED_SLUGS.has(threadId) || !isThreadIdShaped(threadId)) {
    notFound();
  }

  return <ChatView initialThreadId={threadId as Id<"agentThreads">} />;
}
