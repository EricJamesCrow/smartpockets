# W1: Agentic Chat Home Page (Implementation Plan)

## Plan Handoff Header

| Field | Value |
|---|---|
| Linear milestone | M3 Agentic Home |
| Linear sub-project | W1 Chat UI |
| Linear issues | Create at execution time; one issue per task (T-0 through T-6.4). Placeholders noted inline as `LIN-TBD`. |
| Recommended primary agent | Claude Code for scaffolding and auth-sensitive integration; Codex for mechanical ports and bounded edits. See per-task tags. |
| Required MCP servers | Convex MCP (live schema and function probes), Graphite MCP (stack management). Clerk MCP optional for thread-ownership smoke tests. |
| Required read access | `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/` (Claude Code via `--add-dir`; Codex copies needed files first). `/Users/itsjusteric/CrowDevelopment/Templates/untitledui/` (reference only; not required unless a primitive is missing). |
| Prerequisite plans (must be merged) | None for T-1 and T-2 and T-3 (W1-independent). W2 must be landed for T-4 wiring against CA-4, and for T-5 wiring against CA-1 through CA-3, CA-5 through CA-12. W3 must be landed for any non-stub `propose_*` rendering in T-5. |
| Branch | `feat/agentic-home/W1-chat-home` (per master-prompt Section 11 worktree setup) |
| Graphite stack parent | `main` |
| Worktree directory | `~/Developer/smartpockets-W1-chat` |
| Estimated PRs in stack | 6. Target 200 to 400 lines changed per PR. |
| Review bot | CodeRabbit (mandatory pass per master-prompt Section 11 cross-review rule) |
| Rollback plan | See `specs/W1-chat-home.md` Section 16. Each PR is independently revertable via `gt delete` and a stack rebuild. The dashboard survives full rollback because `/overview/page.tsx` is net-new and persists across revert. |
| Acceptance checklist | `specs/W1-chat-home.md` Section 15, items A1 through A18 |

## Context bootstrap (for fresh agent sessions)

Before starting any task, the agent must:

1. Read `AGENTS.md` and `CLAUDE.md` in the repo root.
2. Read `specs/W0-existing-state-audit.md` for current codebase state.
3. Read `specs/W1-chat-home.md` for the authoritative spec.
4. Read this file (`specs/W1-chat-home.plan.md`) top to bottom.
5. Read `specs/W1-chat-home.research.md` for research findings and file citations.
6. Read `specs/W1-chat-home.brainstorm.md` for the decision rationale behind the spec.
7. Run `git fetch origin` and confirm the worktree is on branch `feat/agentic-home/W1-chat-home` (or a child branch in the stack).
8. Run `gt status` and confirm the Graphite stack state matches the expected parent.
9. Verify Convex MCP responds: `mcp__convex__status` or equivalent should return a ready state.
10. If any prerequisite contract (CA-N, CB-N) is not yet merged into `main`, pause and coordinate with W2 or W3 before proceeding. The per-task Rationale flags which contracts each task requires.

---

## Task graph

```
T-0 Bootstrap (Claude Code)
  v
T-1 Relocate dashboard to /overview  (Codex)              ----- PR 1
  v
T-2 Route shells + reserved-slug guard  (Codex)           ----- PR 2
  v
T-3 Port chat components with mock data  (Claude Code)    ----- PR 3
  v
T-4 Sidebar History + command-menu Threads section  (Codex) ----- PR 4  (depends on CA-4)
  v
T-5 Live agent integration + error UX  (Claude Code)      ----- PR 5  (depends on CA-1/2/3/5/6/9/10/12)
  v
T-6 Polish and acceptance  (Codex + Claude Code for a11y) ----- PR 6
```

Each PR in the Graphite stack lands independently to keep CodeRabbit diffs small. T-1 and T-2 and T-3 can merge before W2 exists. T-4 is a single-file edit that can land in parallel with W2 if the query shape is stubbed. T-5 is the only hard gate on W2 for functional correctness. T-6 is always last.

---

## Task T-0: Bootstrap and contract verification

**Recommended agent:** Claude Code
**Rationale:** Cross-cutting; verifies W2 and W3 contract shapes against live Convex and against the templates. Not mechanical.
**Linear issue:** LIN-TBD (W1 T-0 Bootstrap)

### Scope

- Read access required: repo root, `~/CrowDevelopment/Templates/ai-chatbot-untitledui/`.
- No files written in this task.
- Output: a comment on the W1 Linear issue summarising CA and CB status.

### Step 1: Confirm worktree and branch

- [ ] **1.1 Create the worktree per master-prompt Section 11:**

```bash
cd ~/Developer/smartpockets
git fetch origin
git worktree add ~/Developer/smartpockets-W1-chat -b feat/agentic-home/W1-chat-home origin/main
cd ~/Developer/smartpockets-W1-chat
bun install
```

Expected: worktree created; `bun install` completes; `git status` clean on the new branch.

- [ ] **1.2 Initialise Graphite:**

```bash
gt status
```

Expected: Graphite recognises the branch. If not initialised, run `gt init` following repo defaults.

### Step 2: Confirm W2 contract availability

- [ ] **2.1 Check whether W2 has landed the agent backend:**

```bash
git log --oneline origin/main | grep -E "(W2|agent-backend|convex-dev/agent)" | head -5
```

- [ ] **2.2 If W2 is landed**, confirm via Convex MCP and a manual `curl` that the following contracts resolve (names from `specs/00-contracts.md` §5 and W2 §7):

HTTP endpoint:

```
POST /api/agent/send          (accepts { prompt, threadId? }; returns { threadId, messageId } or 401/429/500)
```

Reactive queries:

```
api.agent.threads.listMessages           (CA-3)
api.agent.threads.listForUser            (CA-4)
api.agent.proposals.listOpenProposals    (CA-3a)
api.agent.proposals.get                  (CA-3b)
```

Mutations:

```
api.agent.threads.renameThread           (CA-5)
api.agent.threads.deleteThread           (CA-6)
api.agent.proposals.confirm              (CA-9)
api.agent.proposals.cancel               (CA-10)
api.agent.proposals.undo                 (CA-15)
```

- [ ] **2.3 Record findings** in a comment on LIN-TBD. If any path is missing, note which tasks (T-4 or T-5) must block. If the HTTP endpoint is missing, T-3 Step 5.6 `sendMessage` must be stubbed; record the fallback.

### Step 3: Confirm `Id<"agentThreads">` shape (CA-13)

- [ ] **3.1 If W2 is landed**, create a test thread by `POST`-ing to `/api/agent/send`:

```bash
curl -i -X POST "$CONVEX_SITE_URL/api/agent/send" \
  -H "Authorization: Bearer $CLERK_DEV_JWT" \
  -H "Content-Type: application/json" \
  --data '{"prompt":"hello"}'
```

Expect a 200 response body `{ "threadId": "...", "messageId": "..." }`. Record the literal `threadId` string.

- [ ] **3.2 If W2 is not yet landed**, inspect a Convex Ents ID format from any existing table in the SmartPockets dev deployment (e.g., `creditCards`) via Convex MCP. Ents IDs share the same base-32-with-prefix format regardless of table.

- [ ] **3.3 Record the regex** for `isThreadIdShaped` that excludes collision with `RESERVED_SLUGS`. Expected: Convex Ents IDs are 32-plus characters of `[a-z0-9]` (case-insensitive); the regex will be `/^[a-z0-9]{32,}$/i`. Confirm before T-2 writes the guard.

### Step 4: No commit

T-0 does not commit code. It produces a findings comment only. Proceed to T-1.

### Acceptance checklist

- [ ] Worktree on branch `feat/agentic-home/W1-chat-home`, bun install clean.
- [ ] Graphite recognises the branch.
- [ ] CA-1 through CA-14 status recorded on LIN-TBD (landed, pending, or missing).
- [ ] `isThreadIdShaped` regex recorded.
- [ ] No source code written.

---

## Task T-1: Relocate the dashboard to `/overview`

**Recommended agent:** Codex
**Rationale:** Mechanical file creation + import graph update. Well-specified. No auth ambiguity.
**Linear issue:** LIN-TBD (W1 T-1 Relocate dashboard)

### Scope

Files to create:
- `apps/app/src/app/(app)/overview/page.tsx`

Files to modify:
- `apps/app/src/components/application/dashboard-sidebar.tsx`

Files NOT touched:
- `apps/app/src/app/(app)/dashboard/components/*` (7 files stay in place)
- `apps/app/src/app/(app)/page.tsx` (T-2 overwrites; this task leaves the dashboard at `/` temporarily)

Acceptance: `/overview` renders the same dashboard that currently renders at `/`. Sidebar has a new "Overview" entry.

### Step 1: Create the relocated page

- [ ] **1.1 Create** `apps/app/src/app/(app)/overview/page.tsx`:

```tsx
"use client";

import { AlertBanner } from "../dashboard/components/AlertBanner";
import { HeroMetrics } from "../dashboard/components/HeroMetrics";
import { UpcomingPayments } from "../dashboard/components/UpcomingPayments";
import { YourCards } from "../dashboard/components/YourCards";
import { ConnectedBanks } from "../dashboard/components/ConnectedBanks";
import { SpendingBreakdown } from "../dashboard/components/SpendingBreakdown";
import { RecentTransactions } from "../dashboard/components/RecentTransactions";

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      <AlertBanner />
      <HeroMetrics />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <UpcomingPayments />
          <ConnectedBanks />
        </div>
        <div className="flex flex-col gap-6">
          <YourCards />
          <SpendingBreakdown />
        </div>
      </div>
      <RecentTransactions />
    </div>
  );
}
```

### Step 2: Update the sidebar

- [ ] **2.1 Read** `apps/app/src/components/application/dashboard-sidebar.tsx` top to bottom to confirm the current `navItemsSimple` and `commandRoutes` shapes.

- [ ] **2.2 Add** `BarChartSquare02` (or a similar Overview-intent icon that already exists in `@untitledui/icons`) to the import.

- [ ] **2.3 Insert** an Overview nav item between Home and Credit Cards:

```tsx
{
    label: "Overview",
    href: "/overview",
    icon: BarChartSquare02,
},
```

- [ ] **2.4 Extend** `commandRoutes`:

```ts
const commandRoutes: Record<string, string> = {
    home: "/",
    overview: "/overview",
    "credit-cards": "/credit-cards",
    transactions: "/transactions",
    wallets: "/wallets",
    settings: "/settings",
};
```

- [ ] **2.5 Add** an Overview item to the command menu's Navigation section:

