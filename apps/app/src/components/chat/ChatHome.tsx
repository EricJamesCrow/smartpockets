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
          <p className="font-[family-name:var(--font-geist-mono)] text-[0.7rem] uppercase tracking-[0.28em] text-tertiary dark:text-stone-500">
            <span className="mr-2 inline-block h-1 w-1 -translate-y-0.5 rounded-full bg-[var(--sp-moss-mint)]" />
            SmartPockets v0.1
          </p>
          <h1 className="mt-4 text-balance text-[clamp(1.6rem,2.6vw,2.4rem)] font-medium leading-[1.1] tracking-[-0.025em] text-primary">
            Ask SmartPockets anything about{" "}
            <em className="font-[family-name:var(--font-fraunces)] font-medium italic text-stone-300">money</em>.
          </h1>
          <p className="mt-3 text-pretty text-sm leading-6 text-tertiary">
            Balances, promos, transactions, spend breakdowns. Ask in plain language.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2.5">
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
      className="group relative overflow-hidden rounded-full border border-secondary bg-primary px-4 py-2 text-sm font-medium text-secondary shadow-xs transition-[transform,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-secondary dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-stone-300 dark:hover:border-white/20 dark:hover:bg-white/[0.07]"
    >
      <span className="relative flex items-center gap-2">
        <span className="h-1 w-1 rounded-full bg-[var(--sp-moss-mint)]/70 dark:bg-[#7fb89a]/70" />
        {label}
      </span>
    </button>
  );
}
