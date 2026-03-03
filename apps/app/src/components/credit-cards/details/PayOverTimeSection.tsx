"use client";

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface PayOverTimeSectionProps {
  payOverTimeEnabled?: boolean;
  payOverTimeLimit?: number;
  payOverTimeApr?: number;
  availableCredit?: number;
}

export function PayOverTimeSection({
  payOverTimeEnabled,
  payOverTimeLimit,
  payOverTimeApr,
  availableCredit,
}: PayOverTimeSectionProps) {
  if (!payOverTimeEnabled) return null;

  const rows = [
    { label: "Pay Over Time Limit", value: payOverTimeLimit != null ? `$${formatCurrency(payOverTimeLimit)}` : "—" },
    { label: "Available Pay Over Time", value: availableCredit != null ? `$${formatCurrency(availableCredit)}` : "—" },
    { label: "Pay Over Time APR", value: payOverTimeApr != null ? `${payOverTimeApr.toFixed(2)}% (v)` : "—" },
    { label: "Setting", value: "ON" },
  ];

  return (
    <section>
      <h3 className="mb-4 text-lg font-semibold text-primary">Pay Over Time</h3>
      <div className="rounded-xl border border-secondary bg-primary">
        <dl className="divide-y divide-secondary">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between px-4 py-3">
              <dt className="text-sm text-tertiary">{row.label}</dt>
              <dd className="text-sm font-medium text-primary">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