```tsx
<CommandMenu.Item id="overview" label="Overview" type="icon" icon={BarChartSquare02} />
```

### Step 3: Verify

- [ ] **3.1 Run typecheck:**

```bash
bun typecheck
```

Expected: zero errors.

- [ ] **3.2 Start dev:**

```bash
bun dev:app
```

- [ ] **3.3 Manual smoke:**
  - Navigate to http://localhost:3000/overview. Expect the full dashboard to render.
  - Navigate to http://localhost:3000/. Expect the old dashboard to render (chat has not been swapped in yet).
  - Open Cmd+K command menu. Expect an "Overview" item.
  - Click sidebar "Overview". Expect navigation to `/overview`.

- [ ] **3.4 Run build:**

```bash
bun build --filter=@repo/app
```

Expected: build succeeds.

### Step 4: Commit

- [ ] **4.1 Commit with Graphite:**

```bash
gt create feat/agentic-home/W1-relocate-overview -m "feat(app): relocate dashboard to /overview"
```

Full commit message body (use a HEREDOC):

```
feat(app): relocate dashboard to /overview

Add /overview route mirroring the current / dashboard. Sidebar gains
an Overview entry plus command-menu item. Current / continues to
render the dashboard until T-2 swaps in the chat shell. Net-new file;
zero edits to dashboard/components/*.

Refs: LIN-TBD (W1 T-1)

Co-Authored-By: Claude <noreply@anthropic.com>
```

- [ ] **4.2 Submit:**

```bash
gt submit --stack
```

Expected: PR created with CodeRabbit queued.

### Acceptance checklist

- [ ] `apps/app/src/app/(app)/overview/page.tsx` exists and renders the 7 subcomponents.
- [ ] Sidebar has Overview nav item and command-menu item.
- [ ] `commandRoutes` maps `overview` to `/overview`.
- [ ] `bun typecheck`, `bun build --filter=@repo/app`, `bun lint` all pass.
- [ ] Manual smoke at `/overview` and command menu passes.
- [ ] Zero edits to files in `apps/app/src/app/(app)/dashboard/components/`.
- [ ] CodeRabbit review clean.
- [ ] Cross-agent review: Claude Code reviews this Codex-landed PR before merge.
- [ ] No em-dashes in diff, commit message, or PR description.

---

## Task T-2: Route shells and reserved-slug guard

**Recommended agent:** Codex
**Rationale:** Bounded single-file edits with precise acceptance. Reserved-slug list is static. The only judgement call (regex shape) was pre-resolved in T-0.3.
**Linear issue:** LIN-TBD (W1 T-2 Route shells)

### Scope

Files to create:
- `apps/app/src/app/(app)/[threadId]/page.tsx`

Files to modify:
- `apps/app/src/app/(app)/page.tsx` (rewritten)

Files NOT touched in this task:
- `apps/app/src/components/chat/*` (created in T-3)

Acceptance: `/` renders a chat shell placeholder; `/{slug}` renders chat shell or 404 depending on the slug; legacy dashboard at `/` is gone.

### Step 1: Create the placeholder ChatView stub

T-3 writes the real `ChatView`; T-2 ships a minimal placeholder so the route files have something to render and the Graphite PR is self-contained.

- [ ] **1.1 Create** `apps/app/src/components/chat/ChatView.tsx` with a skeleton (signature matches the T-3 final version so the route files never change):

```tsx
"use client";

import type { Id } from "@convex/_generated/dataModel";

interface ChatViewProps {
  initialThreadId?: Id<"agentThreads">;
}

export function ChatView({ initialThreadId }: ChatViewProps) {
  return (
    <div className="flex h-screen items-center justify-center p-8">
      <div className="max-w-md text-center">
        <p className="text-lg font-semibold text-primary">Chat home</p>
        <p className="mt-2 text-sm text-tertiary">
          {initialThreadId ? `Thread: ${initialThreadId}` : "New conversation"}
        </p>
        <p className="mt-4 text-xs text-quaternary">
          T-3 will render the real chat surface here.
        </p>
      </div>
    </div>
  );
}
```

Note: `Id<"agentThreads">` may not yet be a valid type if W2's `agentThreads` table is not in the schema at the time T-2 lands. Mitigation: during T-2, cast `initialThreadId?: string` with a code comment pointing at CA-13, and flip to the typed version inside T-3 once W2 has shipped the schema. If W2 is already landed when T-2 runs, use the typed form from the start.

Note: class names like `text-primary`, `text-tertiary`, `text-quaternary` map to SmartPockets tokens already used elsewhere in `apps/app`. Verify at write time by grepping an existing file (e.g., `apps/app/src/app/(app)/layout.tsx`) for the token names.

### Step 2: Rewrite the root page

- [ ] **2.1 Replace** the body of `apps/app/src/app/(app)/page.tsx` with:

```tsx
"use client";

import { ChatView } from "@/components/chat/ChatView";

export default function HomePage() {
  return <ChatView />;
}
```

### Step 3: Create the `[threadId]` route with reserved-slug guard

- [ ] **3.1 Create** `apps/app/src/app/(app)/[threadId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { ChatView } from "@/components/chat/ChatView";

const RESERVED_SLUGS = new Set([
  "overview",
  "credit-cards",
  "transactions",
  "wallets",
  "settings",
  "sign-in",
  "sign-up",
  "dev",            // W3 preview harness at /dev/tool-results per 00-contracts.md §1.4
]);

// Id<"agentThreads"> shape confirmed in T-0.3. Convex Ents IDs are base32
// with a table prefix; update only if Convex changes its ID scheme.
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

  return <ChatView initialThreadId={threadId} />;
}
```

### Step 4: Verify

- [ ] **4.1 Run typecheck:**

```bash
bun typecheck
```

Expected: zero errors.

- [ ] **4.2 Manual smoke** with `bun dev:app`:
  - `/` renders the placeholder "Chat home / New conversation".
  - `/overview` still renders the dashboard (T-1 already landed).
  - `/not-a-thread` returns 404.
  - `/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` (32 chars) renders placeholder with `Thread: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`.
  - `/credit-cards` still renders the credit cards page (reserved; never caught by `[threadId]`).

- [ ] **4.3 Run build:**

```bash
bun build --filter=@repo/app
```

Expected: succeeds.

### Step 5: Commit

- [ ] **5.1 Graphite create:**

```bash
gt create feat/agentic-home/W1-route-shells -m "feat(app): replace / with chat placeholder and add [threadId] guard"
```

Commit body:

```
feat(app): replace / with chat placeholder and add [threadId] guard

Introduce the chat surface at /. Adds /[threadId] with a reserved-slug
and thread-id-shape guard that 404s anything that collides with a
top-level route or does not match the @convex-dev/agent ID regex
confirmed in T-0.3. Ships a minimal ChatView placeholder that T-3
rewrites. The legacy dashboard body now lives at /overview (T-1).

Refs: LIN-TBD (W1 T-2)

Co-Authored-By: Claude <noreply@anthropic.com>
```

- [ ] **5.2 Submit:**

```bash
gt submit --stack
```

### Acceptance checklist

- [ ] `/` renders `<ChatView />` placeholder.
- [ ] `/[threadId]/page.tsx` exists with RESERVED_SLUGS guard and shape regex.
- [ ] Reserved slugs (`overview`, `credit-cards`, `transactions`, `wallets`, `settings`, `sign-in`, `sign-up`, `dev`) at `/{slug}` route to their actual pages (not 404). `dev` returns 404 today because W3 has not yet shipped the preview harness; confirm it still 404s after W3 lands. Confirmed by navigating to each.
- [ ] A malformed slug (e.g., `/foo`) returns 404.
- [ ] A 32-char lowercase-hex-like slug renders `ChatView` with that `initialThreadId`.
- [ ] `bun typecheck`, `bun build --filter=@repo/app`, `bun lint` all pass.
- [ ] CodeRabbit review clean.
- [ ] Cross-agent review: Claude Code reviews this Codex-landed PR.
- [ ] No em-dashes in diff, commit, or PR description.

---

## Task T-3: Port chat components with mock data

**Recommended agent:** Claude Code
**Rationale:** Multi-file semantic port requiring judgement about which template features survive, how to adapt tokens, and how to reconcile hand-memoization with the React Compiler.
**Linear issue:** LIN-TBD (W1 T-3 Chat components)

### Scope

Files to create in `apps/app/src/components/chat/`:
- `ChatContainer.tsx`
- `ChatHome.tsx`
- `MessageList.tsx`
- `MessageBubble.tsx`
- `MessageInput.tsx`
- `MessageActionMinimal.tsx`
- `MessageActions.tsx`
- `MessageFailedState.tsx`
- `MarkdownContent.tsx`
- `ToolCallDisplay.tsx`
- `ThreadItem.tsx`
- `ChatErrorBoundary.tsx`
- `tool-results/index.ts`
- `tool-results/ToolResultRenderer.tsx`
- `tool-results/types.ts`

Files to modify:
- `apps/app/src/components/chat/ChatView.tsx` (rewrite the placeholder from T-2 with the real orchestrator, but still using mock data)
- `apps/app/package.json` (add new deps)

Files NOT touched:
- Sidebar (T-4 wires thread list).
- Convex backend.

Acceptance: `ChatView` renders real components against mocked data. The MVP chat shell is visible at `/` and at `/{fakethreadid}`. No live agent calls yet (CA-1 through CA-3 remain unused until T-5).

### Step 1: Install dependencies

- [ ] **1.1 Add** `@convex-dev/agent`, `react-markdown`, `remark-gfm`, `rehype-raw` to `apps/app/package.json`:

```bash
cd ~/Developer/smartpockets-W1-chat
cd apps/app
bun add @convex-dev/agent@^0.3.2 react-markdown@^10.1.0 remark-gfm@^4.0.1 rehype-raw@^7.0.0
cd ../..
```

- [ ] **1.2 Verify** `bun typecheck` still passes.

### Step 2: Port MarkdownContent with sanitization

- [ ] **2.1 Read** the template file `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/apps/app/src/components/chat/MarkdownContent.tsx`.

- [ ] **2.2 Create** `apps/app/src/components/chat/MarkdownContent.tsx`:

```tsx
"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface MarkdownContentProps {
  content: string;
}

function stripDangerousHtml(input: string): string {
  // Defense-in-depth. rehype-raw parses raw HTML; we strip executable vectors before it sees them.
  return input
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "")
    .replace(/\s+on[a-z]+=\s*"[^"]*"/gi, "")
    .replace(/\s+on[a-z]+=\s*'[^']*'/gi, "");
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const safe = stripDangerousHtml(content);
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {safe}
      </ReactMarkdown>
    </div>
  );
}
```

