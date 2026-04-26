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
      className="rounded-full border border-secondary bg-primary px-4 py-2 text-sm font-medium text-secondary shadow-xs transition-colors hover:bg-secondary"
    >
      {label}
    </button>
  );
}
