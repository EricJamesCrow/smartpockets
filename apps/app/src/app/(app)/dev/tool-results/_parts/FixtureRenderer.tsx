"use client";

import { useEffect, useState } from "react";

import { ChatInteractionProvider } from "@/components/chat/ChatInteractionContext";
import {
    proposalFallback,
    toolResultRegistry,
} from "@/components/chat/tool-results";
import {
    LivePreviewOverrideProvider,
    type LivePreviewOverrides,
} from "@/components/chat/tool-results/shared/liveRowsHooks";
import type {
    AgentThreadId,
    ProposalToolOutput,
    ToolResultComponentProps,
} from "@/components/chat/tool-results/types";
import { cx } from "@/utils/cx";

type AnyProps = ToolResultComponentProps<unknown, unknown>;

type FixtureEntry = {
    name: string;
    props: AnyProps;
    overrides?: LivePreviewOverrides;
};

type FixtureModule = Record<
    string,
    | AnyProps
    | { props: AnyProps; overrides?: LivePreviewOverrides }
>;

const THREAD_ID = "fx-thread" as unknown as AgentThreadId;

async function loadFixture(toolName: string): Promise<FixtureEntry[]> {
    try {
        const mod = (await import(
            `@/components/chat/tool-results/__fixtures__/${toolName}.fixture`
        )) as FixtureModule;
        const entries: FixtureEntry[] = [];
        for (const [name, value] of Object.entries(mod)) {
            if (name.startsWith("_")) continue;
            if (!value || typeof value !== "object") continue;
            if ("props" in value && "toolName" in (value.props as AnyProps)) {
                entries.push({ name, props: value.props, overrides: value.overrides });
            } else if ("toolName" in (value as AnyProps)) {
                entries.push({ name, props: value as AnyProps });
            }
        }
        return entries;
    } catch (err) {
        console.error(`Failed to load fixture for ${toolName}:`, err);
        return [];
    }
}

function renderFixture(toolName: string, props: AnyProps) {
    if (toolName.startsWith("propose_")) {
        const Fallback = proposalFallback;
        return <Fallback {...(props as ToolResultComponentProps<unknown, ProposalToolOutput>)} />;
    }
    const entry = toolResultRegistry[toolName as keyof typeof toolResultRegistry];
    if (!entry) {
        return <p className="text-sm text-utility-error-700">No registry entry for {toolName}.</p>;
    }
    const Component = entry.Component;
    return <Component {...props} />;
}

export function FixtureRenderer({ toolName }: { toolName: string }) {
    const [fixtures, setFixtures] = useState<FixtureEntry[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        void loadFixture(toolName).then((entries) => {
            if (!cancelled) setFixtures(entries);
        });
        return () => {
            cancelled = true;
        };
    }, [toolName]);

    if (fixtures === null) {
        return <p className="text-sm text-tertiary">Loading fixtures...</p>;
    }

    if (fixtures.length === 0) {
        return (
            <p className="text-sm text-tertiary">
                No fixtures exported for {toolName}. Add a file at
                <code className="ml-1 rounded bg-secondary/40 px-1">
                    apps/app/src/components/chat/tool-results/__fixtures__/{toolName}.fixture.ts
                </code>
                .
            </p>
        );
    }

    return (
        <ChatInteractionProvider threadId={THREAD_ID}>
            <div className="space-y-8">
                {fixtures.map(({ name, props, overrides }) => (
                    <article key={name} className="space-y-3">
                        <header className="flex items-center justify-between">
                            <h2 className={cx("text-xs font-semibold uppercase tracking-wide text-tertiary")}>
                                {name}
                            </h2>
                            <code className="text-xs text-tertiary">{props.state}</code>
                        </header>
                        <LivePreviewOverrideProvider value={overrides ?? {}}>
                            {renderFixture(toolName, { ...props, threadId: THREAD_ID })}
                        </LivePreviewOverrideProvider>
                    </article>
                ))}
            </div>
        </ChatInteractionProvider>
    );
}