### Step 3: Port ChatContainer, ChatHome, ChatErrorBoundary

- [ ] **3.1 Create** `ChatContainer.tsx` by reading the template file and adapting tokens:

```tsx
"use client";

import { ReactNode } from "react";

interface ChatContainerProps {
  children: ReactNode;
}

export function ChatContainer({ children }: ChatContainerProps) {
  return (
    <div className="flex h-screen flex-col bg-primary">
      <div className="relative flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
```

- [ ] **3.2 Create** `ChatHome.tsx` with SmartPockets branding and the 4 finance chips:

```tsx
"use client";

import { useRef } from "react";

const SUGGESTIONS = [
  "What did I spend on groceries last month?",
  "Which deferred-interest promo expires first?",
  "Show my Chase Sapphire statement.",
  "Mark all Amazon charges as Shopping.",
];

interface ChatHomeProps {
  onSend: (message: string) => void;
}

export function ChatHome({ onSend }: ChatHomeProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="flex w-full max-w-2xl flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-primary">
            Ask SmartPockets anything about your money.
          </h1>
          <p className="mt-2 text-sm text-tertiary">
            Balances, promos, transactions, spend breakdowns. Ask in plain language.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {SUGGESTIONS.map((label) => (
            <SuggestionChip key={label} label={label} onClick={() => onSend(label)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SuggestionChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-secondary bg-primary px-4 py-2 text-sm font-medium text-secondary shadow-xs transition-colors hover:bg-secondary-hover"
    >
      {label}
    </button>
  );
}
```

(The composer that lives above the chips on the template lives inside `MessageInput`; `ChatHome` is the empty state body above the input region, which `ChatView` renders outside `ChatHome`. Verify layout during Step 9 smoke test.)

- [ ] **3.3 Create** `ChatErrorBoundary.tsx` by lifting the template file verbatim and adapting token names:

```tsx
"use client";

import { Component, ReactNode } from "react";

interface ChatErrorBoundaryProps {
  children: ReactNode;
}

interface ChatErrorBoundaryState {
  error: Error | null;
}

export class ChatErrorBoundary extends Component<ChatErrorBoundaryProps, ChatErrorBoundaryState> {
  state: ChatErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ChatErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[ChatErrorBoundary]", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-md text-center">
            <p className="text-sm font-semibold text-primary">Something went wrong in chat.</p>
            <p className="mt-2 text-xs text-tertiary">{this.state.error.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### Step 4: Port the composer chain

- [ ] **4.1 Read** template files `MessageActionMinimal.tsx`, `MessageInput.tsx`.

- [ ] **4.2 Create** `MessageActionMinimal.tsx`. Drop the model selector, file upload, research toggle, and voice recorder branches. Retain the textarea autosize behaviour and the send button.

```tsx
"use client";

import { useRef, useState } from "react";
import { ArrowUp } from "@untitledui/icons";
import { cx } from "@/utils/cx";

interface MessageActionMinimalProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function MessageActionMinimal({ onSubmit, isLoading, disabled, className }: MessageActionMinimalProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (value.trim() && !isLoading && !disabled) {
        onSubmit(value.trim());
        setValue("");
      }
    }
  };

  const handleInput = () => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 200)}px`;
  };

  return (
    <div className={cx("relative flex items-end gap-2 rounded-2xl border border-secondary bg-primary p-2 shadow-xs", className)}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Ask SmartPockets anything..."
        aria-label="Send a message"
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:outline-none"
      />
      <button
        type="button"
        onClick={() => {
          if (value.trim() && !isLoading && !disabled) {
            onSubmit(value.trim());
            setValue("");
          }
        }}
        disabled={!value.trim() || isLoading || disabled}
        aria-label="Send"
        className="flex size-9 items-center justify-center rounded-full bg-brand-solid text-white transition-colors disabled:opacity-40"
      >
        <ArrowUp className="size-5" />
      </button>
    </div>
  );
}
```

- [ ] **4.3 Create** `MessageInput.tsx`:

```tsx
"use client";

import { MessageActionMinimal } from "@/components/chat/MessageActionMinimal";

interface MessageInputProps {
  onSend: (message: string) => Promise<void> | void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function MessageInput({ onSend, isLoading, disabled }: MessageInputProps) {
  return (
    <div className="bg-primary px-4 pb-6 pt-2 md:px-8">
      <div className="mx-auto max-w-4xl">
        <MessageActionMinimal
          onSubmit={onSend}
          isLoading={isLoading}
          disabled={disabled}
          className="w-full"
        />
        <p className="mt-2 text-center text-xs text-tertiary">
          Assistant can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
```

### Step 5: Port the tool-results registry stub (reconciled per W3 §3.4, §3.5)

- [ ] **5.1 Create** `tool-results/types.ts`:

```ts
import type { ComponentType, FC } from "react";
import type { Id } from "@convex/_generated/dataModel";

export type ToolResultState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

export interface ToolResultComponentProps<Input = unknown, Output = unknown> {
  toolName: string;
  input: Input;
  output: Output | null;
  state: ToolResultState;
  errorText?: string;
  proposalId?: Id<"agentProposals">;
  threadId: Id<"agentThreads">;
}

export interface ToolResultRegistryEntry<Input = unknown, Output = unknown> {
  Component: FC<ToolResultComponentProps<Input, Output>>;
  Skeleton?: FC<{ input?: Input }>;
  variant?: "single" | "bulk";
}

// Keyed by tool name. Populated by W3 (all 14 read tools + get_proposal).
// W1 ships an empty object; W3 replaces the module contents without a rename.
export type ToolResultRegistry = Record<string, ToolResultRegistryEntry>;
```

- [ ] **5.2 Create** `tool-results/registry.ts` (authoritative file name per W3 §3.5):

```ts
import type { FC } from "react";
import type { ToolResultComponentProps, ToolResultRegistry } from "./types";

// Empty stub. W3 replaces this module with the populated registry that maps
// every read tool name to { Component, Skeleton?, variant? }. W1 never
// populates entries itself.
export const toolResultRegistry: ToolResultRegistry = {};

// Single export consumed by ToolResultRenderer when toolName starts with
// "propose_" or equals "get_proposal". W3 replaces null with ProposalConfirmCard.
export let proposalFallback: FC<ToolResultComponentProps> | null = null;

// W3 swaps this reference in its own registry module; W1 keeps the binding
// live-updatable via a small setter so the Convex reactive update cycle does
// not need a rebuild during local development.
export function __setProposalFallback(component: FC<ToolResultComponentProps> | null) {
  proposalFallback = component;
}
```

- [ ] **5.3 Create** `tool-results/ToolResultRenderer.tsx`:

```tsx
"use client";

import { proposalFallback, toolResultRegistry } from "./registry";
import type { ToolResultComponentProps } from "./types";
import { ToolErrorRow } from "@/components/chat/ToolErrorRow";
import { ToolCallDisplay } from "@/components/chat/ToolCallDisplay";

const PROPOSAL_PREFIX = "propose_";
const PROPOSAL_READ_TOOL = "get_proposal";

export function ToolResultRenderer(props: ToolResultComponentProps) {
  const { toolName, state, errorText } = props;

  // Error state always takes precedence.
  if (state === "output-error") {
    return <ToolErrorRow toolName={toolName} errorText={errorText ?? "Tool failed"} />;
  }

  // Proposal dispatch (proposal tools or the get_proposal read tool).
  if ((toolName.startsWith(PROPOSAL_PREFIX) || toolName === PROPOSAL_READ_TOOL) && proposalFallback) {
    const Component = proposalFallback;
    return <Component {...props} />;
  }

  // Registered tool.
  const entry = toolResultRegistry[toolName];
  if (entry) {
    if (state === "input-streaming" && entry.Skeleton) {
      const Skeleton = entry.Skeleton;
      return <Skeleton input={props.input as never} />;
    }
    const Component = entry.Component;
    return <Component {...(props as ToolResultComponentProps<never, never>)} />;
  }

  // No registry match. Fall back to raw JSON collapse card.
  return (
    <ToolCallDisplay
      part={{
        type: "tool-result",
        toolName,
        args: props.input,
        result: props.output ?? undefined,
        state,
        error: errorText,
      }}
    />
  );
}
```

- [ ] **5.4 Create** `tool-results/index.ts` as a re-export barrel (optional convenience; W3 may ignore):

```ts
export { toolResultRegistry, proposalFallback, __setProposalFallback } from "./registry";
export { ToolResultRenderer } from "./ToolResultRenderer";
export type {
  ToolResultComponentProps,
  ToolResultRegistry,
  ToolResultRegistryEntry,
  ToolResultState,
} from "./types";
```

- [ ] **5.5 Create** `ToolErrorRow.tsx` (W1 owns; per CB-1 and spec §8):

```tsx
"use client";

import { AlertCircle } from "@untitledui/icons";

interface ToolErrorRowProps {
  toolName: string;
  errorText: string;
}

export function ToolErrorRow({ toolName, errorText }: ToolErrorRowProps) {
  return (
    <div className="my-2 flex items-start gap-2 rounded-lg border border-error-primary bg-error-primary-subtle px-3 py-2 text-sm text-error-primary">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">{toolName} failed</p>
        <p className="mt-1 text-xs text-error-primary/80">{errorText}</p>
      </div>
    </div>
  );
}
```

- [ ] **5.6 Create** `ChatInteractionContext.tsx` (CB-5 provider; W3 drill-ins and card actions call `useChatInteraction()` instead of receiving individual callbacks as props):

