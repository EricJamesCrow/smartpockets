"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { motion } from "motion/react";
import { formatDisplayCurrency } from "@/types/credit-cards";
import { cx } from "@/utils/cx";
// Section components
import { AprBreakdown } from "./details/AprBreakdown";
import { InlineEditableField } from "./details/InlineEditableField";

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

const SYNC_STATUS_COLORS: Record<string, string> = {
    synced: "text-utility-success-700",
    syncing: "text-utility-brand-600",
    error: "text-utility-error-700",
    stale: "text-utility-warning-700",
};

interface CardData {
    _id: Id<"creditCards">;
    _creationTime: number;
    accountName: string;
    officialName?: string | null;
    company?: string | null;
    brand?: string | null;
    lastFour?: string | null;
    accountType?: string | null;
    accountSubtype?: string | null;
    isoCurrencyCode?: string | null;
    aprs?: Array<{
        aprPercentage: number;
        aprType: string;
        balanceSubjectToApr?: number | null;
        interestChargeAmount?: number | null;
    }> | null;
    lastPaymentAmount?: number | null;
    lastPaymentDate?: string | null;
    lastStatementBalance?: number | null;
    lastStatementIssueDate?: string | null;
    syncStatus?: string | null;
    lastSyncedAt?: number | null;
    lastSyncError?: string | null;
    userOverrides?: {
        officialName?: string;
        accountName?: string;
        company?: string;
        aprs?: Array<{
            index: number;
            aprPercentage?: number;
            balanceSubjectToApr?: number;
            interestChargeAmount?: number;
        }>;
        providerDashboardUrl?: string;
    } | null;
}

interface CardDetailsTabProps {
    cardId: Id<"creditCards">;
    cardData: CardData | null | undefined;
}

