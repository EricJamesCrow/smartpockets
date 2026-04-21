# W1: Agentic Chat Home Page (Research)

**Milestone:** M3 Agentic Home
**Workstream:** W1 Chat UI
**Phase:** Obra Superpowers /plan output (Phase 2), research companion
**Author:** Claude Opus 4.7 (1M context)
**Date:** 2026-04-20
**Writing convention:** No em-dashes; colons, parentheses, semicolons only.

> Research and citations collected for W1. Focused on the UI layer; defers deep Convex Agent internals to W2's research doc. Every finding is either a direct file citation from the monorepo or a template file at `/Users/itsjusteric/CrowDevelopment/Templates/...`. External npm doc pages are flagged for `/plan` time confirmation but have not been retrieved in this session.
>
> **Reconciliation addendum (2026-04-20):** The initial version of this research doc recommended `useUIMessages` + `syncStreams` as the streaming primitive based on the `ai-chatbot-untitledui` template pattern. `specs/00-contracts.md` §5.1 supersedes that recommendation. W2 locked the streaming source to a reactive query-backed model (`listMessages`, `listOpenProposals`, `proposals.get`). Sections 1.4 through 1.7 of this doc document what the template does; the W1 spec and plan now follow the contracts doc, not the template, for the streaming path. `useSmoothText` from `@convex-dev/agent/react` remains in use because it operates on a plain string input (the `text` field of each reactive `agentMessages` row) and has no coupling to `useUIMessages`. The template inventory stays valid as a component-port reference; only the data wiring changes.

---

## 1. Target template inventory

Source: `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/`

### 1.1 Monorepo parity

The template is a bun 1.1.42 + Turborepo + Next.js 16.1.1 + React 19.1.1 + Convex + Clerk + Tailwind 4 setup. Same shape as SmartPockets: `apps/app`, `apps/web`, `packages/{backend, ui, email}`. Confirmed in `package.json` lines 1 through 30. This alignment means the port adapts cleanly; no framework, runtime, or package-manager translation needed.

### 1.2 Chat component set

`apps/app/src/components/chat/` holds 22 files. Components retained in W1's lean-port list (see W1 brainstorm Section 6.1):

| File | Lines scanned | Retained for W1 |
|---|---|---|
| `ChatContainer.tsx` | 17 | Yes |
| `ChatView.tsx` | 130 | Yes (reduced) |
| `ChatHome.tsx` | 55 | Yes (chip copy replaced) |
| `MessageList.tsx` | 107 | Yes (streamlined imports) |
| `MessageBubble.tsx` | 205 | Yes (file-parts branch removed for MVP) |
| `ToolCallDisplay.tsx` | 78 | Yes (registry fallback) |
| `MessageInput.tsx` | 57 | Yes (model selector and research toggle dropped) |
| `MessageActionMinimal.tsx` | scan-only | Yes |
| `MessageActions.tsx` | scan-only | Yes |
| `MessageFailedState.tsx` | scan-only | Yes |
| `MarkdownContent.tsx` | scan-only | Yes |
| `thread-item.tsx` | scan-only | Yes (rename and delete hover added) |
| `DeleteChatModal.tsx` | scan-only | No; superseded by dropdown confirmation in ThreadItem |
| `ChatErrorBoundary.tsx` | scan-only | Yes |

Dropped from the port: `AttachmentPreview.tsx`, `MessageFileDisplay.tsx`, `ModelSelector.tsx`, `ResearchMode.tsx`, `ResearchProgress.tsx`, `SourceCard.tsx`, `VoiceRecorder.tsx`, `ChatActionMenu.tsx`. Each ties to a template feature outside the MVP scope defined in master prompt Section 3.

### 1.3 Route shells

`apps/app/src/app/(app)/chat/page.tsx`:

```tsx
"use client";
import { ChatView } from "@/components/chat/ChatView";

export default function ChatPage() {
  return <ChatView />;
}
```

