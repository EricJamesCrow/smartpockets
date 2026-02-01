"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { PendingApproval } from "./PendingApproval";

interface ApprovalGateProps {
  children: React.ReactNode;
}

export function ApprovalGate({ children }: ApprovalGateProps) {
  const user = useQuery(api.users.current, {});

  // Still loading user data
  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="size-8 animate-spin rounded-full border-4 border-border-brand border-t-transparent" />
      </div>
    );
  }

  // User not logged in (shouldn't happen in (app) routes, but handle gracefully)
  if (user === null) {
    return null;
  }

  // User not approved - show blocking screen
  if (!user.approved) {
    return <PendingApproval />;
  }

  // User approved - render app
  return <>{children}</>;
}
