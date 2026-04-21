"use client";

import { useEffect, useState } from "react";

import { cx } from "@/utils/cx";

import type { Id } from "@convex/_generated/dataModel";

import { ToolCardShell } from "../shared/ToolCardShell";
import {
    useLiveCreditCards,
    useLiveProposal,
    useLiveReminders,
    useLiveTransactions,
    type AgentProposalRow,
} from "../shared/liveRowsHooks";
import { useToolHintSend } from "../shared/useToolHintSend";
import type { AgentProposalId } from "../types";
import { ProposalConfirmCardSkeleton } from "./ProposalConfirmCardSkeleton";

type Props = {
    proposalId: AgentProposalId;
};

const CONFIRM_MOUNT_DISABLE_MS = 250;
const CONFIRM_COUNTDOWN_IRREVERSIBLE_MS = 3000;
const IRREVERSIBLE_THRESHOLD = 500;
const UNDO_POLL_MS = 30_000;

function parsePatch(proposal: AgentProposalRow): Record<string, unknown> {
    if (proposal.patch) return proposal.patch;
    try {
        const parsed = JSON.parse(proposal.sampleJson) as Record<string, unknown>;
        if (parsed && typeof parsed === "object" && "patch" in parsed) {
            return (parsed as { patch: Record<string, unknown> }).patch;
        }
        return {};
    } catch {
        return {};
    }
}

function formatDiffValue(value: unknown): string {
    if (value === null || value === undefined) return "-";
    if (typeof value === "string") return value;
    return JSON.stringify(value);
}

function DiffList({ patch }: { patch: Record<string, unknown> }) {
    const entries = Object.entries(patch);
    if (entries.length === 0) {
        return <p className="text-sm text-tertiary">No field changes.</p>;
    }
    return (
        <ul className="space-y-1 text-sm">
            {entries.map(([key, value]) => {
                if (Array.isArray(value) && value.length === 2) {
                    const [before, after] = value;
                    return (
                        <li key={key} className="flex flex-wrap items-baseline gap-2">
                            <span className="text-tertiary">{key}:</span>
                            <span className="text-tertiary line-through">{formatDiffValue(before)}</span>
                            <span className="text-utility-success-700">{formatDiffValue(after)}</span>
                        </li>
                    );
                }
                return (
                    <li key={key} className="flex flex-wrap items-baseline gap-2">
                        <span className="text-tertiary">{key}:</span>
                        <span className="text-primary">{formatDiffValue(value)}</span>
                    </li>
                );
            })}
        </ul>
    );
}

// Pick the live-row hook by the propose tool that created this proposal.
// Transactions, credit cards, and reminders each live in distinct tables, so a
// single `useLiveTransactions` call can miss drift on card / promo / reminder
// proposals (the rows never resolve). Every hook is called unconditionally so
// hook order stays stable; empty-id calls are cheap and return `undefined`.
function useDriftDetection(proposal: AgentProposalRow | null | undefined): boolean {
    const toolName = proposal?.toolName ?? "";
    const ids = proposal?.affectedIds ?? [];

    const wantsTransactions =
        toolName === "propose_transaction_update" || toolName === "propose_bulk_transaction_update";
    const wantsCards =
        toolName === "propose_credit_card_metadata_update" || toolName === "propose_manual_promo";
    const wantsReminders =
        toolName === "propose_reminder_create" || toolName === "propose_reminder_delete";

    const transactionRows = useLiveTransactions(wantsTransactions ? ids : []);
    const cardRows = useLiveCreditCards(
        wantsCards ? (ids as Array<Id<"creditCards">>) : [],
    );
    const reminderRows = useLiveReminders(wantsReminders ? ids : []);

    if (!proposal) return false;
    const rows = wantsTransactions
        ? transactionRows
        : wantsCards
            ? cardRows
            : wantsReminders
                ? reminderRows
                : undefined;
    if (!rows) return false;
    return rows.some((row) => (row._updateTime ?? 0) > proposal.createdAt);
}

