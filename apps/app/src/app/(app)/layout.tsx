"use client";

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
                <p className="text-sm text-tertiary">Loading your workspace...</p>
            </div>
        );
    }

    // Clerk auth exists but Convex viewer record is not ready yet.
    if (isAuthenticated && viewer === null) {
        return (
            <div className="bg-primary flex min-h-screen items-center justify-center p-6">
                <div className="max-w-md text-center">
                    <p className="text-md font-semibold text-primary">Setting up your account</p>
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
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}
