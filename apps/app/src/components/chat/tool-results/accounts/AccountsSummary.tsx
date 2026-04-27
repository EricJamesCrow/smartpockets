"use client";

import { formatMoneyFromMilliunits } from "@/utils/money";
import { ToolCardShell } from "../shared/ToolCardShell";
import { type PlaidAccountRow, useLivePlaidAccounts } from "../shared/liveRowsHooks";
import { useToolHintSend } from "../shared/useToolHintSend";
import type { ToolOutput, ToolResultComponentProps } from "../types";
import { AccountsSummarySkeleton } from "./AccountsSummarySkeleton";

type Preview = {
    totalBalance?: number;
    institutionCount?: number;
    summary?: string;
};

function formatCurrency(amount: number | null | undefined): string {
    return formatMoneyFromMilliunits(amount, { nullDisplay: "-" });
}

type InstitutionGroup = {
    id: string;
    name: string;
    accounts: PlaidAccountRow[];
};

function groupByInstitution(accounts: PlaidAccountRow[]): InstitutionGroup[] {
    const map = new Map<string, InstitutionGroup>();
    for (const account of accounts) {
        const id = account.plaidItemId;
        const existing = map.get(id);
        if (existing) {
            existing.accounts.push(account);
        } else {
            map.set(id, {
                id,
                name: account.institutionName ?? "Institution",
                accounts: [account],
            });
        }
    }
    return Array.from(map.values());
}

export function AccountsSummary(props: ToolResultComponentProps<unknown, ToolOutput<Preview>>) {
    const { output, state, toolName } = props;
    const accounts = useLivePlaidAccounts(output?.ids ?? []);
    const hint = useToolHintSend();

    if (state === "input-streaming" || !output) {
        return <AccountsSummarySkeleton />;
    }

    if (output.ids.length === 0) {
        return (
            <ToolCardShell title="Accounts">
                <p className="text-tertiary text-sm">No accounts connected.</p>
            </ToolCardShell>
        );
    }

    if (accounts === undefined) {
        return <AccountsSummarySkeleton />;
    }

    // Detail mode - single account.
    if (toolName === "get_account_detail" || accounts.length === 1) {
        const account = accounts[0];
        if (!account) {
            return (
                <ToolCardShell title="Account">
                    <p className="text-tertiary text-sm">Account details unavailable.</p>
                </ToolCardShell>
            );
        }
        return (
            <ToolCardShell
                title={account.officialName ?? account.name}
                subtitle={account.mask ? `${account.institutionName ?? "Bank"} ...${account.mask}` : (account.institutionName ?? undefined)}
            >
                <dl className="space-y-2 text-sm">
                    <div className="flex items-baseline justify-between">
                        <dt className="text-tertiary">Current balance</dt>
                        <dd className="text-primary font-semibold tabular-nums">{formatCurrency(account.balances.current)}</dd>
                    </div>
                    {account.balances.available != null && (
                        <div className="flex items-baseline justify-between">
                            <dt className="text-tertiary">Available</dt>
                            <dd className="text-primary tabular-nums">{formatCurrency(account.balances.available)}</dd>
                        </div>
                    )}
                    <div className="flex items-baseline justify-between">
                        <dt className="text-tertiary">Type</dt>
                        <dd className="text-primary">
                            {account.type}
                            {account.subtype ? ` / ${account.subtype}` : ""}
                        </dd>
                    </div>
                </dl>
                <button
                    type="button"
                    onClick={() => {
                        void hint.filterByInstitution(account.plaidItemId);
                    }}
                    className="text-utility-brand-700 mt-4 text-xs font-medium hover:underline"
                >
                    Show transactions for this institution
                </button>
            </ToolCardShell>
        );
    }

    const grouped = groupByInstitution(accounts);
    const totalBalance = accounts.reduce((sum, a) => sum + (a.balances.current ?? 0), 0);
    const subtitle = `${grouped.length} institutions, ${formatCurrency(totalBalance)} total`;

    return (
        <ToolCardShell title="Accounts" subtitle={subtitle}>
            <ul className="divide-secondary divide-y">
                {grouped.map((group) => {
                    const groupTotal = group.accounts.reduce((sum, a) => sum + (a.balances.current ?? 0), 0);
                    return (
                        <li key={group.id} className="py-2">
                            <button
                                type="button"
                                onClick={() => {
                                    void hint.filterByInstitution(group.id);
                                }}
                                className="hover:bg-secondary/40 flex w-full items-center justify-between gap-3 text-left"
                            >
                                <div>
                                    <p className="text-primary text-sm font-medium">{group.name}</p>
                                    <p className="text-tertiary text-xs">
                                        {group.accounts.length} account{group.accounts.length === 1 ? "" : "s"}
                                    </p>
                                </div>
                                <span className="text-secondary text-sm tabular-nums">{formatCurrency(groupTotal)}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </ToolCardShell>
    );
}