function DriftBanner() {
    return (
        <div className="mb-3 rounded-md border border-utility-warning-300 bg-utility-warning-50 p-3 text-xs text-utility-warning-700">
            Underlying data changed while this proposal was pending. Recomputed preview below.
        </div>
    );
}

function IrreversibleBanner() {
    return (
        <div className="mb-3 rounded-md border border-utility-error-300 bg-utility-error-50 p-3 text-xs text-utility-error-700">
            This proposal affects more than {IRREVERSIBLE_THRESHOLD} rows. Chunked execution will
            run and cannot be undone as a single action. Individual-row undo remains available for
            10 minutes via separate agent prompts.
        </div>
    );
}

function useConfirmUnlockedAt(isIrreversible: boolean): number {
    const [unlockAt] = useState(() =>
        Date.now() + (isIrreversible ? CONFIRM_COUNTDOWN_IRREVERSIBLE_MS : CONFIRM_MOUNT_DISABLE_MS),
    );
    return unlockAt;
}

function useCountdownSecondsLeft(targetMs: number): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (now >= targetMs) return;
        const id = setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(id);
    }, [now, targetMs]);
    return Math.max(0, Math.ceil((targetMs - now) / 1000));
}

function AwaitingView({
    proposal,
    onConfirm,
    onCancel,
}: {
    proposal: AgentProposalRow;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const patch = parsePatch(proposal);
    const isIrreversible = proposal.affectedCount > IRREVERSIBLE_THRESHOLD;
    const hasDrift = useDriftDetection(proposal);
    const unlockAt = useConfirmUnlockedAt(isIrreversible);
    const secondsLeft = useCountdownSecondsLeft(unlockAt);
    const disabled = secondsLeft > 0;

    return (
        <ToolCardShell
            title={proposal.summaryText || `Proposed ${proposal.toolName}`}
            subtitle={
                proposal.scope === "bulk"
                    ? `${proposal.affectedCount} rows affected`
                    : "Awaiting your confirmation"
            }
        >
            {hasDrift && <DriftBanner />}
            {isIrreversible && <IrreversibleBanner />}
            {proposal.scope === "single" ? (
                <DiffList patch={patch} />
            ) : (
                <div className="space-y-2">
                    <DiffList patch={patch} />
                    <p className="text-xs text-tertiary">
                        Sample of affected rows:
                    </p>
                    <pre className="max-h-40 overflow-auto rounded-md bg-secondary/30 p-2 text-xs text-tertiary">
                        {proposal.sampleJson}
                    </pre>
                </div>
            )}
            <div className="mt-4 flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-md border border-secondary px-3 py-1.5 text-sm font-medium text-secondary hover:bg-secondary/50"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={disabled}
                    className={cx(
                        "rounded-md px-3 py-1.5 text-sm font-medium text-white",
                        disabled
                            ? "bg-utility-brand-300"
                            : "bg-utility-brand-600 hover:bg-utility-brand-700",
                    )}
                >
                    {disabled && isIrreversible ? `Confirm (${secondsLeft}s)` : "Confirm"}
                </button>
            </div>
        </ToolCardShell>
    );
}

function ExecutingView({ proposal }: { proposal: AgentProposalRow }) {
    return (
        <ToolCardShell
            title={proposal.summaryText || proposal.toolName}
            subtitle="Applying changes..."
        >
            <div className="flex items-center gap-3 text-sm text-tertiary">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-utility-brand-500 border-t-transparent" />
                <span>Executing proposal</span>
            </div>
        </ToolCardShell>
    );
}

function ExecutedView({
    proposal,
    onUndo,
}: {
    proposal: AgentProposalRow;
    onUndo: (token: string) => void;
}) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), UNDO_POLL_MS);
        return () => clearInterval(id);
    }, []);
    const undoWindowOpen =
        proposal.undoExpiresAt != null && now < proposal.undoExpiresAt && proposal.reversalToken;
    const token = proposal.reversalToken;
    const minutesLeft = proposal.undoExpiresAt
        ? Math.max(0, Math.round((proposal.undoExpiresAt - now) / 60_000))
        : 0;
    return (
        <ToolCardShell
            title={proposal.summaryText || proposal.toolName}
            subtitle={`Applied ${proposal.affectedCount} row${proposal.affectedCount === 1 ? "" : "s"}`}
        >
            <p className="text-sm text-utility-success-700">Change applied successfully.</p>
            {undoWindowOpen && token && (
                <div className="mt-3 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onUndo(token)}
                        className="rounded-md border border-secondary px-3 py-1.5 text-sm font-medium text-secondary hover:bg-secondary/50"
                    >
                        Undo
                    </button>
                    <span className="text-xs text-tertiary">
                        Available for {minutesLeft} more minute{minutesLeft === 1 ? "" : "s"}
                    </span>
                </div>
            )}
        </ToolCardShell>
    );
}

