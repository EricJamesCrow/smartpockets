"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

interface ChatErrorBoundaryProps {
  children: ReactNode;
}

interface ChatErrorBoundaryState {
  error: Error | null;
}

export class ChatErrorBoundary extends Component<ChatErrorBoundaryProps, ChatErrorBoundaryState> {
  state: ChatErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ChatErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ChatErrorBoundary]", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-md text-center">
            <p className="text-sm font-semibold text-primary">Something went wrong in chat.</p>
            <p className="mt-2 text-xs text-tertiary">{this.state.error.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
