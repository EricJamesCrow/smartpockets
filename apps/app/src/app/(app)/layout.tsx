"use client";

import { AlertBanner } from "@/components/application/AlertBanner";
import { DashboardSidebar } from "@/components/application/dashboard-sidebar";
import { api } from "@convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";

const BOOTSTRAP_RETRY_DELAY_MS = 2_000;

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
    const viewer = useQuery(api.users.current, isAuthenticated ? {} : "skip");
    const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
    const [didAttemptBootstrap, setDidAttemptBootstrap] = useState(false);

    useEffect(() => {
        if (!isAuthenticated || viewer !== null || didAttemptBootstrap) {
            return;
        }

        let isCancelled = false;
        let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

        setDidAttemptBootstrap(true);
        void ensureCurrentUser({}).catch((error) => {
            if (isCancelled) {
                return;
            }

            console.error("[AppLayout] Failed to ensure current user", error);

            retryTimeoutId = setTimeout(() => {
                if (isCancelled) {
                    return;
                }
                setDidAttemptBootstrap(false);
            }, BOOTSTRAP_RETRY_DELAY_MS);
        });

        return () => {
            isCancelled = true;

            if (retryTimeoutId !== null) {
                clearTimeout(retryTimeoutId);
            }
        };
    }, [didAttemptBootstrap, ensureCurrentUser, isAuthenticated, viewer]);

    // Block app queries until Convex auth and viewer record are both ready.
    if (isAuthLoading || (isAuthenticated && viewer === undefined)) {
        return (
            <div className="bg-primary flex min-h-screen items-center justify-center p-6">
                <div className="flex items-center gap-3 font-[family-name:var(--font-geist-mono)] text-[0.72rem] uppercase tracking-[0.22em] text-tertiary">
                    <span className="h-1 w-1 rounded-full bg-[var(--sp-moss-mint)] shadow-[0_0_8px_2px_rgba(127,184,154,0.5)]" />
                    Loading your workspace
                </div>
            </div>
        );
    }

    // Clerk auth exists but Convex viewer record is not ready yet.
    if (isAuthenticated && viewer === null) {
        return (
            <div className="bg-primary flex min-h-screen items-center justify-center p-6">
                <div className="max-w-md text-center">
                    <p className="text-md font-semibold text-primary">
                        Setting up your <em className="font-[family-name:var(--font-fraunces)] font-medium italic">account</em>
                    </p>
                    <p className="mt-2 text-sm text-tertiary">
                        We are finishing account setup. This usually takes a moment.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-primary flex min-h-screen flex-col lg:flex-row">
            <DashboardSidebar />
            {/*
              CROWDEV-390: turn the chat / dashboard column into a `<main>`
              landmark so the document has exactly one main region (Lighthouse
              `landmark-one-main` failed before — chat / dashboard / settings
              pages all rendered into a bare <div>, which left the page
              landmark-less). The settings sub-route also has an internal
              `<main>` element; nesting two landmarks is allowed by HTML5
              (the inner one becomes the more specific main when navigated by
              assistive tech), but we'd prefer to remove the inner one as
              follow-up to keep the landmark structure flat.
            */}
            <main className="min-w-0 flex-1 flex flex-col">
                <AlertBanner />
                {children}
            </main>
        </div>
    );
}