function CancelledView({ proposal }: { proposal: AgentProposalRow }) {
    return (
        <ToolCardShell
            title={proposal.summaryText || proposal.toolName}
            subtitle="Cancelled"
            className="opacity-70"
        >
            <p className="text-sm text-tertiary">This proposal was cancelled.</p>
        </ToolCardShell>
    );
}

function TimedOutView({ proposal }: { proposal: AgentProposalRow }) {
    return (
        <ToolCardShell title={proposal.summaryText || proposal.toolName} subtitle="Expired">
            <p className="text-sm text-utility-warning-700">
                Proposal expired. Ask the agent to retry if you still want the change.
            </p>
        </ToolCardShell>
    );
}

function RevertedView({ proposal }: { proposal: AgentProposalRow }) {
    const revertedAt = proposal.revertedAt
        ? new Date(proposal.revertedAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
          })
        : null;
    return (
        <ToolCardShell title={proposal.summaryText || proposal.toolName} subtitle="Reverted">
            <p className="text-sm text-tertiary">
                {revertedAt ? `Reverted at ${revertedAt}.` : "This change was reverted."}
            </p>
        </ToolCardShell>
    );
}

function FailedView({ proposal }: { proposal: AgentProposalRow }) {
    return (
        <ToolCardShell title={proposal.summaryText || proposal.toolName} subtitle="Failed">
            <p className="text-sm text-utility-error-700">
                {proposal.errorSummary ?? "The change failed to apply."}
            </p>
        </ToolCardShell>
    );
}

export function ProposalConfirmCard({ proposalId }: Props) {
    const proposal = useLiveProposal(proposalId);
    const hint = useToolHintSend();

    if (proposal === undefined) return <ProposalConfirmCardSkeleton />;
    if (proposal === null) {
        return (
            <ToolCardShell title="Proposal not found">
                <p className="text-sm text-tertiary">
                    The proposal may have expired or been reverted.
                </p>
            </ToolCardShell>
        );
    }

    switch (proposal.state) {
        case "awaiting_confirmation":
            return (
                <AwaitingView
                    proposal={proposal}
                    onConfirm={() => {
                        void hint.confirmProposal(proposalId);
                    }}
                    onCancel={() => {
                        void hint.cancelProposal(proposalId);
                    }}
                />
            );
        case "executing":
            return <ExecutingView proposal={proposal} />;
        case "executed":
            return (
                <ExecutedView
                    proposal={proposal}
                    onUndo={(token) => {
                        void hint.undoMutation(token);
                    }}
                />
            );
        case "cancelled":
            return <CancelledView proposal={proposal} />;
        case "timed_out":
            return <TimedOutView proposal={proposal} />;
        case "reverted":
            return <RevertedView proposal={proposal} />;
        case "failed":
            return <FailedView proposal={proposal} />;
        case "proposed":
        case "confirmed":
        default:
            // Transient: W2 transitions through these synchronously; fall through to skeleton.
            return <ProposalConfirmCardSkeleton />;
    }
}