`apps/app/src/app/(app)/chat/[threadId]/page.tsx`:

```tsx
import { ChatView } from "@/components/chat/ChatView";

interface ChatThreadPageProps {
  params: Promise<{ threadId: string }>;
}

export default async function ChatThreadPage({ params }: ChatThreadPageProps) {
  const { threadId } = await params;
  return <ChatView initialThreadId={threadId} />;
}
```

W1 relocates these two files: the first becomes `apps/app/src/app/(app)/page.tsx` (same body minus `"use client"` since it's already at root), and the second becomes `apps/app/src/app/(app)/[threadId]/page.tsx`. Both adaptations are near-verbatim.

### 1.4 Streaming primitive in the template

`MessageList.tsx` line 20:

```tsx
const { results, status, loadMore } = useUIMessages(
  api.ai.messages.listWithStreaming,
  threadId ? { threadId } : "skip",
  { initialNumItems: 50, stream: true }
);
```

`useUIMessages` is exported from `@convex-dev/agent/react`. The query path `api.ai.messages.listWithStreaming` is W2's to provide; in the template its body is:

```tsx
export const listWithStreaming = query({
  args: { threadId: v.string(), paginationOpts: paginationOptsValidator, streamArgs: vStreamArgs },
  handler: async (ctx, { threadId, paginationOpts, streamArgs }) => {
    await assertThreadAccess(ctx, threadId);
    const paginated = await listUIMessages(ctx, components.agent, { threadId, paginationOpts });
    const streams = await chatAgent.syncStreams(ctx, { threadId, streamArgs });
    return { ...paginated, streams };
  },
});
```

(Template source: `packages/backend/convex/ai/messages.ts` lines 22 through 44.) W2's brainstorm must reconcile this shape against W1's CA-3 assumption.

### 1.5 Smooth text

`MessageBubble.tsx` line 44:

```tsx
const [visibleText] = useSmoothText(textToSmooth, { startStreaming: isStreaming });
```

`useSmoothText` is also from `@convex-dev/agent/react`. It progressively reveals streamed text for a typewriter-like UX. Zero additional wiring needed beyond the import.

### 1.6 Optimistic first turn

`MessageList.tsx` lines 28 through 46 detail the optimistic-prompt pattern: `ChatView` sets `optimisticPrompt` before `useUIMessages` returns the real user message; when the real message arrives and matches the optimistic text, `onMessagesLoaded` fires and the optimistic state clears. Template fallback when the optimistic state is active but no real message yet:

```tsx
<MessageItem
  msg={{ id: "optimistic-ai", typing: true, user: { name: "Untitled UI", avatar: <UntitledLogoMinimal /> } }}
  showUserLabel={false}
/>
```

`MessageItem` comes from `@repo/ui/untitledui/application/messaging/messaging`. The SmartPockets monorepo already ships this primitive (W0 Section 13 confirms the file exists).

### 1.7 Sidebar thread list wiring

Template `apps/app/src/components/application/dashboard-sidebar.tsx` lines 68 through 89:

```tsx
const threads = useQuery(api.ai.threads.listForUser, {});
const historyItems: NavItemType["items"] = threads?.map((thread) => ({
  label: <ThreadItem threadId={thread.threadId} title={thread.title ?? "Untitled"} />,
  href: `/chat/${thread.threadId}`,
  truncate: false,
})) ?? [];

const navItemsSimple: NavItemType[] = [
  { label: "Chat", href: "/chat", icon: MessageSquare02 },
  { label: "History", href: "/chat/history", icon: ClockRewind,
    ...(historyItems.length > 0 && { items: historyItems }) },
  ...
];
```

SmartPockets routes chat at `/` not `/chat`, so the `href` values change; the mechanical structure ports without edits. W1 adjusts the `useQuery` import to `convex-helpers/react/cache/hooks` per AGENTS.md.

### 1.8 Delete and rename patterns in the template

Template `ThreadItem` (`apps/app/src/components/chat/thread-item.tsx`) supports hover rename via inline edit, and uses `DeleteChatModal.tsx` for delete confirmation. W1 replaces the modal with a simpler "Delete thread?" confirmation inside an UntitledUI dropdown, since the modal primitive is heavy and the dropdown primitive is already vendored. This is a minor deviation called out in brainstorm Section 6.1.

---

## 2. Current SmartPockets surface

Citations all rooted at `/Users/itsjusteric/Developer/smartpockets/`.

### 2.1 Existing `(app)` layout

`apps/app/src/app/(app)/layout.tsx` (78 lines). Client component. Bootstraps Clerk via `useConvexAuth()`, resolves the viewer via `useQuery(api.users.current)`, calls `useMutation(api.users.ensureCurrentUser)` with retry. Renders `<DashboardSidebar />` and `{children}`. W1 does not touch this file. See brainstorm Section 2.

### 2.2 Current home page

`apps/app/src/app/(app)/page.tsx` (40 lines). Client component. Composes seven subcomponents in a responsive grid:

```tsx
<AlertBanner /> <HeroMetrics />
<UpcomingPayments /> <ConnectedBanks />
<YourCards /> <SpendingBreakdown />
<RecentTransactions />
```

Body moves to `apps/app/src/app/(app)/overview/page.tsx`. Subcomponents at `apps/app/src/app/(app)/dashboard/components/*` stay in place; `overview/page.tsx` imports them by current path.

### 2.3 Current sidebar

`apps/app/src/components/application/dashboard-sidebar.tsx` (193 lines). Client component. Five nav items (Home, Credit Cards, Transactions, Wallets, Settings), localStorage-backed slim/wide toggle, CommandMenu bound to `Cmd+K` with Navigation and Settings sections. W1 edits:

| Edit | Location |
|---|---|
| Add "History" nav item with nested thread children | Insert between Home and Credit Cards |
| Add "Overview" nav item | Insert between Home and History |
| Add "Threads" command-menu section (New chat + last 10 threads) | Inside `<CommandMenu.List>` |
| Extend `commandRoutes` map | Add `overview: "/overview"` and `new-chat: "/"` |
| Import `useQuery` from `convex-helpers/react/cache/hooks` | New import |
| Import `api.agent.threads.listForUser` | New import |

### 2.4 Available UntitledUI primitives in `packages/ui`

Source: `packages/ui/src/components/untitledui/application/` (W0 Section 13). Every path W1 uses:

| Primitive | Path | W1 usage |
|---|---|---|
| `messaging` | `application/messaging/messaging.tsx` | `MessageItem` for optimistic assistant bubble |
| `command-menus` | `application/command-menus/command-menu.tsx` | Cmd+K command menu |
| `app-navigation` | `application/app-navigation/sidebar-navigation/sidebar-{simple,slim}.tsx` | Nav frame; unchanged |
| `base/tooltip` | `base/tooltip/tooltip.tsx` | Sidebar toggle tip |
| `base/dropdown` | `base/dropdown/` | ThreadItem rename / delete menu |

No new primitives need to be vendored from the full UntitledUI source at `/Users/itsjusteric/CrowDevelopment/Templates/untitledui/` for W1. W3 may pull additional primitives (tables, charts); W1 does not.

### 2.5 Cache hooks convention

From AGENTS.md Section "Common Pitfalls": "Use cached `useQuery` from `convex-helpers/react/cache/hooks`, not `convex/react`." Verified the helper is installed (`convex-helpers: ^0.1.106` in both `packages/backend/package.json` and `apps/app/package.json`).

Relevant API:

```tsx
import { useQuery } from "convex-helpers/react/cache/hooks";
```

Signature identical to the base hook but shares cache across components on the same query and args. Important because the sidebar thread list and the main chat both read from `api.agent.threads.listForUser` during navigation.

### 2.6 Clerk user identity

SmartPockets' `packages/backend/convex/functions.ts` resolves the viewer by:

```ts
const identity = await baseCtx.auth.getUserIdentity();
const viewer = identity ? await table("users").get("externalId", identity.subject) : null;
```

Clerk's `identity.subject` is the Clerk user ID. W2 stores this as the `userId` on agent threads (matching the template pattern in `packages/backend/convex/ai/auth.ts` lines 14 through 33). W1 relies on this uniformity: every chat-scoped Convex call reaches `assertThreadAccess` that checks `thread.userId === identity.subject`.

### 2.7 Convex Ents wrapper constraint

AGENTS.md enforces: "Import `query`, `mutation` from `./functions`, NOT from `./_generated/server`." The `ai-chatbot-untitledui` template imports from `./_generated/server`, which means W2's port of the agent backend cannot verbatim-lift the template's server files. W1 does not write any Convex server files; this constraint is W2's to honour. Flagged as CA-0 in the spec.

### 2.8 React Compiler

`babel-plugin-react-compiler: ^1.0.0` is installed at the root (W0 Section 19.4). Recent commit `241d343` removed manual memoization. W1 components must not re-introduce `useMemo`/`useCallback` where the compiler handles memoization. The template files contain some manual memoization (e.g. `MessageBubble` lines 34 through 40, 51 through 55, 58 through 60); W1 review trims these during port.

---

## 3. External npm package research

Versions below are the targets; confirm against npm when `/plan` task P-0 runs `bun install`.

### 3.1 `@convex-dev/agent`

- Template has `^0.3.2` (verified in `ai-chatbot-untitledui/package.json` line 41).
- Exposes: `Agent` class, `createThread`, `continueThread`, `streamText`, `generateText`, `listUIMessages`, `vStreamArgs`, `syncStreams`, `useUIMessages`, `useSmoothText`.
- W2 picks the final pinned version; W1 depends on `@convex-dev/agent/react` surface only.

### 3.2 `react-markdown` + `remark-gfm` + `rehype-raw`

- Template versions: `react-markdown ^10.1.0`, `remark-gfm ^4.0.1`, `rehype-raw ^7.0.0`.
- Used by `MarkdownContent.tsx` (template); renders assistant markdown with tables, strikethrough, raw HTML.
- `rehype-raw` risk: renders inline HTML. Template does not sanitize. W1 spec requires: no raw HTML rendering from user messages; assistant messages pass through `rehype-raw` but only because the agent system prompt forbids producing raw HTML. Mitigation flagged in spec and plan.

### 3.3 No AI SDK dependency in W1

Master prompt Section 4 mentions `useChat` from Vercel AI SDK; brainstorm D7 replaced it with `useUIMessages`; contracts §5.1 in turn superseded `useUIMessages` with reactive `useQuery` against `api.agent.threads.listMessages`. `@ai-sdk/*` remains a W2 concern. The only `@convex-dev/agent/react` export W1 consumes is `useSmoothText`, which is decoupled from `useUIMessages`.

### 3.4 Already installed in `apps/app`

Verified via `apps/app/package.json` (76 lines). Covers: `convex ^1.31.4`, `convex-helpers ^0.1.106`, `next ^16.1.1`, `react 19.1.1`, `tailwindcss ^4.1.11`, `@clerk/nextjs ^6.36.5`, `zod ^4.1.13`, `next-themes ^0.4.6`, `recharts ^3.7.0`. Missing for W1: `@convex-dev/agent`, `react-markdown`, `remark-gfm`, `rehype-raw`. Motion, Sonner, react-aria already present through `@repo/ui` transitively; flagged for explicit verification in plan task P-0.

---

## 4. Research tasks mapped to master-prompt Section 9

Master-prompt Section 9 lists 11 research items. The ones relevant to W1 (the UI layer) are mapped below; others belong to W2, W4, W6, W7.

| # | Master-prompt topic | W1 relevance | Finding or action |
|---|---|---|---|
| 1 | `@convex-dev/agent` current API | Indirect via `useUIMessages` + `useSmoothText` | See Section 1.4, 1.5. W2 confirms installed version. |
| 2 | `@convex-dev/rag` maturity | Not W1 | W2 owns. |
| 3 | Vercel AI SDK current stable | Superseded in W1 by `useUIMessages` | See brainstorm D7. W2 decides per-provider AI SDK usage. |
| 4 | Plaid product and webhook inventory | Not W1 | W4 owns. |
| 5 | Plaid liabilities fields | Not W1 | W4 owns. |
| 6 | Untitled UI AI chatbot template inventory | Fully W1 | See Section 1 above. Complete inventory done. |
| 7 | SmartPockets email foundation | Not W1 | W7 owns. |
| 8 | Clerk-Convex identity in agent tool calls | Shared with W2 | See Section 2.6. Pattern holds; `identity.subject` is the stable key. |
| 9 | Convex workflow component | Not W1 | W5, W6 own. |
| 10 | AI cost benchmarks | Not W1 | W2 owns. |
| 11 | Resend list-unsubscribe | Not W1 | W7 owns. |

---

## 5. Open research items for `/plan` or later

1. Confirm Convex Agent thread ID format never collides with the reserved-slug list (brainstorm Section 9). Cheap verification: create a dummy thread in the Convex dev deployment once W2 installs `@convex-dev/agent`, log the ID, confirm shape. Noted as plan task P-2.
2. Confirm `useUIMessages` cache behaviour across tab reloads; whether `"skip"` usage on first render triggers a flash. Cheap verification: ship a dev smoke test. Noted as plan task P-5.
3. Confirm `rehype-raw` cannot be abused by assistant output. Mitigation draft: regex-strip any `<script>`, `<iframe>`, `on*=` attributes in `MarkdownContent` before passing through `rehype-raw`. Plan task P-3 references.
4. Mobile soft keyboard behaviour on iOS Safari. Empirical test on device required; plan task P-6.
5. Reserved-slug lint rule (optional) requires scanning `app/(app)/*/page.tsx` directories at build time. Noted as plan task P-7, optional.

---

## 6. Citations

All file paths below verified during the W1 brainstorm and plan phases.

### SmartPockets

- `apps/app/package.json` (76 lines)
- `apps/app/src/app/(app)/layout.tsx` (78 lines)
- `apps/app/src/app/(app)/page.tsx` (40 lines)
- `apps/app/src/app/(app)/dashboard/components/*` (7 files)
- `apps/app/src/components/application/dashboard-sidebar.tsx` (193 lines)
- `packages/backend/convex/functions.ts` (79 lines)
- `packages/ui/src/components/untitledui/application/messaging/messaging.tsx`
- `packages/ui/src/components/untitledui/application/command-menus/command-menu.tsx`
- `AGENTS.md`
- `CLAUDE.md`
- `specs/00-master-prompt.md`
- `specs/W0-existing-state-audit.md`
- `specs/W1-chat-home.brainstorm.md`

### External template

- `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/package.json`
- `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/apps/app/src/components/chat/*.tsx`
- `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/apps/app/src/app/(app)/chat/page.tsx`
- `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/apps/app/src/app/(app)/chat/[threadId]/page.tsx`
- `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/apps/app/src/components/application/dashboard-sidebar.tsx`
- `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/packages/backend/convex/ai/chat.ts`
- `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/packages/backend/convex/ai/messages.ts`
- `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/packages/backend/convex/ai/threads.ts`
- `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/packages/backend/convex/ai/agent.ts`
- `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/packages/backend/convex/ai/auth.ts`

### Public docs (not fetched this session; verify at plan-execution time)

- `@convex-dev/agent` README on npm and the Convex components docs page.
- `@convex-dev/agent/react` hook reference.
- `react-markdown` + `rehype-raw` README.
- Next.js 16 App Router dynamic segment docs.

---

**End of W1 research.**
