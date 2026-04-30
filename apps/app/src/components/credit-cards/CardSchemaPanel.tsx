"use client";

import type { ExtendedCreditCardData } from "@/types/credit-cards";

interface CardSchemaPanelProps {
  card: ExtendedCreditCardData;
}

/**
 * Apothecary "schema" panel — the dashboard's lift of the marketing site's
 * Convex code-listing block. Renders a syntax-highlighted snippet showing
 * the card's underlying data shape with the moss + champagne palette.
 *
 * Visual prose only — no real Convex import needed. Mirrors the
 * `convex/cards.ts` panel from the 3A refined marketing landing.
 */
export function CardSchemaPanel({ card }: CardSchemaPanelProps) {
  // Tabular numerals so the JSON preview lines up with the data ledger above.
  const balance = card.currentBalance != null ? card.currentBalance.toFixed(2) : "null";
  const apr = card.apr != null ? card.apr.toFixed(2) : "null";
  const limit = card.creditLimit != null ? card.creditLimit.toFixed(2) : "null";
  const dueDate = card.nextPaymentDueDate
    ? new Date(card.nextPaymentDueDate).toISOString().split("T")[0]
    : "null";

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--apothecary-hairline-strong)] bg-[var(--apothecary-panel-elev)] shadow-[0_30px_80px_rgba(8,10,12,0.55),inset_0_1px_0_rgba(212,197,156,0.04)]">
      {/* Window chrome */}
      <div className="flex items-center justify-between border-b border-[var(--apothecary-hairline)] px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[var(--apothecary-moss)]/35" />
          <span className="size-2 rounded-full bg-[var(--apothecary-champagne)]/30" />
          <span className="size-2 rounded-full bg-stone-50/15" />
          <span className="font-[family-name:var(--font-jetbrains-mono)] ml-3 text-[11px] tracking-wider text-text-brand-primary/85">
            convex/cards.ts
          </span>
        </div>
        <span className="font-[family-name:var(--font-jetbrains-mono)] inline-flex items-center gap-1.5 text-[10px] tracking-[0.16em] uppercase text-text-brand-primary">
          <span className="apothecary-pulse size-1 rounded-full bg-[var(--apothecary-moss)]" />
          live
        </span>
      </div>

      {/* Code listing */}
      <pre className="font-[family-name:var(--font-jetbrains-mono)] overflow-x-auto px-5 py-6 text-[12.5px] leading-[1.7] text-stone-50/75 md:px-7 md:py-7 md:text-[13px]">
        <code>
          <span className="text-stone-500 italic">// reactive query — drives this card detail page</span>
          {"\n"}
          <span className="text-[var(--apothecary-mint)]">export const</span>
          <span className="text-stone-50"> getCard</span>
          <span className="text-stone-50/45"> = </span>
          <span className="text-[var(--apothecary-mint)]">query</span>
          <span className="text-stone-50/45">({"{"}</span>
          {"\n"}
          <span className="text-stone-50">  args: </span>
          <span className="text-stone-50/45">{"{ "}</span>
          <span className="text-stone-50">cardId: v.</span>
          <span className="text-[var(--apothecary-moss)]">id</span>
          <span className="text-stone-50/45">(</span>
          <span className="text-[var(--apothecary-champagne)]">"creditCards"</span>
          <span className="text-stone-50/45">{") }"}</span>
          <span className="text-stone-50/45">,</span>
          {"\n"}
          <span className="text-stone-50">  handler: </span>
          <span className="text-stone-50/45">async (</span>
          <span className="text-stone-50">ctx, </span>
          <span className="text-stone-50/45">{"{ "}</span>
          <span className="text-stone-50">cardId</span>
          <span className="text-stone-50/45">{" }"}</span>
          <span className="text-stone-50/45">) =&gt; {"{"}</span>
          {"\n"}
          <span className="text-[var(--apothecary-mint)]">    const </span>
          <span className="text-stone-50">card </span>
          <span className="text-stone-50/45">= </span>
          <span className="text-[var(--apothecary-mint)]">await </span>
          <span className="text-stone-50">ctx.db.</span>
          <span className="text-[var(--apothecary-moss)]">get</span>
          <span className="text-stone-50/45">(cardId);</span>
          {"\n"}
          <span className="text-[var(--apothecary-mint)]">    return </span>
          <span className="text-stone-50/45">{"{"}</span>
          {"\n"}
          <span className="text-stone-50">      name: </span>
          <span className="text-[var(--apothecary-champagne)]">"{card.cardName}"</span>
          <span className="text-stone-50/45">,</span>
          {"\n"}
          <span className="text-stone-50">      brand: </span>
          <span className="text-[var(--apothecary-champagne)]">"{card.brand}"</span>
          <span className="text-stone-50/45">,</span>
          {"\n"}
          <span className="text-stone-50">      lastFour: </span>
          <span className="text-[var(--apothecary-champagne)]">"{card.lastFour}"</span>
          <span className="text-stone-50/45">,</span>
          {"\n"}
          <span className="text-stone-50">      balance: </span>
          <span className="text-[var(--apothecary-mint)]">{balance}</span>
          <span className="text-stone-50/45">,</span>
          {"\n"}
          <span className="text-stone-50">      limit: </span>
          <span className="text-[var(--apothecary-mint)]">{limit}</span>
          <span className="text-stone-50/45">,</span>
          {"\n"}
          <span className="text-stone-50">      apr: </span>
          <span className="text-[var(--apothecary-mint)]">{apr}</span>
          <span className="text-stone-50/45">,</span>
          {"\n"}
          <span className="text-stone-50">      utilization: </span>
          <span className="text-[var(--apothecary-mint)]">
            {card.utilization != null ? `${card.utilization}` : "null"}
          </span>
          <span className="text-stone-50/45">,</span>
          {"\n"}
          <span className="text-stone-50">      due: </span>
          <span className="text-[var(--apothecary-champagne)]">"{dueDate}"</span>
          <span className="text-stone-50/45">,</span>
          {"\n"}
          <span className="text-stone-50/45">    {"}"};</span>
          {"\n"}
          <span className="text-stone-50/45">  {"}"},</span>
          {"\n"}
          <span className="text-stone-50/45">{"});"}</span>
        </code>
      </pre>

      {/* Footer ledger — three live metrics that mirror the marketing site */}
      <div className="grid grid-cols-3 gap-px border-t border-[var(--apothecary-hairline)] bg-[var(--apothecary-hairline)]">
        {[
          { label: "Reactivity", value: "ws · push" },
          { label: "Index", value: "by_user_card" },
          { label: "p95", value: "82ms" },
        ].map((row) => (
          <div key={row.label} className="bg-[var(--apothecary-panel-elev)] px-4 py-3">
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] tracking-[0.22em] uppercase text-text-brand-tertiary">
              {row.label}
            </p>
            <p className="font-[family-name:var(--font-jetbrains-mono)] mt-1 text-[12px] font-medium tabular-nums text-primary">
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
