"use client";

import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@convex/_generated/api";
import { Toggle } from "@repo/ui/untitledui/base/toggle/toggle";
import { cx } from "@repo/ui/utils";

type PrefKey =
    | "weekly-digest"
    | "promo-warning"
    | "statement-closing"
    | "anomaly-alert"
    | "subscription-detected";

type Row = {
    key: PrefKey | "master";
    label: string;
    description: string;
};

const SECTIONS: Array<{ title: string; rows: Row[] }> = [
    {
        title: "Financial alerts",
        rows: [
            {
                key: "promo-warning",
                label: "Deferred interest and promo expirations",
                description:
                    "Reminders at 30, 14, 7, and 1 day before a deferred interest promo expires.",
            },
            {
                key: "statement-closing",
                label: "Statement closing reminders",
                description:
                    "Heads-up 3 days and 1 day before each card's statement closes.",
            },
            {
                key: "anomaly-alert",
                label: "Unusual transactions",
                description:
                    "Transactions that look different from your usual spending patterns.",
            },
            {
                key: "subscription-detected",
                label: "Detected subscriptions",
                description:
                    "Recurring charges we spot. You confirm or dismiss each.",
            },
        ],
    },
    {
        title: "Digests",
        rows: [
            {
                key: "weekly-digest",
                label: "Weekly summary",
                description: "A recap of spend, closing statements, and flags.",
            },
        ],
    },
];

export function PreferencesForm() {
    const prefs = useQuery(api.email.queries.getNotificationPreferences, {});
    const bounceStatus = useQuery(api.email.queries.getBounceStatus, {});
    const update = useMutation(api.email.mutations.updateNotificationPreference);

    if (prefs === undefined || bounceStatus === undefined) {
        return <div className="mt-6 text-sm text-tertiary">Loading...</div>;
    }

    const isEnabled = (key: PrefKey | "master"): boolean => {
        switch (key) {
            case "weekly-digest":
                return prefs.weeklyDigestEnabled;
            case "promo-warning":
                return prefs.promoWarningEnabled;
            case "statement-closing":
                return prefs.statementReminderEnabled;
            case "anomaly-alert":
                return prefs.anomalyAlertEnabled;
            case "subscription-detected":
                return prefs.subscriptionDetectedEnabled;
            case "master":
                return !prefs.masterUnsubscribed;
        }
    };

    const handleToggle = (templateKey: PrefKey | "master") => (enabled: boolean) => {
        update({ templateKey, enabled });
    };

    return (
        <div className="mt-8 space-y-10">
            {bounceStatus.status !== "active" && (
                <div className="rounded-md border border-warning-subtle bg-warning-subtle px-4 py-3 text-sm text-primary">
                    <p className="font-medium">We cannot reach your email.</p>
                    <p className="mt-1 text-tertiary">
                        {bounceStatus.status === "suppressed_bounce"
                            ? "Your last few messages bounced. Update your email address in your account settings to resume alerts."
                            : "You marked a recent email as spam, so non-essential emails are paused. If this was a mistake, contact support."}
                    </p>
                </div>
            )}

            {SECTIONS.map((section) => (
                <section key={section.title} className="space-y-4">
                    <h2 className="text-md font-semibold text-primary">{section.title}</h2>
                    <div className="space-y-6">
                        {section.rows.map((row) => (
                            <div
                                key={row.key}
                                className={cx(
                                    "flex items-start justify-between gap-4 border-b border-secondary pb-4 last:border-0",
                                )}
                            >
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-primary">{row.label}</p>
                                    <p className="mt-1 text-xs text-tertiary">{row.description}</p>
                                </div>
                                <Toggle
                                    isSelected={isEnabled(row.key)}
                                    onChange={handleToggle(row.key)}
                                    size="sm"
                                />
                            </div>
                        ))}
                    </div>
                </section>
            ))}

            <section className="space-y-4">
                <h2 className="text-md font-semibold text-primary">Account</h2>
                <div className="flex items-start justify-between gap-4 border-b border-secondary pb-4">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-primary">Pause all non-essential email</p>
                        <p className="mt-1 text-xs text-tertiary">
                            You will still receive required emails for account security, reconnection prompts, and persistent
                            sync errors.
                        </p>
                    </div>
                    <Toggle
                        isSelected={isEnabled("master")}
                        onChange={handleToggle("master")}
                        size="sm"
                    />
                </div>
            </section>
        </div>
    );
}
