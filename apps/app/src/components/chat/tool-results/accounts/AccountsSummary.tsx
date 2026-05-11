"use client";

import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import { Building07, CreditCard02, Wallet02 } from "@untitledui/icons";
import { InstitutionLogo } from "@/features/institutions";
import { cx } from "@/utils/cx";
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

type AccountIcon = typeof CreditCard02;

function iconForAccount(type: string): AccountIcon {
    if (type === "credit") return CreditCard02;
    if (type === "depository") return Wallet02;
    return Building07;
}

function formatSubtype(account: PlaidAccountRow): string {
    const subtype = account.subtype?.trim();
    if (subtype) {
        return subtype
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return account.type.replace(/\b\w/g, (c) => c.toUpperCase());
}

type InstitutionGroup = {
    id: string;
    name: string;
    logoBase64?: string | null;
    primaryColor?: string | null;
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
                logoBase64: account.institutionLogoBase64,
                primaryColor: account.institutionPrimaryColor,
                accounts: [account],
            });
        }
    }
    return Array.from(map.values());
}

function AccountRow({ account }: { account: PlaidAccountRow }) {
    const Icon = iconForAccount(account.type);
    const subtype = formatSubtype(account);
    const showAvailable =
        account.balances.available != null && account.balances.available !== account.balances.current;

    return (
        <div className="flex items-center gap-3 py-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <Icon className="size-4 text-quaternary" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-primary">
                    {account.officialName ?? account.name}
                </p>
                <p className="text-xs text-tertiary">
                    {account.mask ? `•••• ${account.mask}` : "No mask"} · {subtype}
                </p>
            </div>
            <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums text-primary">
                    {formatCurrency(account.balances.current)}
                </p>
                {showAvailable && (
                    <p className="text-xs tabular-nums text-tertiary">
                        {formatCurrency(account.balances.available)} avail
                    </p>
                )}
            </div>
        </div>
    );
}

function InstitutionCard({
    group,
    onClick,
}: {
    group: InstitutionGroup;
    onClick: () => void;
}) {
    const total = group.accounts.reduce((sum, a) => sum + (a.balances.current ?? 0), 0);
    return (
        <button
            type="button"
            onClick={onClick}
            className={cx(
                "block w-full rounded-xl border border-secondary bg-primary text-left transition-colors",
                "hover:border-brand-secondary hover:bg-secondary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
            )}
        >
            <header className="flex items-center gap-3 border-b border-secondary px-4 py-3">
                <InstitutionLogo
                    institutionName={group.name}
                    logoBase64={group.logoBase64}
                    primaryColor={group.primaryColor}
                    size="md"
                />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-primary">{group.name}</p>
                    <p className="text-xs text-tertiary">
                        {group.accounts.length} account{group.accounts.length === 1 ? "" : "s"}
                    </p>
                </div>
                <p className="shrink-0 text-base font-semibold tabular-nums text-primary">
                    {formatCurrency(total)}
                </p>
            </header>
            <div className="divide-y divide-secondary px-4">
                {group.accounts.map((account) => (
                    <AccountRow key={account._id} account={account} />
                ))}
            </div>
        </button>
    );
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

    // Detail mode: single account. Matches the native institution-detail
    // aesthetic with institution logo + name + masked card row + balance grid.
    if (toolName === "get_account_detail" || accounts.length === 1) {
        const account = accounts[0];
        if (!account) {
            return (
                <ToolCardShell title="Account">
                    <p className="text-sm text-tertiary">Account details unavailable.</p>
                </ToolCardShell>
            );
        }
        const Icon = iconForAccount(account.type);
        const subtype = formatSubtype(account);
        const limit = account.balances.limit;
        return (
            <ToolCardShell title={account.officialName ?? account.name}>
                <header className="mb-4 flex items-center gap-3">
                    <InstitutionLogo
                        institutionName={account.institutionName}
                        logoBase64={account.institutionLogoBase64}
                        primaryColor={account.institutionPrimaryColor}
                        size="md"
                    />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-primary">
                            {account.institutionName ?? "Institution"}
                        </p>
                        <p className="text-xs text-tertiary">
                            {account.mask ? `•••• ${account.mask}` : "No mask"}
                        </p>
                    </div>
                    <Badge color="gray" size="sm">
                        <span className="flex items-center gap-1">
                            <Icon className="size-3" aria-hidden /> {subtype}
                        </span>
                    </Badge>
                </header>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-secondary bg-secondary/30 p-4">
                    <div>
                        <dt className="text-xs text-tertiary">Current balance</dt>
                        <dd className="mt-0.5 text-base font-semibold tabular-nums text-primary">
                            {formatCurrency(account.balances.current)}
                        </dd>
                    </div>
                    {account.balances.available != null && (
                        <div>
                            <dt className="text-xs text-tertiary">Available</dt>
                            <dd className="mt-0.5 text-base font-semibold tabular-nums text-primary">
                                {formatCurrency(account.balances.available)}
                            </dd>
                        </div>
                    )}
                    {limit != null && (
                        <div>
                            <dt className="text-xs text-tertiary">Limit</dt>
                            <dd className="mt-0.5 text-base font-semibold tabular-nums text-primary">
                                {formatCurrency(limit)}
                            </dd>
                        </div>
                    )}
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
    const totalBalance = accounts.reduce((sum, a) => sum + (a.balances.current ?? 0), 0);
    const subtitle = `${grouped.length} institution${grouped.length === 1 ? "" : "s"} · ${formatCurrency(totalBalance)} total`;

    return (
        <ToolCardShell title="Accounts" subtitle={subtitle}>
            <div className="space-y-3">
                {grouped.map((group) => (
                    <InstitutionCard
                        key={group.id}
                        group={group}
                        onClick={() => {
                            void hint.filterByInstitution(group.id);
                        }}
                    />
                ))}
            </div>
        </ToolCardShell>
    );
}
