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
    <div className="relative isolate flex h-full flex-col items-center justify-center px-4">
      {/* Apothecary ambient bloom */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--apothecary-moss)]/[0.07] blur-[140px]" />
        <div className="absolute right-[8%] top-[18%] h-[260px] w-[260px] rounded-full bg-[var(--apothecary-champagne)]/[0.05] blur-[100px]" />
      </div>

      <div className="flex w-full max-w-2xl flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-3">
            <span className="grid size-1.5 place-items-center">
              <span className="apothecary-pulse size-1.5 rounded-full bg-[var(--apothecary-moss)]" />
            </span>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.22em] uppercase text-text-brand-primary">
              agent · ready
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-geist)] text-2xl font-medium tracking-[-0.02em] text-primary md:text-3xl">
            <span className="font-[family-name:var(--font-source-serif)] italic font-light text-text-brand-primary">
              Ask
            </span>{" "}
            anything about your money.
          </h1>
          <p className="font-[family-name:var(--font-geist)] text-sm text-tertiary">
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
      className="rounded-full border border-[var(--apothecary-hairline)] bg-[var(--apothecary-panel)]/60 px-4 py-2 font-[family-name:var(--font-geist)] text-sm font-medium text-secondary backdrop-blur-sm shadow-xs transition-all hover:border-[var(--apothecary-hairline-strong)] hover:bg-[var(--apothecary-panel-hover)] hover:text-primary"
    >
      {label}
    </button>
  );
}
