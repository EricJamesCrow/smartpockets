"use client";

import { type ReactNode } from "react";

interface ChatContainerProps {
  children: ReactNode;
}

export function ChatContainer({ children }: ChatContainerProps) {
  return (
    <div className="flex h-screen flex-col bg-primary">
      <div className="relative flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
