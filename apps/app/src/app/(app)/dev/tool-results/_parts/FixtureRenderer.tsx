"use client";

import { useEffect, useState } from "react";
import type { Id } from "@convex/_generated/dataModel";
import { ChatInteractionProvider } from "@/components/chat/ChatInteractionContext";
import { proposalFallback, toolResultRegistry } from "@/components/chat/tool-results";
import { LivePreviewOverrideProvider, type LivePreviewOverrides } from "@/components/chat/tool-results/shared/liveRowsHooks";
import type { AgentThreadId, ProposalToolOutput, ToolOutput, ToolResultComponentProps } from "@/components/chat/tool-results/types";
import { cx } from "@/utils/cx";

type AnyProps = ToolResultComponentProps<unknown, unknown>;

type FixtureEntry = {
    name: string;
    props: AnyProps;
    overrides?: LivePreviewOverrides;
};

type FixtureModule = Record<string, AnyProps | { props: AnyProps; overrides?: LivePreviewOverrides }>;

const THREAD_ID = "fx-thread" as unknown as AgentThreadId;

async function loadFixture(toolName: string): Promise<FixtureEntry[]> {
    try {
        const mod = (await import(`@/components/chat/tool-results/__fixtures__/${toolName}.fixture`)) as FixtureModule;
        const entries: FixtureEntry[] = [];
        for (const [name, value] of Object.entries(mod)) {
            if (name.startsWith("_")) continue;
            if (!value || typeof value !== "object") continue;
            if ("props" in value && "toolName" in (value.props as AnyProps)) {
                entries.push({ name, props: value.props, overrides: value.overrides });
            } else if ("toolName" in (value as AnyProps)) {
                entries.push({ name, props: value as AnyProps });
            }
        }
        return entries;
    } catch (err) {
        console.error(`Failed to load fixture for ${toolName}:`, err);
        return [];
    }
}

type OutputPreviewShape = {
    ids?: string[];
    window?: { from: string; to: string };
    preview?: {
        buckets?: Array<{ category?: string; from?: string; to?: string; amount: number }>;
        promos?: Array<{
            id: string;
            cardId: Id<"creditCards">;
            kind: string;
            apr: number;
            startDate: string;
            endDate: string;
            balance?: number;
            note?: string;
        }>;
        plans?: Array<{
            id: string;
            cardId: Id<"creditCards">;
            merchantName: string;
            totalAmount: number;
            monthlyPayment: number;
            totalPayments: number;
            remainingPayments: number;
            startDate: string;
            endDate: string;
        }>;
        reminders?: Array<{
            id: string;
            title: string;
            dueAt: number;
            notes?: string | null;
            isDone: boolean;
            relatedResourceType: "creditCard" | "promoRate" | "installmentPlan" | "transaction" | "none";
            relatedResourceId?: string | null;
        }>;
        summary?: string;
    };
};

