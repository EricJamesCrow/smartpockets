"use client";

import { ToolCardShell } from "../shared/ToolCardShell";
import { useLiveReminders } from "../shared/liveRowsHooks";
import { useToolHintSend } from "../shared/useToolHintSend";
import type { ToolOutput, ToolResultComponentProps } from "../types";
import { RemindersListSkeleton } from "./RemindersListSkeleton";

type ReminderPreview = {
    id: string;
    title: string;
    dueAt: number;
    notes?: string | null;
    isDone: boolean;
    relatedResourceType: "creditCard" | "promoRate" | "installmentPlan" | "transaction" | "none";
    relatedResourceId?: string | null;
};

type Preview = {
    reminders?: ReminderPreview[];
    summary?: string;
};

type Bucket = "overdue" | "today" | "this_week" | "later" | "done";

const BUCKET_LABELS: Record<Bucket, string> = {
    overdue: "Overdue",
    today: "Today",
    this_week: "This week",
    later: "Later",
    done: "Completed",
};

function bucketFor(reminder: ReminderPreview, now: number): Bucket {
    if (reminder.isDone) return "done";
    const oneDay = 24 * 60 * 60 * 1000;
    const dayDiff = (reminder.dueAt - now) / oneDay;
    if (dayDiff < -0.5) return "overdue";
    if (dayDiff < 1) return "today";
    if (dayDiff < 7) return "this_week";
    return "later";
}

function formatDueAt(ms: number): string {
    const d = new Date(ms);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function RemindersList(props: ToolResultComponentProps<unknown, ToolOutput<Preview>>) {
    const { output, state } = props;
    const live = useLiveReminders(output?.ids ?? []);
    const hint = useToolHintSend();

    if (state === "input-streaming" || !output) {
        return <RemindersListSkeleton />;
    }

    const reminders: ReminderPreview[] = live
        ? live.map((r) => ({
              id: r._id,
              title: r.title,
              dueAt: r.dueAt,
              notes: r.notes,
              isDone: r.isDone,
              relatedResourceType: r.relatedResourceType,
              relatedResourceId: r.relatedResourceId,
          }))
        : output.preview.reminders ?? [];

    const createAction = (
        <button
            type="button"
            onClick={() => {
                void hint.createReminder({
                    title: "New reminder",
                    dueAt: Date.now() + 24 * 60 * 60 * 1000,
                });
            }}
            className="rounded-md border border-secondary px-2 py-1 text-xs font-medium text-secondary hover:bg-secondary/50"
        >
            New reminder
        </button>
    );

    if (reminders.length === 0) {
        return (
            <ToolCardShell title={output.preview.summary ?? "Reminders"} action={createAction}>
                <p className="text-sm text-tertiary">No reminders yet.</p>
            </ToolCardShell>
        );
    }

    const now = Date.now();
    const byBucket: Record<Bucket, ReminderPreview[]> = {
        overdue: [],
        today: [],
        this_week: [],
        later: [],
        done: [],
    };
    for (const reminder of reminders) {
        byBucket[bucketFor(reminder, now)].push(reminder);
    }
    const orderedBuckets: Bucket[] = ["overdue", "today", "this_week", "later", "done"];

    return (
        <ToolCardShell
            title={output.preview.summary ?? "Reminders"}
            subtitle={`${reminders.length} total`}
            action={createAction}
        >
            <div className="space-y-4">
                {orderedBuckets.map((bucket) => {
                    const items = byBucket[bucket];
                    if (items.length === 0) return null;
                    return (
                        <section key={bucket}>
                            <h4 className="mb-1 text-xs font-semibold uppercase text-tertiary">
                                {BUCKET_LABELS[bucket]}
                            </h4>
                            <ul className="divide-y divide-secondary">
                                {items.map((reminder) => (
                                    <li key={reminder.id} className="flex items-start justify-between gap-3 py-2">
                                        <div className="min-w-0 flex-1">
                                            <p
                                                className={
                                                    reminder.isDone
                                                        ? "text-sm text-tertiary line-through"
                                                        : "text-sm text-primary"
                                                }
                                            >
                                                {reminder.title}
                                            </p>
                                            {reminder.notes && (
                                                <p className="mt-0.5 line-clamp-2 text-xs text-tertiary">
                                                    {reminder.notes}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <span className="text-xs text-tertiary">
                                                {formatDueAt(reminder.dueAt)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    void hint.deleteReminder(reminder.id);
                                                }}
                                                className="text-xs text-tertiary hover:text-utility-error-700"
                                                aria-label="Delete reminder"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                })}
            </div>
        </ToolCardShell>
    );
}