```tsx
"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export type ToolHint = { tool: string; args: Record<string, unknown> };

export interface ChatInteractionValue {
  sendMessage: (prompt: string, options?: { toolHint?: ToolHint }) => Promise<void>;
  confirmProposal: (proposalId: Id<"agentProposals">) => Promise<{ executed: boolean; reversalToken?: string }>;
  cancelProposal: (proposalId: Id<"agentProposals">) => Promise<{ cancelled: boolean }>;
  undoMutation: (reversalToken: string) => Promise<{ reverted: boolean }>;
}

const ChatInteractionContext = createContext<ChatInteractionValue | null>(null);

export function useChatInteraction(): ChatInteractionValue {
  const ctx = useContext(ChatInteractionContext);
  if (!ctx) {
    throw new Error("useChatInteraction must be used inside <ChatInteractionProvider>");
  }
  return ctx;
}

interface ChatInteractionProviderProps {
  threadId: Id<"agentThreads"> | null;
  onThreadIdChange: (threadId: Id<"agentThreads">) => void;
  children: ReactNode;
}

export function ChatInteractionProvider({ threadId, onThreadIdChange, children }: ChatInteractionProviderProps) {
  const confirm = useMutation(api.agent.proposals.confirm);
  const cancel = useMutation(api.agent.proposals.cancel);
  const undo = useMutation(api.agent.proposals.undo);

  const value = useMemo<ChatInteractionValue>(
    () => ({
      sendMessage: async (prompt, options) => {
        const body = { threadId: threadId ?? undefined, prompt, toolHint: options?.toolHint };
        const res = await fetch("/api/agent/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.status === 429) {
          const payload = (await res.json()) as { error: "rate_limited" | "budget_exhausted"; reason: string; retryAfterSeconds?: number };
          const err = new Error(payload.reason) as Error & { data: typeof payload };
          err.data = payload;
          throw err;
        }
        if (!res.ok) throw new Error(`/api/agent/send failed: ${res.status}`);
        const { threadId: newId } = (await res.json()) as { threadId: Id<"agentThreads">; messageId: string };
        if (newId && newId !== threadId) onThreadIdChange(newId);
      },
      confirmProposal: (proposalId) => confirm({ proposalId }),
      cancelProposal: (proposalId) => cancel({ proposalId }),
      undoMutation: (reversalToken) => undo({ reversalToken }),
    }),
    [threadId, onThreadIdChange, confirm, cancel, undo],
  );

  return <ChatInteractionContext.Provider value={value}>{children}</ChatInteractionContext.Provider>;
}
```

Note: `ChatView` wraps its subtree in `<ChatInteractionProvider>` in Step 9. W3 components call `useChatInteraction()` and do not receive `onConfirm`/`onCancel`/`onUndo` as individual props (they are derived from the context inside `ProposalConfirmCard`). W1 still passes them through the W3 registry signature for test ergonomics.

### Step 6: Port ToolCallDisplay, MessageActions, MessageFailedState

- [ ] **6.1 Create** `ToolCallDisplay.tsx` adapted from the template. Retain collapsible behaviour and pending/done/error icons. Use `@untitledui/icons`:

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Settings01, Check, XClose } from "@untitledui/icons";

interface ToolCallDisplayProps {
  part: {
    type: string;
    toolCallId?: string;
    toolName?: string;
    args?: unknown;
    result?: unknown;
    error?: string;
    state?: string;
  };
}