// Synthesize minimal live-row overrides from a fixture's output payload so
// read-tool preview pages show real card layouts instead of skeletons while
// the CR-5 live queries are still stubbed. Preserves any explicit overrides
// the fixture already exports (richer values override the synthesized ones).
function synthesizeOverrides(props: AnyProps, existing: LivePreviewOverrides | undefined): LivePreviewOverrides {
    const output = (props as ToolResultComponentProps<unknown, OutputPreviewShape | ProposalToolOutput | null>).output;
    if (!output || typeof output !== "object" || !("ids" in output)) {
        return existing ?? {};
    }

    const o = output as OutputPreviewShape;
    const ids = o.ids ?? [];
    const result: LivePreviewOverrides = {
        proposals: existing?.proposals,
        transactions: { ...(existing?.transactions ?? {}) },
        creditCards: { ...(existing?.creditCards ?? {}) },
        plaidAccounts: { ...(existing?.plaidAccounts ?? {}) },
        promoRates: { ...(existing?.promoRates ?? {}) },
        installmentPlans: { ...(existing?.installmentPlans ?? {}) },
        reminders: { ...(existing?.reminders ?? {}) },
    };

    const now = Date.now();

    // Sample merchant + source fixtures so the harness shows a representative
    // mix of logos / category badges / pending vs posted rows when the
    // /dev/tool-results preview page boots without a live Convex backend.
    const sampleMerchants = [
        { name: "Whole Foods", logo: "https://logo.clearbit.com/wholefoodsmarket.com", category: "FOOD_AND_DRINK" },
        { name: "Uber", logo: "https://logo.clearbit.com/uber.com", category: "TRANSPORTATION" },
        { name: "Amazon", logo: "https://logo.clearbit.com/amazon.com", category: "GENERAL_MERCHANDISE" },
        { name: "Netflix", logo: "https://logo.clearbit.com/netflix.com", category: "ENTERTAINMENT" },
        { name: "Shell", logo: "https://logo.clearbit.com/shell.com", category: "TRANSPORTATION" },
    ];
    const sampleCards = [
        { id: "card_chase_sapphire", displayName: "Chase Sapphire Reserve", lastFour: "4321", brand: "VISA", institutionName: "Chase" },
        { id: "card_amex_plat", displayName: "Amex Platinum", lastFour: "1009", brand: "AMEX", institutionName: "American Express" },
    ];

    for (const [index, id] of ids.entries()) {
        if (id.startsWith("plaid:plaidTransactions:") && !result.transactions?.[id]) {
            const bucket = o.preview?.buckets?.[index];
            const merchant = sampleMerchants[index % sampleMerchants.length]!;
            const card = sampleCards[index % sampleCards.length]!;
            const category = bucket?.category ?? merchant.category;
            const amountDollars = bucket?.amount ?? 42 + index;
            const pending = index === 0; // First row pending to showcase the badge variant.
            result.transactions![id] = {
                _id: id,
                date: bucket?.from ?? o.window?.from ?? "2026-04-15",
                amount: Math.round(amountDollars * 1000),
                merchantName: merchant.name,
                name: merchant.name,
                categoryPrimary: category,
                pending,
                logoUrl: merchant.logo,
                merchantEnrichment: {
                    merchantName: merchant.name,
                    logoUrl: merchant.logo,
                    categoryPrimary: category,
                    confidenceLevel: "VERY_HIGH",
                },
                sourceInfo: {
                    cardId: card.id,
                    displayName: card.displayName,
                    lastFour: card.lastFour,
                    brand: card.brand,
                    institutionName: card.institutionName,
                },
            };
        } else if (id.startsWith("plaid:plaidAccounts:") && !result.plaidAccounts?.[id]) {
            result.plaidAccounts![id] = {
                _id: id,
                name: `Checking ${index + 1}`,
                officialName: `Sample Bank Checking ${index + 1}`,
                mask: String(1000 + index),
                type: "depository",
                subtype: "checking",
                balances: {
                    current: Math.round((1000 + index * 1000) * 1000),
                    available: Math.round((900 + index * 1000) * 1000),
                },
                plaidItemId: `plaid:plaidItems:inst-${Math.floor(index / 2)}`,
                institutionName: `Sample Bank ${Math.floor(index / 2) + 1}`,
            };
        } else if (id.startsWith("creditCards:") && !result.creditCards?.[id]) {
            result.creditCards![id as Id<"creditCards">] = {
                _id: id as Id<"creditCards">,
                displayName: ["Chase Sapphire Reserve", "Amex Platinum", "Citi Double Cash"][index] ?? `Card ${index + 1}`,
                company: ["Chase", "American Express", "Citibank"][index] ?? "Issuer",
                mask: String(4000 + index * 1111),
                currentBalance: 1200 + index * 400,
                creditLimit: 10000 + index * 2000,
                availableCredit: 8800 - index * 400,
                isOverdue: false,
                nextPaymentDueDate: "2026-05-05",
                statementClosingDay: 15 + index,
                plaidItemId: `plaid:plaidItems:issuer-${index}`,
            };
        } else if (id.startsWith("promoRates:") && !result.promoRates?.[id]) {
            const promo = o.preview?.promos?.[index];
            if (promo) {
                result.promoRates![id] = {
                    _id: id,
                    creditCardId: promo.cardId,
                    kind: promo.kind,
                    apr: promo.apr,
                    startDate: promo.startDate,
                    endDate: promo.endDate,
                    balance: promo.balance ?? null,
                    note: promo.note ?? null,
                };
            }
        } else if (id.startsWith("installmentPlans:") && !result.installmentPlans?.[id]) {
            const plan = o.preview?.plans?.[index];
            if (plan) {
                result.installmentPlans![id] = {
                    _id: id,
                    creditCardId: plan.cardId,
                    merchantName: plan.merchantName,
                    totalAmount: plan.totalAmount,
                    monthlyPayment: plan.monthlyPayment,
                    totalPayments: plan.totalPayments,
                    remainingPayments: plan.remainingPayments,
                    startDate: plan.startDate,
                    endDate: plan.endDate,
                };
            }
        } else if (id.startsWith("reminders:") && !result.reminders?.[id]) {
            const reminder = o.preview?.reminders?.[index];
            if (reminder) {
                result.reminders![id] = {
                    _id: reminder.id,
                    title: reminder.title,
                    dueAt: reminder.dueAt,
                    notes: reminder.notes ?? null,
                    isDone: reminder.isDone,
                    doneAt: reminder.isDone ? reminder.dueAt : null,
                    dismissedAt: null,
                    relatedResourceType: reminder.relatedResourceType,
                    relatedResourceId: reminder.relatedResourceId ?? null,
                    channels: ["chat"],
                    createdByAgent: false,
                };
            }
        }
    }

    // For charts (get_spend_over_time, get_spend_by_category): the fixture has
    // more IDs than buckets. Walk the bucket list independently to seed
    // additional transactions for richer aggregations.
    if (o.preview?.buckets && ids.length > 0 && ids[0]!.startsWith("plaid:plaidTransactions:")) {
        o.preview.buckets.forEach((bucket, i) => {
            const id = ids[i];
            if (!id || result.transactions?.[id]) return;
            result.transactions![id] = {
                _id: id,
                date: bucket.from ?? o.window?.from ?? "2026-04-15",
                amount: Math.round(bucket.amount * 1000),
                merchantName: `Bucket ${i + 1}`,
                name: `Bucket ${i + 1}`,
                categoryPrimary: bucket.category ?? "Uncategorized",
                pending: false,
                _updateTime: now,
            };
        });
    }

    return result;
}

