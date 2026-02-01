"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import { IconNotification } from "@repo/ui/untitledui/application/notifications/notifications";
import { SectionHeader } from "@repo/ui/untitledui/application/section-headers/section-headers";
import { SectionLabel } from "@repo/ui/untitledui/application/section-headers/section-label";
import { Toggle } from "@repo/ui/untitledui/base/toggle/toggle";

// Default values matching the original UI
const DEFAULTS = {
    comments: { push: true, email: true, sms: false },
    tags: { push: true, email: false, sms: false },
    reminders: { push: false, email: false, sms: false },
    moreActivity: { push: false, email: false, sms: false },
};

type Category = "comments" | "tags" | "reminders" | "moreActivity";
type Channel = "push" | "email" | "sms";

export default function NotificationsPage() {
    const prefs = useQuery(api.userPreferences.get);

    // Optimistic update for instant UI feedback
    const updateNotification = useMutation(
        api.userPreferences.updateNotification
    ).withOptimisticUpdate((localStore, args) => {
        const current = localStore.getQuery(api.userPreferences.get, {});
        if (current !== undefined && current !== null) {
            const notifications = current.notifications ?? {};
            const category =
                (notifications as Record<string, Record<string, boolean>>)[
                    args.category
                ] ?? {};
            localStore.setQuery(api.userPreferences.get, {}, {
                ...current,
                notifications: {
                    ...notifications,
                    [args.category]: {
                        ...category,
                        [args.channel]: args.value,
                    },
                },
            });
        }
    });

    // Helper to get value with defaults
    const getValue = (category: Category, channel: Channel): boolean => {
        const notifs = prefs?.notifications as
            | Record<string, Record<string, boolean>>
            | undefined;
        return notifs?.[category]?.[channel] ?? DEFAULTS[category][channel];
    };

    // Handler with error toast
    const handleToggle = async (
        category: Category,
        channel: Channel,
        value: boolean
    ) => {
        try {
            await updateNotification({ category, channel, value });
        } catch {
            toast.custom((t) => (
                <IconNotification
                    title="Failed to update"
                    description="Your preference could not be saved. Please try again."
                    color="error"
                    onClose={() => toast.dismiss(t)}
                />
            ));
        }
    };

    // Loading state
    if (prefs === undefined) {
        return (
            <div className="flex flex-col gap-6 px-4 lg:px-8">
                <SectionHeader.Root>
                    <SectionHeader.Group>
                        <div className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
                            <SectionHeader.Heading>
                                Notification settings
                            </SectionHeader.Heading>
                            <SectionHeader.Subheading>
                                We may still send you important notifications
                                about your account outside of your notification
                                settings.
                            </SectionHeader.Subheading>
                        </div>
                    </SectionHeader.Group>
                </SectionHeader.Root>
                <div className="flex items-center justify-center py-16">
                    <p className="text-sm text-tertiary">
                        Loading preferences...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 px-4 lg:px-8">
            <SectionHeader.Root>
                <SectionHeader.Group>
                    <div className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
                        <SectionHeader.Heading>
                            Notification settings
                        </SectionHeader.Heading>
                        <SectionHeader.Subheading>
                            We may still send you important notifications about
                            your account outside of your notification settings.
                        </SectionHeader.Subheading>
                    </div>
                </SectionHeader.Group>
            </SectionHeader.Root>

            <div className="flex flex-col gap-5">
                {/* Comments */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_minmax(480px,512px)] lg:gap-16">
                    <SectionLabel.Root
                        size="sm"
                        title="Comments"
                        description="These are notifications for comments on your posts and replies to your comments."
                    />

                    <div className="flex w-max flex-col gap-4">
                        <Toggle
                            slim
                            isSelected={getValue("comments", "push")}
                            onChange={(value) =>
                                handleToggle("comments", "push", value)
                            }
                            label="Push"
                            size="sm"
                        />
                        <Toggle
                            slim
                            isSelected={getValue("comments", "email")}
                            onChange={(value) =>
                                handleToggle("comments", "email", value)
                            }
                            label="Email"
                            size="sm"
                        />
                        <Toggle
                            slim
                            isSelected={getValue("comments", "sms")}
                            onChange={(value) =>
                                handleToggle("comments", "sms", value)
                            }
                            label="SMS"
                            size="sm"
                        />
                    </div>
                </div>

                <hr
                    className="h-px w-full border-none bg-border-secondary"
                    aria-hidden="true"
                />

                {/* Tags */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_minmax(480px,512px)] lg:gap-16">
                    <SectionLabel.Root
                        size="sm"
                        title="Tags"
                        description="These are notifications for when someone tags you in a comment, post or story."
                    />

                    <div className="flex w-max flex-col gap-4">
                        <Toggle
                            slim
                            isSelected={getValue("tags", "push")}
                            onChange={(value) =>
                                handleToggle("tags", "push", value)
                            }
                            label="Push"
                            size="sm"
                        />
                        <Toggle
                            slim
                            isSelected={getValue("tags", "email")}
                            onChange={(value) =>
                                handleToggle("tags", "email", value)
                            }
                            label="Email"
                            size="sm"
                        />
                        <Toggle
                            slim
                            isSelected={getValue("tags", "sms")}
                            onChange={(value) =>
                                handleToggle("tags", "sms", value)
                            }
                            label="SMS"
                            size="sm"
                        />
                    </div>
                </div>

                <hr
                    className="h-px w-full border-none bg-border-secondary"
                    aria-hidden="true"
                />

                {/* Reminders */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_minmax(480px,512px)] lg:gap-16">
                    <SectionLabel.Root
                        size="sm"
                        title="Reminders"
                        description="These are notifications to remind you of updates you might have missed."
                    />

                    <div className="flex w-max flex-col gap-4">
                        <Toggle
                            slim
                            isSelected={getValue("reminders", "push")}
                            onChange={(value) =>
                                handleToggle("reminders", "push", value)
                            }
                            label="Push"
                            size="sm"
                        />
                        <Toggle
                            slim
                            isSelected={getValue("reminders", "email")}
                            onChange={(value) =>
                                handleToggle("reminders", "email", value)
                            }
                            label="Email"
                            size="sm"
                        />
                        <Toggle
                            slim
                            isSelected={getValue("reminders", "sms")}
                            onChange={(value) =>
                                handleToggle("reminders", "sms", value)
                            }
                            label="SMS"
                            size="sm"
                        />
                    </div>
                </div>

                <hr
                    className="h-px w-full border-none bg-border-secondary"
                    aria-hidden="true"
                />

                {/* More activity about you */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_minmax(480px,512px)] lg:gap-16">
                    <SectionLabel.Root
                        size="sm"
                        title="More activity about you"
                        description="These are notifications for posts on your profile, likes and other reactions to your posts, and more."
                    />

                    <div className="flex w-max flex-col gap-4">
                        <Toggle
                            slim
                            isSelected={getValue("moreActivity", "push")}
                            onChange={(value) =>
                                handleToggle("moreActivity", "push", value)
                            }
                            label="Push"
                            size="sm"
                        />
                        <Toggle
                            slim
                            isSelected={getValue("moreActivity", "email")}
                            onChange={(value) =>
                                handleToggle("moreActivity", "email", value)
                            }
                            label="Email"
                            size="sm"
                        />
                        <Toggle
                            slim
                            isSelected={getValue("moreActivity", "sms")}
                            onChange={(value) =>
                                handleToggle("moreActivity", "sms", value)
                            }
                            label="SMS"
                            size="sm"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