export function ToolCallDisplay({ part }: ToolCallDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toolName = part.toolName ?? part.type.replace("tool-", "");
  const isComplete = part.state === "result" || part.result !== undefined;
  const hasError = part.state === "error" || part.error !== undefined;
  const isPending = !isComplete && !hasError;

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-secondary bg-primary">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-secondary"
      >
        {isExpanded ? <ChevronDown className="size-4 text-quaternary" /> : <ChevronRight className="size-4 text-quaternary" />}
        <Settings01 className="size-4 text-tertiary" />
        <span className="font-medium text-secondary">{toolName}</span>
        <div className="ml-auto">
          {isComplete && <Check className="size-4 text-success-secondary" />}
          {hasError && <XClose className="size-4 text-error-secondary" />}
          {isPending && <div className="size-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />}
        </div>
      </button>
      {isExpanded && (
        <div className="space-y-2 border-t border-secondary px-3 pb-3">
          {part.args !== undefined && (
            <div className="pt-2">
              <p className="mb-1 text-xs font-medium text-tertiary">Input</p>
              <pre className="overflow-x-auto rounded bg-secondary p-2 text-xs text-secondary">
                {JSON.stringify(part.args, null, 2)}
              </pre>
            </div>
          )}
          {part.result !== undefined && (
            <div>
              <p className="mb-1 text-xs font-medium text-tertiary">Output</p>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-secondary p-2 text-xs text-secondary">
                {typeof part.result === "string" ? part.result : JSON.stringify(part.result, null, 2)}
              </pre>
            </div>
          )}
          {part.error && (
            <div>
              <p className="mb-1 text-xs font-medium text-tertiary">Error</p>
              <p className="text-xs text-error-primary">{part.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **6.2 Create** `MessageActions.tsx` (copy + retry + optional regenerate):

```tsx
"use client";

import { Copy01 } from "@untitledui/icons";
import { useState } from "react";
import { cx } from "@/utils/cx";

interface MessageActionsProps {
  threadId: string;
  messageOrder: number;
  messageText: string;
  role: "user" | "assistant";
  onRegenerate?: () => Promise<void> | void;
  className?: string;
}

export function MessageActions({ messageText, role, onRegenerate, className }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cx("flex items-center gap-1 opacity-0 transition-opacity group-hover/msg:opacity-100", className)}>
      <button type="button" onClick={handleCopy} aria-label="Copy" className="rounded p-1 hover:bg-secondary">
        <Copy01 className="size-4 text-quaternary" />
      </button>
      {role === "assistant" && onRegenerate && (
        <button type="button" onClick={() => void onRegenerate()} className="rounded px-2 py-1 text-xs text-tertiary hover:bg-secondary">
          Retry
        </button>
      )}
      {copied && <span className="text-xs text-tertiary">Copied</span>}
    </div>
  );
}
```

- [ ] **6.3 Create** `MessageFailedState.tsx`:

```tsx
"use client";

interface MessageFailedStateProps {
  onRetry: () => void;
  isRetrying: boolean;
}

export function MessageFailedState({ onRetry, isRetrying }: MessageFailedStateProps) {
  return (
    <div className="mt-2 flex items-center gap-2 border-t border-error-primary pt-2 text-xs text-error-primary">
      <span>Message failed.</span>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="rounded border border-error-primary px-2 py-0.5 hover:bg-error-primary hover:text-white disabled:opacity-40"
      >
        {isRetrying ? "Retrying..." : "Retry"}
      </button>
    </div>
  );
}
```

### Step 7: Port MessageBubble and MessageList (row-stream model)

Reconciled against contracts §5.1 and W2 §4.2. W1 consumes a flat stream of `agentMessages` rows; it does NOT use `useUIMessages`/`UIMessage.parts`. MessageBubble renders a single row. MessageList groups consecutive rows by `agentThreadId` and role.

- [ ] **7.1 Create** `MessageBubble.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useSmoothText } from "@convex-dev/agent/react";
import { useUser } from "@clerk/nextjs";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { Avatar } from "@repo/ui/untitledui/base/avatar/avatar";
import { UntitledLogoMinimal } from "@repo/ui/untitledui/foundations/logo/untitledui-logo-minimal";
import { MarkdownContent } from "@/components/chat/MarkdownContent";
import { MessageActions } from "@/components/chat/MessageActions";
import { MessageFailedState } from "@/components/chat/MessageFailedState";
import { ToolResultRenderer } from "@/components/chat/tool-results/ToolResultRenderer";
import type { ToolResultState } from "@/components/chat/tool-results/types";
import { cx } from "@/utils/cx";

type AgentMessage = Doc<"agentMessages">;

interface MessageBubbleProps {
  message: AgentMessage;
  threadId: Id<"agentThreads">;
  onRegenerate?: () => Promise<void> | void;
}

function deriveToolState(message: AgentMessage): ToolResultState {
  if (message.toolResultJson && tryParseJson(message.toolResultJson)?.error) return "output-error";
  if (message.toolResultJson) return "output-available";
  if (message.toolCallsJson) return "input-available";
  return "input-streaming";
}

function tryParseJson(raw: string): { error?: string; [k: string]: unknown } | null {
  try { return JSON.parse(raw); } catch { return null; }
}

export function MessageBubble({ message, threadId, onRegenerate }: MessageBubbleProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isTool = message.role === "tool";
  const isSystem = message.role === "system";
  const isStreaming = message.isStreaming;

  const [smoothText] = useSmoothText(message.text ?? "", { startStreaming: isStreaming });
  const displayText = isUser || isSystem ? (message.text ?? "") : smoothText;

  const { user } = useUser();
  const userInitials = user?.fullName?.split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const userAlt = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "User";

  const handleRetry = async () => {
    if (!onRegenerate) return;
    setIsRetrying(true);
    try { await onRegenerate(); } finally { setIsRetrying(false); }
  };

  // Tool rows dispatch to ToolResultRenderer without a bubble chrome.
  if (isTool) {
    const parsedArgs = message.toolCallsJson ? tryParseJson(message.toolCallsJson) : null;
    const parsedResult = message.toolResultJson ? tryParseJson(message.toolResultJson) : null;
    return (
      <ToolResultRenderer
        toolName={message.toolName ?? "unknown"}
        input={parsedArgs ?? {}}
        output={parsedResult ?? null}
        state={deriveToolState(message)}
        errorText={parsedResult?.error as string | undefined}
        proposalId={message.proposalId}
        threadId={threadId}
      />
    );
  }

  // System rows (e.g., outage notices from W2 §17.2) render as neutral banners.
  if (isSystem) {
    return (
      <div role="status" className="rounded-md border border-secondary bg-secondary/40 px-4 py-2 text-sm text-tertiary">
        {displayText}
      </div>
    );
  }

  return (
    <div className={cx("group/msg relative flex gap-4", isUser && "flex-row-reverse")}>
      {isUser ? (
        <Avatar size="md" src={user?.imageUrl} alt={userAlt} initials={userInitials} placeholder="U" />
      ) : (
        <div className="flex size-10 items-center justify-center">
          <UntitledLogoMinimal />
        </div>
      )}
      <div className={cx("flex max-w-[80%] flex-col gap-1", isUser ? "items-end" : "items-start")}>
        <div
          className={cx(
            "rounded-2xl px-5 py-3 text-sm",
            isUser
              ? "rounded-tr-none bg-brand-solid text-white"
              : "min-h-[42px] rounded-tl-none bg-secondary text-primary",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{displayText}</p>
          ) : isStreaming ? (
            <div className="[&_*:last-child]:animate-text-fade-in">
              <MarkdownContent content={smoothText} />
            </div>
          ) : (
            <MarkdownContent content={displayText} />
          )}
        </div>
        {isAssistant && !isStreaming && onRegenerate && (
          <MessageFailedState onRetry={handleRetry} isRetrying={isRetrying} />
        )}
        {!isStreaming && (
          <MessageActions
            threadId={threadId}
            messageOrder={message.createdAt}
            messageText={message.text ?? ""}
            role={isUser ? "user" : "assistant"}
            onRegenerate={isAssistant ? onRegenerate : undefined}
            className={isUser ? "mr-1" : "ml-1"}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **7.2 Create** `MessageList.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { MessageItem } from "@repo/ui/untitledui/application/messaging/messaging";
import { UntitledLogoMinimal } from "@repo/ui/untitledui/foundations/logo/untitledui-logo-minimal";
import { MessageBubble } from "@/components/chat/MessageBubble";

type AgentMessage = Doc<"agentMessages">;

interface MessageListProps {
  threadId: Id<"agentThreads"> | null;
  optimisticPrompt?: string | null;
  onMessagesLoaded?: () => void;
  onRegenerate?: (message: AgentMessage) => Promise<void> | void;
}

export function MessageList({ threadId, optimisticPrompt, onMessagesLoaded, onRegenerate }: MessageListProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  // CA-3: reactive query for the row stream. `undefined` while loading, `[]` if empty.
  const messages = useQuery(api.agent.threads.listMessages, threadId ? { threadId } : "skip");

  const normalized = optimisticPrompt?.trim();
  const matched = normalized && messages
    ? messages.some((m) => m.role === "user" && m.text?.trim() === normalized)
    : false;
  const showOptimistic = Boolean(normalized && !matched);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length, showOptimistic]);

  useEffect(() => {
    if (matched && onMessagesLoaded) onMessagesLoaded();
  }, [matched, onMessagesLoaded]);

  if (!threadId && !optimisticPrompt) return null;

  if (messages === undefined && !optimisticPrompt) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div role="log" aria-live="polite" className="flex-1 space-y-6 overflow-y-auto px-4 py-6 md:px-8">
      {messages?.map((message) => (
        <MessageBubble
          key={message._id}
          message={message}
          threadId={threadId!}
          onRegenerate={onRegenerate && message.role === "assistant" ? () => onRegenerate(message) : undefined}
        />
      ))}
      {showOptimistic && normalized && (
        <>
          <MessageBubble
            message={{
              _id: "optimistic-user" as Id<"agentMessages">,
              _creationTime: Date.now(),
              role: "user",
              text: normalized,
              createdAt: Date.now(),
              isStreaming: false,
              agentThreadId: (threadId ?? "optimistic") as Id<"agentThreads">,
            } as AgentMessage}
            threadId={(threadId ?? "optimistic") as Id<"agentThreads">}
          />
          <MessageItem
            msg={{ id: "optimistic-ai", typing: true, user: { name: "SmartPockets", avatar: <UntitledLogoMinimal /> } }}
            showUserLabel={false}
          />
        </>
      )}
      <div ref={endRef} />
    </div>
  );
}
```

Notes:
- `useQuery` here is the cached variant from `convex-helpers/react/cache/hooks` per AGENTS.md and CA-14.
- Pagination is deferred (CA-3 returns the full bounded thread window; compaction at W2 §9.3 keeps the window small). If/when the thread grows past the render window, a `loadEarlier` branch can be added as a follow-up task.
- The optimistic row uses fabricated `_id` and timestamps; it never hits Convex. The real user message from the reactive query supersedes it on first match.

### Step 8: Port ThreadItem

- [ ] **8.1 Read** template `thread-item.tsx`.

- [ ] **8.2 Create** `apps/app/src/components/chat/ThreadItem.tsx`. For the mock-data PR, render the title only. T-5 adds hover rename + delete via dropdown once CA-5 and CA-6 land.

```tsx
"use client";

import { truncate } from "@/utils/truncate";

interface ThreadItemProps {
  threadId: string;
  title: string;
}

export function ThreadItem({ threadId: _threadId, title }: ThreadItemProps) {
  return <span className="block truncate">{truncate(title, 40)}</span>;
}
```

Note: T-5 replaces this stub with hover-activated rename and delete menus once CA-5 and CA-6 are confirmed available.

### Step 9: Rewrite ChatView with the real orchestrator

- [ ] **9.1 Replace** `apps/app/src/components/chat/ChatView.tsx` (currently the T-2 placeholder) with:

```tsx
"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { Id } from "@convex/_generated/dataModel";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { ChatErrorBoundary } from "@/components/chat/ChatErrorBoundary";
import { ChatHome } from "@/components/chat/ChatHome";
import { ChatInteractionProvider, useChatInteraction } from "@/components/chat/ChatInteractionContext";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";

interface ChatViewProps {
  initialThreadId?: Id<"agentThreads">;
}

export function ChatView({ initialThreadId }: ChatViewProps) {
  const [threadId, setThreadId] = useState<Id<"agentThreads"> | null>(initialThreadId ?? null);
  const router = useRouter();

  const handleThreadIdChange = useCallback(
    (nextId: Id<"agentThreads">) => {
      setThreadId(nextId);
      router.push(`/${nextId}`);
    },
    [router],
  );

  return (
    <ChatErrorBoundary>
      <ChatInteractionProvider threadId={threadId} onThreadIdChange={handleThreadIdChange}>
        <ChatViewBody threadId={threadId} />
      </ChatInteractionProvider>
    </ChatErrorBoundary>
  );
}

function ChatViewBody({ threadId }: { threadId: Id<"agentThreads"> | null }) {
  const { sendMessage } = useChatInteraction();
  const [isLoading, setIsLoading] = useState(false);
  const [optimisticPrompt, setOptimisticPrompt] = useState<string | null>(null);

  const handleSend = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setOptimisticPrompt(trimmed);
    try {
      await sendMessage(trimmed);
    } catch (err) {
      console.error("[ChatView] sendMessage failed", err);
      setOptimisticPrompt(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessagesLoaded = () => {
    if (threadId) setOptimisticPrompt(null);
  };

  return (
    <ChatContainer>
      {!threadId && !optimisticPrompt ? (
        <ChatHome onSend={handleSend} />
      ) : (
        <MessageList
          threadId={threadId}
          optimisticPrompt={optimisticPrompt}
          onMessagesLoaded={handleMessagesLoaded}
        />
      )}
      <MessageInput onSend={handleSend} isLoading={isLoading} />
    </ChatContainer>
  );
}
```

Notes for this step:
- `ChatInteractionProvider` wraps the chat subtree and owns the fetch-based `sendMessage`, plus the confirm/cancel/undo mutations. Matches CB-5 and W3 CR-4.
- `ChatView` exposes `initialThreadId?: Id<"agentThreads">` (typed Ents ID per CA-13) to the RSC route at `[threadId]/page.tsx`. Update the signature where consumed.
- T-3 ships this shape end-to-end. T-5 layers on top: adds `ChatBanner` + `ReconsentModal` consuming `AgentError.kind` surfaced from a catch in `sendMessage`, and upgrades `ThreadItem`.

### Step 10: Verify

- [ ] **10.1 Typecheck:**

```bash
bun typecheck
```

Expected: zero errors. If `@convex-dev/agent/react` types disagree with the code, reconcile by reading the installed package's types in `node_modules/@convex-dev/agent/dist/react`.

- [ ] **10.2 Build:**

```bash
bun build --filter=@repo/app
```

Expected: succeeds. A likely failure: `api.agent.threads.listMessages`, `api.agent.proposals.confirm`, `api.agent.proposals.cancel`, `api.agent.proposals.undo` do not exist if W2 has not landed. Mitigation: gate each call behind a guarded access and fall back to an empty array or no-op mutation. If Convex types fail-fast at build time, temporarily cast `api as any` at each import site with a code comment naming the CA-N that unblocks removal. Record decisions in the PR description.

- [ ] **10.3 Manual smoke:**
  - Navigate to `/`. Expect headline, subhead, 4 chips, composer.
  - Click a chip. Expect `ChatInteractionProvider.sendMessage` to call `POST /api/agent/send`. If W2 has not landed, the fetch fails; catch is noted in the PR description. Once W2 is live, the call returns `{ threadId }` and `router.push(`/${threadId}`)` fires.
  - Navigate to `/overview` via sidebar. Expect dashboard.
  - Navigate to `/credit-cards`, `/transactions`, `/wallets`, `/settings`. Expect unchanged pages.

### Step 11: Commit

- [ ] **11.1 Graphite:**

```bash
gt create feat/agentic-home/W1-port-components -m "feat(chat): port UntitledUI chat components with mock agent wiring"
```

Commit body:

```
feat(chat): port UntitledUI chat components with mock agent wiring

Port 12 client components from ai-chatbot-untitledui plus 3 net-new
tool-results registry files. Add ChatView orchestrator with mock
handleSend that T-5 rewrites to call CA-1 and CA-2. MarkdownContent
strips scripts and iframes before rehype-raw to mitigate
assistant-generated HTML. No Convex server code touched.

Deps added: @convex-dev/agent, react-markdown, remark-gfm, rehype-raw.

Refs: LIN-TBD (W1 T-3)

Co-Authored-By: Claude <noreply@anthropic.com>
```

- [ ] **11.2 Submit:**

```bash
gt submit --stack
```

### Acceptance checklist

- [ ] All files listed in the T-3 scope exist.
- [ ] `bun typecheck`, `bun build --filter=@repo/app`, `bun lint` pass.
- [ ] Chat empty state renders at `/`. Chips trigger the mock `handleSend`.
- [ ] Reserved-slug guard from T-2 still works.
- [ ] `MessageBubble` renders text, tool-call, and tool-result parts with the right dispatch. Proposal prefix handling is stubbed; real rendering waits on W3.
- [ ] No `useMemo` or `useCallback` left in ported files except where strictly necessary.
- [ ] MarkdownContent rejects `<script>`, `<iframe>`, and `on*=` attributes.
- [ ] CodeRabbit review clean.
- [ ] Cross-agent review: Codex reviews this Claude Code-landed PR before merge.
- [ ] No em-dashes anywhere.

---

## Task T-4: Sidebar History and command-menu Threads section

**Recommended agent:** Codex
**Rationale:** Single-file edit with a clear contract (CA-4). Mechanical once the query shape is stable.
**Linear issue:** LIN-TBD (W1 T-4 Sidebar History)

### Scope

Files to modify:
- `apps/app/src/components/application/dashboard-sidebar.tsx`

Dependencies: CA-4 (`api.agent.threads.listForUser`). If W2 has not landed, T-4 can still ship with a defensive fallback that renders an empty list; T-5 then verifies the real wiring.

### Step 1: Add the History nav item

- [ ] **1.1 Add** the import for the cached `useQuery`:

```tsx
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@convex/_generated/api";
import { ClockRewind } from "@untitledui/icons";
import { ThreadItem } from "@/components/chat/ThreadItem";
```

- [ ] **1.2 Inside** the component body, fetch threads:

```tsx
const threadsResult = useQuery(api.agent.threads.listForUser as any, {});
const threads = threadsResult ?? [];
```

The `as any` cast is a temporary bridge if the W2 backend has not shipped. Remove in T-5.3.

- [ ] **1.3 Build** history items:

```tsx
const historyItems: NavItemType["items"] = threads.map((thread) => ({
    label: <ThreadItem threadId={thread.threadId} title={thread.title ?? "Untitled"} />,
    href: `/${thread.threadId}`,
    truncate: false,
}));
```

- [ ] **1.4 Insert** the History entry between Overview and Credit Cards:

```tsx
{
    label: "History",
    href: "/",
    icon: ClockRewind,
    ...(historyItems.length > 0 && { items: historyItems }),
},
```

(Template pattern uses `href` as the fallback when no children; pointing at `/` means clicking "History" itself lands on the new-chat view.)

### Step 2: Add Threads section to the command menu

- [ ] **2.1 Extend** `<CommandMenu.List>`:

```tsx
<CommandMenu.Section title="Threads">
    <CommandMenu.Item id="new-chat" label="New chat" type="icon" icon={MessageSquare02} />
    {threads.slice(0, 10).map((thread) => (
        <CommandMenu.Item
            key={thread.threadId}
            id={`thread:${thread.threadId}`}
            label={thread.title ?? "Untitled"}
            type="icon"
            icon={ClockRewind}
        />
    ))}
</CommandMenu.Section>
```

- [ ] **2.2 Extend** `commandRoutes`:

```ts
const commandRoutes: Record<string, string> = {
    home: "/",
    overview: "/overview",
    "credit-cards": "/credit-cards",
    transactions: "/transactions",
    wallets: "/wallets",
    settings: "/settings",
    "new-chat": "/",
};
```

- [ ] **2.3 Update** `handleSelectionChange` to support the `thread:` prefix:

```tsx
const handleSelectionChange = (keys: Selection) => {
    if (keys === "all") return;
    const selectedKey = Array.from(keys)[0] as string;
    if (!selectedKey) return;
    if (selectedKey.startsWith("thread:")) {
        const threadId = selectedKey.slice("thread:".length);
        router.push(`/${threadId}`);
        setIsCommandMenuOpen(false);
        return;
    }
    if (commandRoutes[selectedKey]) {
        router.push(commandRoutes[selectedKey]);
        setIsCommandMenuOpen(false);
    }
};
```

- [ ] **2.4 Import** `MessageSquare02`:

```tsx
import { MessageSquare02 } from "@untitledui/icons";
```

### Step 3: Verify

- [ ] **3.1 Typecheck:**

```bash
bun typecheck
```

Expected: zero errors. If `api.agent.threads.listForUser` is undefined (W2 not landed), the `as any` cast holds the shape until CA-4 lands.

- [ ] **3.2 Manual smoke:**
  - With no threads: sidebar shows "History" flat without children.
  - Cmd+K opens command menu; Threads section shows only "New chat".
  - With threads present (after T-5 or via a manual Convex insert if W2 is landed): History expands with rows; clicking a row navigates to `/{threadId}`.

- [ ] **3.3 Build:**

```bash
bun build --filter=@repo/app
```

Expected: succeeds.

### Step 4: Commit

- [ ] **4.1 Graphite:**

```bash
gt create feat/agentic-home/W1-sidebar-history -m "feat(sidebar): add History nav + Threads command-menu section"
```

Commit body:

```
feat(sidebar): add History nav + Threads command-menu section

Wire DashboardSidebar to api.agent.threads.listForUser (CA-4), render
threads under a nested History item, and expose a Threads section in
the command menu with New chat + last 10 threads. Uses cached useQuery
from convex-helpers per AGENTS.md. If W2's threads query is not yet
live, the cast fallback renders an empty list without breaking the
sidebar.

Refs: LIN-TBD (W1 T-4)

Co-Authored-By: Claude <noreply@anthropic.com>
```

- [ ] **4.2 Submit:**

```bash
gt submit --stack
```

### Acceptance checklist

- [ ] History nav item exists and renders zero or N threads.
- [ ] Command menu has a Threads section with New chat + first 10 threads.
- [ ] Clicking a thread in either surface navigates to `/{threadId}`.
- [ ] `bun typecheck`, `bun build --filter=@repo/app`, `bun lint` pass.
- [ ] Cached `useQuery` from `convex-helpers` is used, not raw `convex/react` (AGENTS.md rule).
- [ ] CodeRabbit review clean.
- [ ] Cross-agent review: Claude Code reviews this Codex-landed PR.
- [ ] No em-dashes.

---

## Task T-5: Live agent integration and error UX

**Recommended agent:** Claude Code
**Rationale:** Auth-sensitive, cross-cutting. Layers error banners, reconsent modal, and thread-row interactions onto the T-3 ChatInteractionProvider. Touches 4 files (provider already owns fetch + mutation plumbing from T-3 Step 5.6).
**Linear issue:** LIN-TBD (W1 T-5 Live agent integration)

### Scope

Files to modify:
- `apps/app/src/components/chat/ChatView.tsx` (wrap in banner + reconsent state; catch `AgentError` from provider)
- `apps/app/src/components/chat/ChatInteractionContext.tsx` (add typed error translation on the fetch path)
- `apps/app/src/components/chat/ThreadItem.tsx` (replace T-3 stub with hover rename/delete dropdown)
- `apps/app/src/components/application/dashboard-sidebar.tsx` (remove the `as any` cast added in T-4 Step 1.2)

Files to create:
- `apps/app/src/components/chat/ChatBanner.tsx`
- `apps/app/src/components/chat/ReconsentModal.tsx`

Dependencies:
- CA-1, CA-3, CA-4, CA-5, CA-6, CA-9, CA-10, CA-11, CA-12, CA-15 all landed in W2.
- CB-3 landed in W3 (populated `ProposalConfirmCard`). If W3 has not landed, the `proposalFallback` stays null and proposal rows fall through to `ToolCallDisplay`; T-5 still ships.
- W3 CR-4 (ChatInteractionProvider) already landed in T-3 Step 5.6, so T-5 does not re-implement the provider; it upgrades it.

### Step 1: Upgrade `ChatInteractionContext` to translate typed errors

- [ ] **1.1 Edit** `apps/app/src/components/chat/ChatInteractionContext.tsx`. Keep the shape from T-3 Step 5.6 and extend the `sendMessage` implementation to parse 429 payloads and emit a typed `AgentError` that `ChatView` can catch.

Add this type and replace the body of `sendMessage`:

```tsx
// Add near the top of the file, above ChatInteractionProvider.
export type AgentError =
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "budget_exhausted"; reason: string }
  | { kind: "llm_down" }
  | { kind: "reconsent_required"; plaidItemId: string }
  | { kind: "first_turn_guard" }
  | { kind: "proposal_timed_out" }
  | { kind: "proposal_invalid_state" };

export class TypedAgentError extends Error {
  readonly kind: AgentError["kind"];
  readonly data: AgentError;
  constructor(data: AgentError) {
    super(data.kind);
    this.kind = data.kind;
    this.data = data;
  }
}

// Replace the body of sendMessage inside useMemo:
sendMessage: async (prompt, options) => {
  const body = { threadId: threadId ?? undefined, prompt, toolHint: options?.toolHint };
  const res = await fetch("/api/agent/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    throw new TypedAgentError({ kind: "llm_down" });
  }
  if (res.status === 429) {
    const payload = (await res.json()) as {
      error: "rate_limited" | "budget_exhausted";
      reason: string;
      retryAfterSeconds?: number;
    };
    if (payload.error === "rate_limited") {
      throw new TypedAgentError({
        kind: "rate_limited",
        retryAfterSeconds: payload.retryAfterSeconds ?? 30,
      });
    }
    throw new TypedAgentError({ kind: "budget_exhausted", reason: payload.reason });
  }
  if (!res.ok) {
    throw new Error(`/api/agent/send failed with ${res.status}`);
  }

  const { threadId: newId } = (await res.json()) as {
    threadId: Id<"agentThreads">;
    messageId: string;
  };
  if (newId && newId !== threadId) onThreadIdChange(newId);
},
```

(`llm_down`, `reconsent_required`, `first_turn_guard`, `proposal_timed_out`, `proposal_invalid_state` never come out of the HTTP `send` endpoint; they arrive via reactive `agentMessages` rows or via ConvexError from the proposal mutations. `ChatView` catches those at their own call sites in subsequent steps.)

### Step 2: Rewrite `ChatView` to route typed errors

- [ ] **2.1 Edit** `apps/app/src/components/chat/ChatView.tsx`. Keep the T-3 shape (provider wrapping `ChatViewBody`); add banner and modal state, catch `TypedAgentError` inside `handleSend`, and subscribe to a system-row signal for `llm_down`.

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { ChatErrorBoundary } from "@/components/chat/ChatErrorBoundary";
import { ChatHome } from "@/components/chat/ChatHome";
import {
  ChatInteractionProvider,
  TypedAgentError,
  useChatInteraction,
  type AgentError,
} from "@/components/chat/ChatInteractionContext";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ChatBanner, type ChatBannerState } from "@/components/chat/ChatBanner";
import { ReconsentModal } from "@/components/chat/ReconsentModal";

interface ChatViewProps {
  initialThreadId?: Id<"agentThreads">;
}

export function ChatView({ initialThreadId }: ChatViewProps) {
  const [threadId, setThreadId] = useState<Id<"agentThreads"> | null>(initialThreadId ?? null);
  const router = useRouter();

  const handleThreadIdChange = useCallback(
    (nextId: Id<"agentThreads">) => {
      setThreadId(nextId);
      router.push(`/${nextId}`);
    },
    [router],
  );

  return (
    <ChatErrorBoundary>
      <ChatInteractionProvider threadId={threadId} onThreadIdChange={handleThreadIdChange}>
        <ChatViewBody threadId={threadId} />
      </ChatInteractionProvider>
    </ChatErrorBoundary>
  );
}

function ChatViewBody({ threadId }: { threadId: Id<"agentThreads"> | null }) {
  const { sendMessage } = useChatInteraction();
  const [isLoading, setIsLoading] = useState(false);
  const [optimisticPrompt, setOptimisticPrompt] = useState<string | null>(null);
  const [banner, setBanner] = useState<ChatBannerState | null>(null);
  const [reconsent, setReconsent] = useState<{ plaidItemId: string } | null>(null);

  // W2 emits a role: "system" row during provider outages (W2 §15.2 / §17.2).
  // Treat the most recent system row as an llm_down signal.
  const messages = useQuery(api.agent.threads.listMessages, threadId ? { threadId } : "skip");
  useEffect(() => {
    const systemRow = messages
      ?.filter((m) => m.role === "system")
      .find((m) => /temporarily unavailable/i.test(m.text ?? ""));
    if (systemRow) setBanner({ kind: "llm_down" });
  }, [messages]);

  const translate = (err: unknown): AgentError | null => {
    if (err instanceof TypedAgentError) return err.data;
    // ConvexError from proposal mutations may carry `.data.kind` matching AgentError.
    const data = (err as { data?: { kind?: string } })?.data;
    if (data?.kind === "reconsent_required") {
      const plaidItemId = (err as { data: { plaidItemId: string } }).data.plaidItemId;
      return { kind: "reconsent_required", plaidItemId };
    }
    if (data?.kind === "first_turn_guard") return { kind: "first_turn_guard" };
    if (data?.kind === "proposal_timed_out") return { kind: "proposal_timed_out" };
    if (data?.kind === "proposal_invalid_state") return { kind: "proposal_invalid_state" };
    return null;
  };

  const routeError = (err: unknown) => {
    const typed = translate(err);
    if (!typed) {
      console.error("[ChatView] unexpected error", err);
      return;
    }
    switch (typed.kind) {
      case "rate_limited":
      case "budget_exhausted":
      case "llm_down":
        setBanner(typed);
        return;
      case "reconsent_required":
        setReconsent({ plaidItemId: typed.plaidItemId });
        return;
      case "first_turn_guard":
      case "proposal_timed_out":
      case "proposal_invalid_state":
        // These surface via inline components (ToolErrorRow, ProposalConfirmCard state).
        // No global banner; the reactive row already reflects the state.
        console.info("[ChatView]", typed.kind);
        return;
    }
  };

  const handleSend = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setOptimisticPrompt(trimmed);
    setBanner(null);
    try {
      await sendMessage(trimmed);
    } catch (err) {
      routeError(err);
      setOptimisticPrompt(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessagesLoaded = () => {
    if (threadId) setOptimisticPrompt(null);
  };

  return (
    <ChatContainer>
      {banner && <ChatBanner state={banner} onDismiss={() => setBanner(null)} />}
      {!threadId && !optimisticPrompt ? (
        <ChatHome onSend={handleSend} />
      ) : (
        <MessageList
          threadId={threadId}
          optimisticPrompt={optimisticPrompt}
          onMessagesLoaded={handleMessagesLoaded}
        />
      )}
      <MessageInput onSend={handleSend} isLoading={isLoading} />
      {reconsent && (
        <ReconsentModal plaidItemId={reconsent.plaidItemId} onDismiss={() => setReconsent(null)} />
      )}
    </ChatContainer>
  );
}
```

### Step 3: Create ChatBanner (3 variants per spec §8)

- [ ] **3.1 Create** `apps/app/src/components/chat/ChatBanner.tsx`:

```tsx
"use client";

import Link from "next/link";
import { AlertCircle, Clock, Zap, XClose } from "@untitledui/icons";

export type ChatBannerState =
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "budget_exhausted" }
  | { kind: "llm_down" };

interface ChatBannerProps {
  state: ChatBannerState;
  onDismiss: () => void;
}

export function ChatBanner({ state, onDismiss }: ChatBannerProps) {
  const content = (() => {
    switch (state.kind) {
      case "rate_limited":
        return {
          icon: <Clock className="size-4" />,
          text: `Slow down. Retry in ${state.retryAfterSeconds}s.`,
          link: null,
        };
      case "budget_exhausted":
        return {
          icon: <AlertCircle className="size-4" />,
          text: "Monthly budget reached.",
          link: { href: "/settings/billing", label: "Upgrade in Settings" },
        };
      case "llm_down":
        return {
          icon: <Zap className="size-4" />,
          text: "Assistant is offline. Retrying...",
          link: null,
        };
    }
  })();

  return (
    <div role="status" className="flex items-center gap-2 border-b border-secondary bg-warning-primary px-4 py-2 text-sm text-warning-primary-fg">
      {content.icon}
      <span>{content.text}</span>
      {content.link && (
        <Link href={content.link.href} className="ml-2 underline">
          {content.link.label}
        </Link>
      )}
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="ml-auto rounded p-1 hover:bg-warning-secondary">
        <XClose className="size-4" />
      </button>
    </div>
  );
}
```

Token names (`bg-warning-primary`, `text-warning-primary-fg`, `hover:bg-warning-secondary`) must exist in SmartPockets' Tailwind config. Verify by grepping an existing banner or alert component; if tokens differ, substitute.

### Step 4: Create ReconsentModal

- [ ] **4.1 Create** `apps/app/src/components/chat/ReconsentModal.tsx`:

```tsx
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
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
```

### Step 5: Upgrade ThreadItem with hover actions

- [ ] **5.1 Replace** the T-3 stub at `apps/app/src/components/chat/ThreadItem.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { MoreHorizontal } from "@untitledui/icons";
import { Dropdown } from "@repo/ui/untitledui/base/dropdown/dropdown";
import { truncate } from "@/utils/truncate";

interface ThreadItemProps {
  threadId: string;
  title: string;
}

export function ThreadItem({ threadId, title }: ThreadItemProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const rename = useMutation(api.agent.threads.renameThread);
  const remove = useMutation(api.agent.threads.deleteThread);

  const handleRenameCommit = async () => {
    setEditing(false);
    if (value.trim() && value.trim() !== title) {
      await rename({ threadId, title: value.trim() });
    }
  };

  const handleDelete = async () => {
    if (confirm(`Delete thread "${title}"?`)) {
      await remove({ threadId });
    }
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleRenameCommit}
        onKeyDown={(e) => {
          if (e.key === "Enter") void handleRenameCommit();
          if (e.key === "Escape") { setValue(title); setEditing(false); }
        }}
        className="w-full rounded bg-transparent text-sm text-primary focus:outline-none"
      />
    );
  }

  return (
    <div className="group flex items-center justify-between gap-2">
      <span className="flex-1 truncate text-sm">{truncate(title, 40)}</span>
      <Dropdown.Root>
        <Dropdown.Trigger className="opacity-0 transition-opacity group-hover:opacity-100">
          <MoreHorizontal className="size-4 text-quaternary" />
        </Dropdown.Trigger>
        <Dropdown.Menu>
          <Dropdown.Item onClick={() => setEditing(true)}>Rename</Dropdown.Item>
          <Dropdown.Item onClick={handleDelete}>Delete</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Root>
    </div>
  );
}
```

Note: the `Dropdown` import path and API must be confirmed against `packages/ui/src/components/untitledui/base/dropdown/`. Adapt to match the real component signature discovered there.

### Step 6: Remove the `as any` cast from sidebar

- [ ] **6.1 Edit** `apps/app/src/components/application/dashboard-sidebar.tsx`: replace `useQuery(api.agent.threads.listForUser as any, {})` with the plain typed call now that CA-4 is landed:

```tsx
const threadsResult = useQuery(api.agent.threads.listForUser, {});
```

### Step 7: Register the proposal fallback (if W3 has shipped)

- [ ] **7.1 If** W3 has shipped `ProposalConfirmCard`, confirm that `apps/app/src/components/chat/tool-results/registry.ts` exports the populated registry plus a non-null `proposalFallback` (W3 owns the module at this point; W1 has no edit to make). If not, leave `proposalFallback` as `null`; `ToolCallDisplay` continues to handle `propose_*` results via the renderer fallback. Coordinate with W3 at this point.

Verification snippet (read-only; confirm in W3's module):

```ts
// apps/app/src/components/chat/tool-results/registry.ts (post-W3)
export const proposalFallback: FC<ToolResultComponentProps> = ProposalConfirmCard;
```

### Step 8: Verify

- [ ] **8.1 Typecheck and build:**

```bash
bun typecheck && bun build --filter=@repo/app
```

- [ ] **8.2 Manual smoke** against W2 dev backend:
  - New prompt at `/` issues `POST /api/agent/send` via the provider; response lands; `router.push(/${threadId})` fires; reactive rows stream in.
  - Assistant row renders with `useSmoothText`; tool rows render through `ToolResultRenderer` with the right state transitions (input-streaming skeleton, output-available component, output-error row).
  - A deliberately triggered proposal renders `ProposalConfirmCard` if W3 has shipped; otherwise `ToolCallDisplay` fallback. Confirm calls CA-9; Cancel calls CA-10; Esc duplicates Cancel.
  - Force each banner error: rate limit by spamming `/api/agent/send`; budget exhaustion by lowering the W2 budget in Convex dev env vars; `llm_down` by inserting a system row via Convex dashboard.
  - Force reconsent: trigger a Plaid tool with a mocked `{ kind: "reconsent_required", plaidItemId }` in W2; confirm modal shows and links to `/settings/institutions`.
  - Rename a thread from the sidebar; verify the title updates.
  - Delete a thread from the sidebar; verify it disappears.

### Step 9: Commit

- [ ] **9.1 Graphite:**

```bash
gt create feat/agentic-home/W1-live-agent -m "feat(chat): wire error UX + thread actions on top of provider"
```

Commit body:

```
feat(chat): wire error UX + thread actions on top of provider

Extend ChatInteractionProvider sendMessage to translate 401 / 429
responses into a TypedAgentError (CA-12). ChatView catches the typed
kind and routes to ChatBanner variants rate_limited / budget_exhausted
/ llm_down (the last also fires on a system-row match per W2 §15.2).
ReconsentModal handles reconsent_required from ConvexError payloads
on proposal mutations. Upgrade ThreadItem with rename (CA-5) and
delete (CA-6) hover actions. Remove the temporary as-any cast from the
sidebar threads query (CA-4). W3's populated proposalFallback drops in
without a W1 edit when W3 lands.

Refs: LIN-TBD (W1 T-5)

Co-Authored-By: Claude <noreply@anthropic.com>
```

- [ ] **9.2 Submit:**

```bash
gt submit --stack
```

### Acceptance checklist

- [ ] Live prompt at `/` issues `POST /api/agent/send`, returns `{ threadId, messageId }`, and `router.push` navigates.
- [ ] 3 `ChatBanner` variants (`rate_limited`, `budget_exhausted`, `llm_down`) render with correct copy.
- [ ] `ReconsentModal` renders for `reconsent_required` with Plaid item ID and link.
- [ ] `first_turn_guard`, `proposal_timed_out`, `proposal_invalid_state` render inline (ToolErrorRow / ProposalConfirmCard state); no banner.
- [ ] Thread rename (CA-5) and delete (CA-6) work from the sidebar dropdown.
- [ ] Sidebar `as any` cast on `api.agent.threads.listForUser` removed.
- [ ] Proposal fallback populated by W3 if W3 shipped; otherwise fallback stays null and `ToolCallDisplay` handles propose rows via the renderer fallback.
- [ ] Undo button on `ProposalConfirmCard` routes to CA-15 `api.agent.proposals.undo` via the provider.
- [ ] `bun typecheck`, `bun build --filter=@repo/app`, `bun lint` pass.
- [ ] CA-1, CA-3, CA-3a, CA-3b, CA-4, CA-5, CA-6, CA-9, CA-10, CA-11, CA-12, CA-13, CA-15, CA-16 verified against W2 / contracts doc.
- [ ] CodeRabbit review clean.
- [ ] Cross-agent review: Codex reviews this Claude Code-landed PR.
- [ ] No em-dashes.

---

## Task T-6: Polish and acceptance

**Recommended agent:** Codex for the mechanical polish steps (T-6.1, T-6.3); Claude Code for the accessibility audit (T-6.4) and the optional lint rule (T-6.2).
**Linear issue:** LIN-TBD (W1 T-6 Polish and acceptance)

### T-6.1: Deep-link audit (Codex)

- [ ] **1.1 Grep** `apps/app` and `apps/web` for problematic patterns:

```bash
grep -rn 'href="/"' apps/app apps/web --include='*.tsx' --include='*.ts'
grep -rn '"/\b' apps/app apps/web --include='*.tsx' --include='*.ts' | head -50
grep -rni 'dashboard' apps/app apps/web --include='*.tsx' --include='*.ts' | grep -v node_modules
```

- [ ] **1.2 For each hit**, decide whether the intent is "home" (leave at `/`), "dashboard" (rewrite to `/overview`), or "label only" (rename label to "Home"). Apply edits.

- [ ] **1.3 Typecheck and build:** `bun typecheck && bun build`.

- [ ] **1.4 Commit** via `gt create feat/agentic-home/W1-link-audit` with a clear message.

### T-6.2: Reserved-slug lint rule (Claude Code, MANDATORY)

Mandatory per spec §6.3 and contracts §1.4. Ships as a dedicated PR in the stack.

- [ ] **2.1 Create** `apps/app/scripts/verify-reserved-slugs.mjs`:

```js
#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL(".", import.meta.url).pathname;
const APP_DIR = join(ROOT, "..", "src", "app", "(app)");
const GUARD_PATH = join(APP_DIR, "[threadId]", "page.tsx");

// Directories under (app)/ that are NOT user-facing top-level routes:
// [threadId] is the catch-all; sign-in, sign-up are Clerk grouped routes.
const SKIP = new Set(["[threadId]", "sign-in", "sign-up"]);

const source = readFileSync(GUARD_PATH, "utf8");
const match = source.match(/RESERVED_SLUGS\s*=\s*new Set\(\s*\[([\s\S]*?)\]\s*\)/);
if (!match) {
  console.error("verify-reserved-slugs: could not find RESERVED_SLUGS in", GUARD_PATH);
  process.exit(2);
}
const declared = new Set(
  [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
);

const directories = readdirSync(APP_DIR)
  .filter((name) => {
    if (SKIP.has(name)) return false;
    if (name.startsWith(".")) return false;
    const full = join(APP_DIR, name);
    if (!statSync(full).isDirectory()) return false;
    // Only dirs that contain a page.tsx (or nested route group).
    try {
      const entries = readdirSync(full);
      return entries.some((e) => e === "page.tsx" || e === "layout.tsx");
    } catch {
      return false;
    }
  });

const missingFromGuard = directories.filter((d) => !declared.has(d));
const extrasInGuard = [...declared].filter((d) => !directories.includes(d) && !SKIP.has(d));

if (missingFromGuard.length || extrasInGuard.length) {
  console.error("verify-reserved-slugs: RESERVED_SLUGS out of sync with (app)/ directories");
  if (missingFromGuard.length) console.error("  missing from guard:", missingFromGuard);
  if (extrasInGuard.length) console.error("  present in guard but no route:", extrasInGuard);
  console.error("Fix by editing RESERVED_SLUGS in", GUARD_PATH);
  process.exit(1);
}

console.log("verify-reserved-slugs: OK (", directories.length, "routes )");
```

- [ ] **2.2 Add** the script to `apps/app/package.json`:

```jsonc
{
  "scripts": {
    "dev": "next dev --turbopack -p 3000 --hostname 0.0.0.0",
    "build": "next build",
    "start": "next start",
    "clean": "rm -rf .next .turbo node_modules",
    "typecheck": "tsc --noEmit",
    "verify:slugs": "node scripts/verify-reserved-slugs.mjs",
    "lint": "next lint && bun run verify:slugs"
  }
}
```

(Adjust the `lint` chain if the repo uses a different lint orchestrator. Goal: `bun lint` fails the CI build if the guard drifts from the route directory list.)

- [ ] **2.3 Verify** the script fails on a deliberate drift:
  - Temporarily add a `promos` route: `mkdir apps/app/src/app/\(app\)/promos && echo "export default () => null" > apps/app/src/app/\(app\)/promos/page.tsx`.
  - Run `bun run --filter=@repo/app verify:slugs`. Expect exit code 1.
  - Delete the `promos` directory.
  - Re-run. Expect OK.

- [ ] **2.4 Commit** via:

```bash
gt create feat/agentic-home/W1-reserved-lint -m "feat(app): mandatory reserved-slug lint guard for /[threadId] catch-all"
```

Commit body:

```
feat(app): mandatory reserved-slug lint guard for /[threadId] catch-all

Per contracts §1.4 the RESERVED_SLUGS set in [threadId]/page.tsx must
stay in sync with the top-level (app)/ route directories. A deliberate
drift test confirms the script fails loud and points at the guard
file. Wires into bun lint so CI blocks any new route that forgets to
update the guard.

Refs: LIN-TBD (W1 T-6.2)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### T-6.3: Mobile smoke and accessibility QA (Codex + Claude Code)

- [ ] **3.1 Codex smoke** on mobile Safari (iOS) and Android Chrome:
  - `/` loads; composer focuses; soft keyboard does not cover the input (test with suggested Tailwind `pb-[env(safe-area-inset-bottom)]` if needed).
  - Enter sends; Shift+Enter newlines (if available on the virtual keyboard).
  - Tap a chip: optimistic state appears.
  - Sidebar opens on mobile (confirm the mobile variant renders the History item).

- [ ] **3.2 Claude Code accessibility audit:**
  - Tab through the empty state; tab order is logo, headline, chips, composer, sidebar (in reading order).
  - Arrow keys through chips work (if they are focusable; otherwise ship a fix to make chip buttons focusable).
  - Screen reader announces new assistant text via `aria-live="polite"` on `MessageList`.
  - Proposal cards when rendered by W3 trap focus and announce Esc shortcut.
  - Colour contrast check against WCAG AA on banner variants and chat bubbles.

- [ ] **3.3 Commit** each fix via separate `gt create` branches or bundle into a single `feat/agentic-home/W1-a11y` PR with a summarised commit message.

### T-6.4: Final acceptance run (Claude Code)

- [ ] **4.1 Run** the entire A1 through A18 checklist from `specs/W1-chat-home.md` Section 15.

- [ ] **4.2 Update** the Linear issue with screenshots and a Pass/Fail per acceptance criterion.

- [ ] **4.3 If every item passes**, flip the Linear issue to Done and coordinate with Eric for the merge of the whole W1 stack.

### Acceptance checklist (entire T-6)

- [ ] Deep-link audit complete; any hits fixed.
- [ ] Optional lint rule decision recorded; rule shipped or deferred with rationale.
- [ ] Mobile smoke passed on iOS Safari and Android Chrome.
- [ ] Accessibility audit passed against WCAG AA for the chat surfaces W1 owns.
- [ ] A1 through A18 all green.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review on every PR in the stack.
- [ ] Linear M3 sub-project W1 closed.
- [ ] No em-dashes anywhere in the stack.

---

## Self-review (plan-writer pass)

- **Spec coverage:** Every section of `specs/W1-chat-home.md` maps to at least one plan task. Section 5 (file tree) → T-1, T-2, T-3. Section 6 (routing) → T-2. Section 7 (state machine) → T-3 (rendering) + T-5 (wiring). Section 8 (error UX) → T-5. Section 9 (SSR/RSC) → T-2. Section 10 (deep-link audit) → T-6.1. Section 11 (deps) → T-3.1. Section 12 (security) → T-3 (sanitizer), T-5 (error handling). Section 13 (a11y/perf) → T-3 + T-6.3. Section 14 (contracts) → flagged per task. Section 15 acceptance → T-6.4.
- **Placeholder scan:** no "TODO / TBD / implement later" in code blocks. The only `TBD` is in Linear issue IDs, which is intentional per master-prompt Section 7.
- **Type consistency:** `ChatBannerState` is defined in T-5 Step 2.1 and consumed in T-5 Step 1.1. `ToolResultComponentProps` defined in T-3 Step 5.1; consumed in T-3 Step 5.2 and Step 5.3. `ThreadItemProps` consistent across T-3 and T-5. Nothing named in a later task is missing from an earlier task.

---

## Execution handoff options

Plan is complete and saved to `specs/W1-chat-home.plan.md`. Two execution options per the writing-plans skill:

1. **Subagent-Driven (recommended for this plan)** - Fresh Claude Code or Codex session per task group (T-0 through T-6) in the worktree at `~/Developer/smartpockets-W1-chat`. Two-stage review: agent lands the PR, cross-agent reviews before merge. Master-prompt Section 11 rule: CodeRabbit reviews every PR.
2. **Inline Execution** - Open the worktree in this session and execute T-0 through T-6 inline with checkpoints at each task's commit step.

Per master-prompt Section 6, **subagent-driven is the canonical path** because W1 is a multi-PR Graphite stack that maps directly to the parallel-worktree model. Inline execution is acceptable for solo days.

---

**End of W1 plan.**