function ErrorPreview({ errorText, toolName }: { errorText: string | undefined; toolName: string }) {
    return (
        <div className="border-utility-error-300 bg-utility-error-50 shadow-xs max-w-[640px] rounded-xl border px-4 py-4">
            <h3 className="text-utility-error-700 text-sm font-semibold">Tool error: {toolName}</h3>
            <p className="text-utility-error-700 mt-1 text-xs">{errorText ?? "Tool returned output-error without errorText."}</p>
            <p className="text-tertiary mt-3 text-xs">
                W1 renders this state through <code>ToolErrorRow</code> in the real chat path (spec 3.4, 8). The harness shows the error payload verbatim.
            </p>
        </div>
    );
}

function renderFixture(toolName: string, props: AnyProps) {
    if (props.state === "output-error") {
        return <ErrorPreview toolName={toolName} errorText={props.errorText} />;
    }
    if (toolName.startsWith("propose_")) {
        const Fallback = proposalFallback;
        return <Fallback {...(props as ToolResultComponentProps<unknown, ProposalToolOutput>)} />;
    }
    const entry = toolResultRegistry[toolName as keyof typeof toolResultRegistry];
    if (!entry) {
        return <p className="text-utility-error-700 text-sm">No registry entry for {toolName}.</p>;
    }
    const Component = entry.Component;
    return <Component {...props} />;
}

export function FixtureRenderer({ toolName }: { toolName: string }) {
    const [fixtures, setFixtures] = useState<FixtureEntry[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        void loadFixture(toolName).then((entries) => {
            if (!cancelled) setFixtures(entries);
        });
        return () => {
            cancelled = true;
        };
    }, [toolName]);

    if (fixtures === null) {
        return <p className="text-tertiary text-sm">Loading fixtures...</p>;
    }

    if (fixtures.length === 0) {
        return (
            <p className="text-tertiary text-sm">
                No fixtures exported for {toolName}. Add a file at
                <code className="bg-secondary/40 ml-1 rounded px-1">apps/app/src/components/chat/tool-results/__fixtures__/{toolName}.fixture.ts</code>.
            </p>
        );
    }

    return (
        <ChatInteractionProvider threadId={THREAD_ID}>
            <div className="space-y-8">
                {fixtures.map(({ name, props, overrides }) => {
                    const mergedOverrides = props.state === "output-available" ? synthesizeOverrides(props, overrides) : (overrides ?? {});
                    return (
                        <article key={name} className="space-y-3">
                            <header className="flex items-center justify-between">
                                <h2 className={cx("text-tertiary text-xs font-semibold uppercase tracking-wide")}>{name}</h2>
                                <code className="text-tertiary text-xs">{props.state}</code>
                            </header>
                            <LivePreviewOverrideProvider value={mergedOverrides}>
                                {renderFixture(toolName, { ...props, threadId: THREAD_ID })}
                            </LivePreviewOverrideProvider>
                        </article>
                    );
                })}
            </div>
        </ChatInteractionProvider>
    );
}

// ToolOutput import is retained for type inference even if unused at runtime.
export type { ToolOutput };
