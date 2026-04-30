"use client";

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
      <div className="flex w-full max-w-3xl flex-col items-center gap-10">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-zinc-300">
            <span className="size-1.5 animate-pulse rounded-full bg-brand-400 shadow-[0_0_10px_rgba(60,203,127,0.7)]" />
            SP/AGENT · ONLINE
          </span>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-3xl font-semibold uppercase leading-[0.95] tracking-tight text-zinc-50 sm:text-4xl md:text-[44px]">
            Ask SmartPockets
            <br />
            <span className="text-brand-400">anything</span> about your money.
          </h1>
          <p className="mt-4 max-w-xl text-sm text-zinc-400">
            Balances, promos, transactions, spend breakdowns. Ask in plain
            language and the agent reads your ledger live.
          </p>
        </div>
        <div className="flex w-full flex-wrap justify-center gap-2">
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
      className="group inline-flex items-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-2 text-left font-mono text-[12px] tracking-[0.02em] text-zinc-300 transition-colors duration-150 hover:border-brand-500/40 hover:bg-brand-500/[0.06] hover:text-brand-300"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600 transition-colors duration-150 group-hover:text-brand-400">
        ↳
      </span>
      {label}
    </button>
  );
}
