"use client";

import { api } from "@convex/_generated/api";
import { Toggle } from "@repo/ui/untitledui/base/toggle/toggle";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { useMutation } from "convex/react";

export function PreferencesForm() {
    const prefs = useQuery(api.email.queries.getNotificationPreferences, {});
    const bounceStatus = useQuery(api.email.queries.getBounceStatus, {});
    const update = useMutation(api.email.mutations.updateNotificationPreference);

    if (prefs === undefined || bounceStatus === undefined) {
        return <div className="mt-6 text-sm text-tertiary">Loading...</div>;
    }

    const handleMasterToggle = (enabled: boolean) => {
        update({ templateKey: "master", enabled });
    };

    return (
        <div className="mt-8 space-y-10">
            {bounceStatus.status !== "active" && (
                <div className="rounded-md border-warning-subtle bg-warning-subtle px-4 py-3 text-sm text-primary border">
                    <p className="font-medium">We cannot reach your email.</p>
                    <p className="mt-1 text-tertiary">
                        {bounceStatus.status === "suppressed_bounce"
                            ? "Your last few messages bounced. Update your email address in your account settings to resume alerts."
                            : "You marked a recent email as spam, so non-essential emails are paused. If this was a mistake, contact support."}
                    </p>
                </div>
            )}

            <section className="space-y-4">
                <h2 className="text-md font-semibold text-primary">Account</h2>
                <div className="gap-4 border-secondary pb-4 flex items-start justify-between border-b">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-primary">Non-essential email</p>
                        <p className="mt-1 text-xs text-tertiary">
                            You will still receive required emails for account security, reconnection prompts, and persistent sync errors.
                        </p>
                    </div>
                    <Toggle isSelected={!prefs.masterUnsubscribed} onChange={handleMasterToggle} size="sm" />
                </div>
            </section>
        </div>
    );
}
