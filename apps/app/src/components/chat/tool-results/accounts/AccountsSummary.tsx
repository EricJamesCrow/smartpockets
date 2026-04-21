"use client";

import { ToolCardShell } from "../shared/ToolCardShell";
import { useLivePlaidAccounts, type PlaidAccountRow } from "../shared/liveRowsHooks";
import { useToolHintSend } from "../shared/useToolHintSend";
import type { ToolOutput, ToolResultComponentProps } from "../types";
import { AccountsSummarySkeleton } from "./AccountsSummarySkeleton";

type Preview = {
    totalBalance?: number;
    institutionCount?: number;
    summary?: string;
};

function formatCurrency(amount: number | null | undefined): string {
    if (amount == null) return "-";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
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
                <p className="text-sm text-tertiary">No accounts connected.</p>
            </ToolCardShell>
        );
    }

    if (accounts === undefined) {
        return <AccountsSummarySkeleton />;
    }

    // Detail mode — single account.
    if (toolName === "get_account_detail" || accounts.length === 1) {
        const account = accounts[0];
        if (!account) {
            return (
                <ToolCardShell title="Account">
                    <p className="text-sm text-tertiary">Account details unavailable.</p>
                </ToolCardShell>
            );
        }
        return (
            <ToolCardShell
                title={account.officialName ?? account.name}
                subtitle={
                    account.mask ? `${account.institutionName ?? "Bank"} ...${account.mask}` : account.institutionName ?? undefined
                }
            >
                <dl className="space-y-2 text-sm">
                    <div className="flex items-baseline justify-between">
                        <dt className="text-tertiary">Current balance</dt>
                        <dd className="font-semibold tabular-nums text-primary">
                            {formatCurrency(account.balances.current)}
                        </dd>
                    </div>
                    {account.balances.available != null && (
                        <div className="flex items-baseline justify-between">
                            <dt className="text-tertiary">Available</dt>
                            <dd className="tabular-nums text-primary">
                                {formatCurrency(account.balances.available)}
                            </dd>
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
                    className="mt-4 text-xs font-medium text-utility-brand-700 hover:underline"
                >
                    Show transactions for this institution
                </button>
            </ToolCardShell>
        );
    }

    const grouped = groupByInstitution(accounts);
    const totalBalance = output.preview.totalBalance ?? accounts.reduce((sum, a) => sum + (a.balances.current ?? 0), 0);
    const subtitle = `${grouped.length} institutions, ${formatCurrency(totalBalance)} total`;

    return (
        <ToolCardShell title="Accounts" subtitle={subtitle}>
            <ul className="divide-y divide-secondary">
                {grouped.map((group) => {
                    const groupTotal = group.accounts.reduce((sum, a) => sum + (a.balances.current ?? 0), 0);
                    return (
                        <li key={group.id} className="py-2">
                            <button
                                type="button"
                                onClick={() => {
                                    void hint.filterByInstitution(group.id);
                                }}
                                className="flex w-full items-center justify-between gap-3 text-left hover:bg-secondary/40"
                            >
                                <div>
                                    <p className="text-sm font-medium text-primary">{group.name}</p>
                                    <p className="text-xs text-tertiary">
                                        {group.accounts.length} account{group.accounts.length === 1 ? "" : "s"}
                                    </p>
                                </div>
                                <span className="text-sm tabular-nums text-secondary">
                                    {formatCurrency(groupTotal)}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </ToolCardShell>
    );
}
