"use client";

import Link from "next/link";
import { notFound } from "next/navigation";

const COMPONENTS = [
    "list_transactions",
    "get_transaction_detail",
    "list_accounts",
    "get_account_detail",
    "list_credit_cards",
    "get_credit_card_detail",
    "get_upcoming_statements",
    "get_spend_by_category",
    "get_spend_over_time",
    "list_deferred_interest_promos",
    "list_installment_plans",
    "list_reminders",
    "search_merchants",
    "get_plaid_health",
    "propose_transaction_update",
    "propose_bulk_transaction_update",
    "propose_credit_card_metadata_update",
    "propose_manual_promo",
    "propose_reminder_create",
    "propose_reminder_delete",
] as const;

export default function DevToolResultsIndex() {
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_DEV_TOOLS !== "1") {
        notFound();
    }
    return (
        <div className="mx-auto max-w-screen-md p-8">
            <h1 className="mb-2 text-2xl font-bold text-primary">Tool Result Preview Harness</h1>
            <p className="mb-6 text-sm text-tertiary">
                Dev-only. Each link renders every fixture state for that component with a theme
                toggle. Gated behind <code>NODE_ENV !== "production"</code> or{" "}
                <code>NEXT_PUBLIC_DEV_TOOLS=1</code>.
            </p>
            <ul className="divide-y divide-secondary">
                {COMPONENTS.map((c) => (
                    <li key={c} className="py-2">
                        <Link
                            href={`/dev/tool-results/${c}`}
                            className="text-primary hover:underline"
                        >
                            {c}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