export function CardDetailsTab({ cardId, cardData }: CardDetailsTabProps) {
    const setOverride = useMutation(api.creditCards.mutations.setOverride);
    const clearOverride = useMutation(api.creditCards.mutations.clearOverride);

    if (!cardData) {
        return <div className="p-6 text-sm text-tertiary text-center">Loading card details...</div>;
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
            <AprBreakdown aprs={cardData.aprs ?? undefined} cardId={cardId} aprOverrides={cardData.userOverrides?.aprs} />

            <div className="gap-6 lg:grid-cols-2 grid grid-cols-1">
                <div className="gap-6 flex flex-col">
                    <section>
                        <h3 className="mb-4 text-lg font-semibold text-primary">Account Details</h3>
                        <div className="rounded-xl border-secondary bg-primary border">
                            <dl className="divide-secondary divide-y">
                                {(cardData.officialName || cardData.userOverrides?.officialName) && (
                                    <EditableDetailRow
                                        label="Official Name"
                                        value={cardData.userOverrides?.officialName ?? cardData.officialName}
                                        plaidValue={cardData.officialName}
                                        isOverridden={cardData.userOverrides?.officialName != null}
                                        type="text"
                                        onSave={async (v) => {
                                            await setOverride({ cardId, field: "officialName", value: v });
                                        }}
                                        onRevert={async () => {
                                            await clearOverride({ cardId, field: "officialName" });
                                        }}
                                    />
                                )}
                                <EditableDetailRow
                                    label="Account Name"
                                    value={cardData.userOverrides?.accountName ?? cardData.accountName}
                                    plaidValue={cardData.accountName}
                                    isOverridden={cardData.userOverrides?.accountName != null}
                                    type="text"
                                    onSave={async (v) => {
                                        await setOverride({ cardId, field: "accountName", value: v });
                                    }}
                                    onRevert={async () => {
                                        await clearOverride({ cardId, field: "accountName" });
                                    }}
                                />
                                {(cardData.company || cardData.userOverrides?.company) && (
                                    <EditableDetailRow
                                        label="Issuer"
                                        value={cardData.userOverrides?.company ?? cardData.company}
                                        plaidValue={cardData.company}
                                        isOverridden={cardData.userOverrides?.company != null}
                                        type="text"
                                        onSave={async (v) => {
                                            await setOverride({ cardId, field: "company", value: v });
                                        }}
                                        onRevert={async () => {
                                            await clearOverride({ cardId, field: "company" });
                                        }}
                                    />
                                )}
                                {cardData.brand && <DetailRow label="Network" value={capitalize(cardData.brand)} />}
                                {cardData.lastFour && <DetailRow label="Card Number" value={`•••• •••• •••• ${cardData.lastFour}`} />}
                                {cardData.accountType && (
                                    <DetailRow
                                        label="Account Type"
                                        value={`${cardData.accountType}${cardData.accountSubtype ? ` / ${cardData.accountSubtype}` : ""}`.replace(
                                            /\b\w/g,
                                            (c) => c.toUpperCase(),
                                        )}
                                    />
                                )}
                                {cardData.isoCurrencyCode && <DetailRow label="Currency" value={cardData.isoCurrencyCode} />}
                                <DetailRow
                                    label="Date Added"
                                    value={new Date(cardData._creationTime).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                />
                            </dl>
                        </div>
                    </section>
                </div>

                <div className="gap-6 flex flex-col">
                    <section>
                        <h3 className="mb-4 text-lg font-semibold text-primary">Payment History</h3>
                        <div className="rounded-xl border-secondary bg-primary border">
                            <div className="divide-secondary grid grid-cols-1 divide-y">
                                <div className="p-4">
                                    <p className="text-xs text-tertiary">Last Payment</p>
                                    <p className="text-lg font-semibold text-primary tabular-nums">
                                        {cardData.lastPaymentAmount != null ? formatDisplayCurrency(cardData.lastPaymentAmount) : "\u2014"}
                                    </p>
                                    {cardData.lastPaymentDate && <p className="text-xs text-tertiary">{cardData.lastPaymentDate}</p>}
                                </div>
                                <div className="p-4">
                                    <p className="text-xs text-tertiary">Last Statement Balance</p>
                                    <p className="text-lg font-semibold text-primary tabular-nums">
                                        {cardData.lastStatementBalance != null ? formatDisplayCurrency(cardData.lastStatementBalance) : "\u2014"}
                                    </p>
                                    {cardData.lastStatementIssueDate && <p className="text-xs text-tertiary">Issued {cardData.lastStatementIssueDate}</p>}
                                </div>
                            </div>
                        </div>
                    </section>

                    {cardData.syncStatus && (
                        <section>
                            <h3 className="mb-4 text-lg font-semibold text-primary">Sync Status</h3>
                            <div className="rounded-xl border-secondary bg-primary px-4 py-3 border">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-tertiary">Status</span>
                                    <span className={cx("text-sm font-medium", SYNC_STATUS_COLORS[cardData.syncStatus])}>
                                        {capitalize(cardData.syncStatus)}
                                    </span>
                                </div>
                                {cardData.lastSyncedAt != null && (
                                    <p className="mt-1 text-xs text-tertiary">Last synced: {new Date(cardData.lastSyncedAt).toLocaleString("en-US")}</p>
                                )}
                                {cardData.lastSyncError && (
                                    <div className="mt-2 rounded-lg bg-utility-error-50 px-3 py-2 text-xs text-utility-error-700">
                                        There was a problem syncing your card. Please try again later.
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function EditableDetailRow({
    label,
    value,
    plaidValue,
    isOverridden,
    type,
    onSave,
    onRevert,
    formatDisplay,
}: {
    label: string;
    value: string | number | null | undefined;
    plaidValue?: string | number | null | undefined;
    isOverridden: boolean;
    type: "text" | "number" | "currency" | "percentage" | "date" | "url";
    onSave: (newValue: string | number) => Promise<void>;
    onRevert?: () => Promise<void>;
    formatDisplay?: (value: string | number | null | undefined) => string;
}) {
    return (
        <div className="px-4 py-3 flex items-center justify-between">
            <dt className="text-sm text-tertiary">{label}</dt>
            <dd>
                <InlineEditableField
                    value={value}
                    plaidValue={plaidValue}
                    isOverridden={isOverridden}
                    type={type}
                    onSave={onSave}
                    onRevert={onRevert}
                    formatDisplay={formatDisplay}
                />
            </dd>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="px-4 py-3 flex items-center justify-between">
            <dt className="text-sm text-tertiary">{label}</dt>
            <dd className="text-sm font-medium text-primary">{value}</dd>
        </div>
    );
}
