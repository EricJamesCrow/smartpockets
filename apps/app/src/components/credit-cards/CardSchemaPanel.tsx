"use client";

import type { ExtendedCreditCardData } from "@/types/credit-cards";

interface CardSchemaPanelProps {
  card: ExtendedCreditCardData;
}

/**
 * 1B "schema" panel — port of the 3A apothecary panel into the moss + champagne
 * dashboard syntax theme. Renders a syntax-highlighted snippet showing the
 * card's underlying data shape.
 *
 * Visual prose only — no real Convex import needed. Mirrors the
 * `convex/cards.ts` panel from the marketing landing.
 *
 * Color tokens (1B):
 *   --sp-moss-mint-bright (#a3d7bf) — keywords (`export`, `query`, `args`, `return`)
 *   --sp-moss-mint        (#7fb89a) — function names + numeric literals
 *   --sp-champagne        (#d4c59c) — string literals
 *   stone-500 italic                — comments
 */
export function CardSchemaPanel({ card }: CardSchemaPanelProps) {
  const balance = card.currentBalance != null ? card.currentBalance.toFixed(2) : "null";
  const apr = card.apr != null ? card.apr.toFixed(2) : "null";
  const limit = card.creditLimit != null ? card.creditLimit.toFixed(2) : "null";
  const dueDate = card.nextPaymentDueDate
    ? new Date(card.nextPaymentDueDate).toISOString().split("T")[0]
    : "null";
  const utilization = card.utilization != null ? `${card.utilization}` : "null";

  return (
    <div className="overflow-hidden rounded-2xl border border-secondary bg-primary shadow-[var(--sp-shadow-panel)] dark:border-[var(--sp-moss-line-strong)] dark:bg-[var(--sp-moss-panel)]">
      {/* Window chrome */}
      <div className="flex items-center justify-between border-b border-secondary px-5 py-3 dark:border-[var(--sp-moss-line)]">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[var(--sp-moss-mint)]/40" />
          <span className="size-2 rounded-full bg-[var(--sp-champagne)]/35" />
          <span className="size-2 rounded-full bg-stone-50/15" />
          <span className="ml-3 font-[family-name:var(--font-geist-mono)] text-[11px] tracking-wider text-tertiary dark:text-stone-400">
            convex/cards.ts
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.16em] text-tertiary dark:text-stone-400">
          <span
            className="size-1 rounded-full bg-[var(--sp-moss-mint)] shadow-[0_0_8px_2px_rgba(127,184,154,0.5)]"
            aria-hidden="true"
          />
          live
        </span>
      </div>

      {/* Code listing */}
      <pre className="overflow-x-auto px-5 py-6 font-[family-name:var(--font-geist-mono)] text-[12.5px] leading-[1.7] text-stone-700 dark:text-stone-50/75 md:px-7 md:py-7 md:text-[13px]">
        <code>
          <span className="italic text-stone-500">// reactive query — drives this card detail page</span>
          {"\n"}
          <span className="text-[var(--sp-moss-mint-bright)]">export const</span>
          <span className="text-stone-700 dark:text-stone-50"> getCard</span>
          <span className="text-stone-500 dark:text-stone-50/45"> = </span>
          <span className="text-[var(--sp-moss-mint-bright)]">query</span>
          <span className="text-stone-500 dark:text-stone-50/45">({"{"}</span>
          {"\n"}
          <span className="text-stone-700 dark:text-stone-50">  args: </span>
          <span className="text-stone-500 dark:text-stone-50/45">{"{ "}</span>
          <span className="text-stone-700 dark:text-stone-50">cardId: v.</span>
          <span className="text-[var(--sp-moss-mint)]">id</span>
          <span className="text-stone-500 dark:text-stone-50/45">(</span>
          <span className="text-[var(--sp-champagne)]">&quot;creditCards&quot;</span>
          <span className="text-stone-500 dark:text-stone-50/45">{") }"}</span>
          <span className="text-stone-500 dark:text-stone-50/45">,</span>
          {"\n"}
          <span className="text-stone-700 dark:text-stone-50">  handler: </span>
          <span className="text-stone-500 dark:text-stone-50/45">async (</span>
          <span className="text-stone-700 dark:text-stone-50">ctx, </span>
          <span className="text-stone-500 dark:text-stone-50/45">{"{ "}</span>
          <span className="text-stone-700 dark:text-stone-50">cardId</span>
          <span className="text-stone-500 dark:text-stone-50/45">{" }"}</span>
          <span className="text-stone-500 dark:text-stone-50/45">) =&gt; {"{"}</span>
          {"\n"}
          <span className="text-[var(--sp-moss-mint-bright)]">    const </span>
          <span className="text-stone-700 dark:text-stone-50">card </span>
          <span className="text-stone-500 dark:text-stone-50/45">= </span>
          <span className="text-[var(--sp-moss-mint-bright)]">await </span>
          <span className="text-stone-700 dark:text-stone-50">ctx.db.</span>
          <span className="text-[var(--sp-moss-mint)]">get</span>
          <span className="text-stone-500 dark:text-stone-50/45">(cardId);</span>
          {"\n"}
          <span className="text-[var(--sp-moss-mint-bright)]">    return </span>
          <span className="text-stone-500 dark:text-stone-50/45">{"{"}</span>
          {"\n"}
          <span className="text-stone-700 dark:text-stone-50">      name: </span>
          <span className="text-[var(--sp-champagne)]">&quot;{card.cardName}&quot;</span>
          <span className="text-stone-500 dark:text-stone-50/45">,</span>
          {"\n"}
          <span className="text-stone-700 dark:text-stone-50">      brand: </span>
          <span className="text-[var(--sp-champagne)]">&quot;{card.brand}&quot;</span>
          <span className="text-stone-500 dark:text-stone-50/45">,</span>
          {"\n"}
          <span className="text-stone-700 dark:text-stone-50">      lastFour: </span>
          <span className="text-[var(--sp-champagne)]">&quot;{card.lastFour}&quot;</span>
          <span className="text-stone-500 dark:text-stone-50/45">,</span>
          {"\n"}
          <span className="text-stone-700 dark:text-stone-50">      balance: </span>
          <span className="text-[var(--sp-moss-mint)]">{balance}</span>
          <span className="text-stone-500 dark:text-stone-50/45">,</span>
          {"\n"}
          <span className="text-stone-700 dark:text-stone-50">      limit: </span>
          <span className="text-[var(--sp-moss-mint)]">{limit}</span>
          <span className="text-stone-500 dark:text-stone-50/45">,</span>
          {"\n"}
          <span className="text-stone-700 dark:text-stone-50">      apr: </span>
          <span className="text-[var(--sp-moss-mint)]">{apr}</span>
          <span className="text-stone-500 dark:text-stone-50/45">,</span>
          {"\n"}
          <span className="text-stone-700 dark:text-stone-50">      utilization: </span>
          <span className="text-[var(--sp-moss-mint)]">{utilization}</span>
          <span className="text-stone-500 dark:text-stone-50/45">,</span>
          {"\n"}
          <span className="text-stone-700 dark:text-stone-50">      due: </span>
          <span className="text-[var(--sp-champagne)]">&quot;{dueDate}&quot;</span>
          <span className="text-stone-500 dark:text-stone-50/45">,</span>
          {"\n"}
          <span className="text-stone-500 dark:text-stone-50/45">    {"}"};</span>
          {"\n"}
          <span className="text-stone-500 dark:text-stone-50/45">  {"}"},</span>
          {"\n"}
          <span className="text-stone-500 dark:text-stone-50/45">{"});"}</span>
        </code>
      </pre>

      {/* Footer ledger — three live metrics that mirror the marketing site */}
      <div className="grid grid-cols-3 gap-px border-t border-secondary bg-secondary dark:border-[var(--sp-moss-line)] dark:bg-[var(--sp-moss-line)]">
        {[
          { label: "Reactivity", value: "ws · push" },
          { label: "Index", value: "by_user_card" },
          { label: "p95", value: "82ms" },
        ].map((row) => (
          <div
            key={row.label}
            className="bg-primary px-4 py-3 dark:bg-[var(--sp-moss-panel)]"
          >
            <p className="font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.22em] text-tertiary dark:text-stone-500">
              {row.label}
            </p>
            <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[12px] font-medium tabular-nums text-primary">
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
