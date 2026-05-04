"use client";

import { useMemo } from "react";

const SUGGESTION_POOL = [
  // Spend
  { category: "spend", label: "What did I spend on groceries last month?" },
  { category: "spend", label: "Show my spend by category for this quarter." },
  { category: "spend", label: "Compare my dining spend to last month." },
  // Cards
  { category: "cards", label: "Show my Chase Sapphire statement." },
  { category: "cards", label: "Which card has the highest balance?" },
  { category: "cards", label: "Which card's statement is closest to closing?" },
  // Promos
  { category: "promos", label: "Which deferred-interest promo expires first?" },
  { category: "promos", label: "List my installment plans." },
  // Transactions
  { category: "tx", label: "Mark all Amazon charges as Shopping." },
  { category: "tx", label: "Find my five biggest charges this month." },
];

function pickFour(): typeof SUGGESTION_POOL {
  const byCat: Record<string, typeof SUGGESTION_POOL> = {};
  for (const s of SUGGESTION_POOL) {
    (byCat[s.category] ??= []).push(s);
  }
  const picks: typeof SUGGESTION_POOL = [];
  for (const cat of Object.keys(byCat)) {
    const arr = byCat[cat]!;
    picks.push(arr[Math.floor(Math.random() * arr.length)]!);
  }
  return picks.sort(() => Math.random() - 0.5).slice(0, 4);
}

interface ChatHomeProps {
  onSend: (message: string) => void;
}

export function ChatHome({ onSend }: ChatHomeProps) {
  const suggestions = useMemo(() => pickFour(), []);

  return (
    <div className="relative flex h-full flex-col items-center justify-center px-4">
      {/* Soft aurora wash anchors the chat home surface */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden dark:block"
        style={{
          backgroundImage:
            "radial-gradient(circle at 24% 18%, rgba(127,184,154,0.10), transparent 36%), radial-gradient(circle at 78% 14%, rgba(212,197,156,0.06), transparent 30%)",
        }}
      />
      <div className="relative flex w-full max-w-2xl flex-col items-center gap-10">
        <div className="text-center">
          <p className="sp-kicker tracking-[0.28em] dark:text-stone-500">
            <span className="mr-2 inline-block h-1 w-1 -translate-y-0.5 rounded-full bg-[var(--sp-moss-mint)]" />
            SmartPockets v0.1
          </p>
          <h1 className="mt-4 text-balance text-[clamp(1.6rem,2.6vw,2.4rem)] font-medium leading-[1.1] tracking-[-0.025em] text-primary">
            Ask SmartPockets anything about{" "}
            <em className="font-[family-name:var(--font-fraunces)] font-medium italic text-[var(--sp-fraunces-accent)]">money</em>.
          </h1>
          <p className="mt-3 text-pretty text-sm leading-6 text-tertiary">
            Balances, promos, transactions, spend breakdowns. Ask in plain language.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2.5">
          {suggestions.map(({ label }) => (
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
      className="group relative overflow-hidden rounded-full border border-secondary bg-primary px-4 py-2 text-sm font-medium text-secondary shadow-xs transition-[transform,background-color,border-color,color] duration-[var(--sp-motion-base)] ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-secondary active:translate-y-0 dark:border-[var(--sp-moss-line-strong)] dark:bg-[var(--sp-surface-panel-strong)] dark:text-stone-300 dark:hover:border-white/20 dark:hover:bg-white/[0.07]"
    >
      <span className="relative flex items-center gap-2">
        <span className="h-1 w-1 rounded-full bg-[var(--sp-moss-mint)]/70 dark:bg-[#7fb89a]/70" />
        {label}
      </span>
    </button>
  );
}
