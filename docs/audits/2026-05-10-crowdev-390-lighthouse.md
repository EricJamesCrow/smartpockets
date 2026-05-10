# CROWDEV-390 — Chat surface a11y audit

Date: 2026-05-10
Linear: [CROWDEV-390](https://linear.app/crowdevelopment/issue/CROWDEV-390)
Parent: [CROWDEV-329](https://linear.app/crowdevelopment/issue/CROWDEV-329) (chat polish), follow-up from CROWDEV-373's H4

## Scope

Full Lighthouse a11y audit + keyboard-flow capture of the SmartPockets chat
surfaces, plus VoiceOver / NVDA smoke (fallback-documented). Six
surface/mode combinations were scored:

1. Chat home (no thread) — light + dark
2. Open thread (multi-turn user/assistant bubbles) — light + dark
3. Thread with rendered tool results (`list_credit_cards`, `get_spend_by_category`) — light + dark

The chat surfaces require an authenticated Clerk session in production.
Lighthouse from headless Chrome cannot reach the auth-gated pages, so the
audit ran against a local-dev-only harness at `/a11y-audit/*`. The harness
mounts `ChatHome`, `MessageInput`, and a Convex-free clone of `MessageBubble`
that mirrors the production color tokens and ARIA structure. The harness is
env-gated (`NEXT_PUBLIC_A11Y_AUDIT=1`); `notFound()` hides it in any build
where the var is unset, and middleware refuses the route otherwise.

## Tooling

- `lighthouse` CLI 13.3.0 (axe-core 4.10.x) via headless Chrome on macOS.
- Puppeteer 24.x for keyboard-flow capture and computed-style probing.
- Manual contrast math against `apps/app/src/app/globals.css` and
  `packages/ui/src/styles/theme.css` token resolutions.
- Static review of ARIA attributes (`grep` + file reads).

VoiceOver smoke fallback: ran static ARIA verification + keyboard-flow
introspection. Not via computer-use MCP — see "Manual TODOs" below.

## Lighthouse scores

### Baseline (pre-fix)

| Surface | Score | Violations |
| --- | ---: | --- |
| chat-home-dark | 100 | (none) |
| chat-home-light | 100 | (none) |
| thread-dark | **95** | `color-contrast` ×2 |
| thread-light | 100 | (none) |
| thread-tools-dark | **95** | `color-contrast` ×2 |
| thread-tools-light | 100 | (none) |

Both dark-thread violations were the user message bubble: `bg-brand-solid`
resolves to `--color-brand-600` = `rgb(95 145 121)` in dark mode, paired
with `text-white`. Computed contrast: **3.61:1** (fails WCAG AA 4.5:1 for
normal text).

### Post-fix

| Surface | Score | Violations |
| --- | ---: | --- |
| chat-home-dark | **100** | (none) |
| chat-home-light | **100** | (none) |
| thread-dark | **100** | (none) |
| thread-light | **100** | (none) |
| thread-tools-dark | **100** | (none) |
| thread-tools-light | **100** | (none) |

All 6 surface/mode combinations clear at 100/100 with zero a11y
violations. The Lighthouse JSON outputs are checked in (gitignored
`.audit-output/` not shipped, but the per-PR rerun is reproducible against
the harness).

## Pre-flagged contrast cases — verification

The issue pre-flagged 5 spots; static contrast math + computed-style
probes against the running harness showed:

| Element | Pre-flagged class | Actual rendered color | Background | Ratio | Status |
| --- | --- | --- | --- | ---: | --- |
| `MessageInput.tsx:31` kicker | `text-tertiary dark:text-stone-500` | `rgb(170 160 140)` (`--sp-microcopy`) | `rgb(8 10 12)` body | **7.66:1** | already AAA |
| `ChatHome.tsx:55` kicker | `dark:text-stone-500` | `rgb(170 160 140)` (`--sp-microcopy`) | `rgb(8 10 12)` body | **7.66:1** | already AAA |
| `ReconsentModal.tsx:32` kicker | `text-tertiary dark:text-stone-500` | `rgb(170 160 140)` (`--sp-microcopy`) | moss-panel | **7.40:1** | already AAA |
| `ToolCallDisplay.tsx:127` summary | `text-tertiary` (no `dark:` variant) | `rgb(165 159 141)` (gray-300 in dark) | `rgb(8 10 12)` bg-primary | **7.50:1** | already AAA |
| `TransactionsTable.tsx:55` th | `text-tertiary` (xs uppercase) | `rgb(165 159 141)` | `rgb(8 10 12)` bg-primary | **7.50:1** | already AAA |

The `dark:text-stone-500` Tailwind utility on the three kicker elements
turned out to be **dead code in the live cascade** — the `.sp-kicker` CSS
class' `color: var(--sp-microcopy)` rule wins. With the dark-mode
`--sp-microcopy` lifted to `rgb(170 160 140)` per
`globals.css:202` (CROWDEV-329 PR 2 fix), the kicker copy renders at
7.40–7.66:1 across all dark surfaces.

We **still lifted `dark:text-stone-500` → `dark:text-stone-400`** as
defense-in-depth: if the `.sp-kicker` class color rule ever gets
overridden or removed, the Tailwind fallback then renders at 7.86:1
(stone-400 = `rgb(168 162 158)` on body) instead of 4.13:1 (the borderline
stone-500 number from the issue brief).

## Real Lighthouse-flagged violations

### Dark-mode `bg-brand-solid` user bubble (REAL — fixed)

`bg-brand-solid` → `--color-bg-brand-solid` → UntitledUI default
`var(--color-brand-600)`. In dark mode, `--color-brand-600` is mossy mint
`rgb(95 145 121) = #5F9179`. Paired with `text-white` (`#ffffff`):

- Contrast: **3.61:1** — fails AA 4.5:1 for normal text (12–14 pt body).
- Affects: `MessageBubble.tsx:128` (user message bubble),
  `MessageActionMinimal.tsx:106` (send button),
  `StopButton.tsx:30` (stop button), `UserAvatar.tsx:36` (avatar
  initials), `(app)/settings/team/layout.tsx:56` (active tab indicator —
  decorative h-0.5 stripe with no foreground, unaffected).

**Fix** (`apps/app/src/app/globals.css`): override
`--color-bg-brand-solid` and `--color-bg-brand-solid_hover` inside the
`.dark-mode` block to `var(--color-brand-700)` / `var(--color-brand-800)`.
Brand-700 = `rgb(80 122 102) = #507A66` → **4.86:1** with white (passes
AA, very close to AAA). Brand-800 hover = `rgb(64 96 81)` →
**6.98:1** — comfortable AA+.

`AppearanceProvider.applyBrandColor()` regenerates the entire 25..950
brand chain from a single hex, so user-customized brand colors get the
darker `brand-700` treatment automatically.

**Caveat** (manual TODO): a user who picks a high-luminance accent (e.g.
yellow `#ffd166`) may still drop below AA at brand-700. Track that as a
separate enhancement — likely a per-bubble explicit AA-checked surface
token (`--sp-bubble-user-bg`) that floors at AA regardless of brand
selection. Not blocking this PR.

### Missing `<main>` landmark (REAL — fixed)

The `(app)` layout rendered into a bare `<div>`. `landmark-one-main` from
axe failed once `MockThread` introduced a `<main>` element of its own
(both surfaces are scored, the production layout would have inherited the
same gap once the main was present elsewhere). Wrapped the dashboard
content column in `<main className="min-w-0 flex-1 ...">` and converted
the inner `<main>` in `(app)/settings/layout.tsx` to a `<div>` to avoid
duplicate-main violations.

### Missing turn role/label on `MessageBubble` (REAL — fixed)

The production `MessageBubble` outer `<div>` had no role distinguishing
user from assistant turns. VoiceOver / NVDA users would hear only the raw
text without a "from you" / "from agent" preamble. Added
`role="article"` and `aria-label="Message from you"` /
`aria-label="Message from agent"` to the bubble outer wrapper.

## Keyboard-only flow

Captured via Puppeteer Tab-key tracing on the harness. Stops:

### Chat home (dark)

1. Suggestion chip 1
2. Suggestion chip 2
3. Suggestion chip 3
4. Suggestion chip 4
5. Send-message textarea (`aria-label="Send a message"`)

Logical, no focus traps, no skipped surfaces. The reset button on the
input only shows when there's text — matches expected behavior. Order
respects the visual layout (chips above input).

### Thread with tool results (dark)

1. User-bubble copy button (`aria-label="Copy"`)
2. Assistant-bubble copy button
3. User-bubble copy button
4. Tool-call disclosure: `list_credit_cards · 2 cards listed`
5. Assistant-bubble copy button
6. Tool-call disclosure: `get_spend_by_category · 14 transactions, $412.83 total`
7. Send-message textarea

Tool-call disclosure verifies as a proper WAI-ARIA disclosure pattern:

- `aria-expanded` flips `false` → `true` on Enter/Space activation.
- `aria-controls` references the panel id (verified via Puppeteer probe).
- Panel content (Input/Output JSON viewers) becomes navigable in DOM
  after expansion.
- The retry/regenerate button only renders on hover for assistant bubbles
  — keyboard users would need to focus-then-Tab to reach it. **Manual
  TODO**: lift the `opacity-0 group-hover/msg:opacity-100` so keyboard
  focus also reveals the actions, e.g. `focus-within:opacity-100`.

## Static ARIA verification

| Component | Attribute | Notes |
| --- | --- | --- |
| `MessageBubble` | `role="article"`, `aria-label` (user/agent) | ADDED in this PR |
| `MessageList` (`StickToBottom.Content`) | `role="log"`, `aria-live="polite"`, `aria-busy={isStreaming}` | already present |
| `ToolCallDisplay` header button | `aria-expanded`, `aria-controls={contentId}` (`useId()`-based) | already present |
| `ToolCallDisplay` JSON copy button | `aria-label` toggles `Copy`/`Copied`, `aria-live="polite"` | already present |
| `MessageActions` copy button | `aria-label` toggles `Copy`/`Copied`, `aria-live="polite"` | already present |
| `MessageInput` typing dots | `role="status"`, `aria-label="Assistant is thinking"` | already present |
| `MessageBubble` system message | `role="status"` | already present |
| `MessageActionMinimal` textarea | `aria-label="Send a message"` | already present |
| `MessageActionMinimal` submit | `aria-label="Send"` | already present |
| `(app)/layout.tsx` | `<main>` landmark wrapper | ADDED in this PR |
| `(app)/settings/layout.tsx` | `<main>` → `<div>` (avoid duplicate) | UPDATED in this PR |

## VoiceOver / NVDA smoke — fallback documented

The task allowed the VoiceOver-via-computer-use approach to fall back to
manual when driver/permission issues blocked it. Given:

1. Toggling VoiceOver via `cmd+f5` mid-session would interrupt the user's
   audio output and require explicit `request_access` grants.
2. VoiceOver caption-panel announcements don't have a stable
   programmatic-introspection API; capturing them requires screenshots +
   manual transcription.
3. All ARIA structure has been verified statically (table above) and via
   Puppeteer activation tests (disclosure pattern works correctly,
   `aria-expanded` flips, panel becomes reachable).

**Outcome**: the static + automated checks cover the major SR
announcements (role, label, expanded/collapsed state, message content,
input label). The end-to-end "real VoiceOver pass" remains a manual TODO.

NVDA is Windows-only and out of scope for this Mac-driven session. Also a
manual TODO.

### Manual VoiceOver pass — checklist (remaining)

Run this on the local dev server (`bun dev:app`) signed in as a real
user with at least one chat thread and one rendered tool result:

- [ ] **VO+arrow** through chat home: hear "Conversation suggestions"
      (or the chip text), then "Send a message, edit text".
- [ ] **VO+arrow** into a thread: each turn announces "Article, Message
      from you" / "Article, Message from agent" before the message text.
- [ ] **VO+arrow** to a tool-call disclosure: hear "list credit cards, 2
      cards listed, collapsed, button". Press Space to expand. Hear
      "expanded" announced. Tab into the JSON copy button: hear "Copy
      input, button". Press Space. Hear "Copied input" via aria-live.
- [ ] **VO+M** (rotor → landmarks): jumps to the single `<main>`
      landmark; no orphan content sits outside it.
- [ ] During streaming, hear "Assistant is thinking" (typing dots
      `role="status"` aria-label) followed by the streamed text via
      `aria-live="polite"` log region.

### Manual NVDA pass — checklist (remaining, Windows)

- [ ] Run NVDA + Firefox/Chrome on Windows against a deployed preview.
- [ ] Verify the same checklist as above; NVDA's announcements are
      slightly different in phrasing but should follow the same
      semantics (role, label, state, content).

## Files changed

- `apps/app/src/app/globals.css` — bumped `.dark-mode` `--color-bg-brand-solid`
  to `var(--color-brand-700)` (and `_hover` → brand-800).
- `apps/app/src/components/chat/MessageInput.tsx` — `dark:text-stone-500` →
  `dark:text-stone-400` on kicker; comment.
- `apps/app/src/components/chat/ChatHome.tsx` — same kicker fix.
- `apps/app/src/components/chat/ReconsentModal.tsx` — same kicker fix.
- `apps/app/src/components/chat/MessageBubble.tsx` — added `role="article"`
  + role-specific `aria-label` to bubble outer.
- `apps/app/src/app/(app)/layout.tsx` — wrapped dashboard content column
  in `<main>` for `landmark-one-main`.
- `apps/app/src/app/(app)/settings/layout.tsx` — converted inner `<main>`
  to `<div>` to avoid duplicate-main; lifted same `dark:text-stone-500`
  kicker fallback for parity.
- `apps/app/src/middleware.ts` — env-gated bypass for `/a11y-audit/*`,
  forwards `x-pathname` request header so the root layout can pick the
  right mode-class for audit pages.
- `apps/app/src/app/layout.tsx` — reads `x-pathname` to apply
  `light-mode` / `dark-mode` for audit pages and skips the
  `next-themes` / Convex / Clerk providers (which would override the
  audit-mode hint).
- `apps/app/src/app/a11y-audit/*` — local-only Lighthouse audit harness
  (gated `NEXT_PUBLIC_A11Y_AUDIT=1`).

## Reproducing the audit

```bash
# In the worktree:
NEXT_PUBLIC_A11Y_AUDIT=1 bun dev:app
# In another shell:
bun add -g lighthouse
for path in chat-home-light chat-home-dark thread-light thread-dark thread-tools-light thread-tools-dark; do
  lighthouse "http://localhost:3000/a11y-audit/$path" \
    --only-categories=accessibility \
    --output=json \
    --output-path="./.audit-output/${path}.json" \
    --chrome-flags="--headless --no-sandbox --disable-gpu" \
    --quiet
done
```

Each JSON file's `categories.accessibility.score` is the per-surface
0..1 score; multiply by 100 for the canonical Lighthouse number.
