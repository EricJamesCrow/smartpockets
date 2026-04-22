"use client";

import type { ReactElement } from "react";
import { proposalFallback, toolResultRegistry } from "./registry";
import type { ReadToolName, ToolResultComponentProps } from "./types";
import { ToolErrorRow } from "@/components/chat/ToolErrorRow";
import { ToolCallDisplay } from "@/components/chat/ToolCallDisplay";

const PROPOSAL_PREFIX = "propose_";
const PROPOSAL_READ_TOOL = "get_proposal";

// Dispatcher per spec W3 §3.4 / W1 §7.
export function ToolResultRenderer(props: ToolResultComponentProps) {
  const { toolName, state, errorText } = props;

  if (state === "output-error") {
    return <ToolErrorRow toolName={toolName} errorText={errorText ?? "Tool failed"} />;
  }

  if (toolName.startsWith(PROPOSAL_PREFIX) || toolName === PROPOSAL_READ_TOOL) {
    const ProposalFallback = proposalFallback as unknown as (
      props: ToolResultComponentProps,
    ) => ReactElement;
    return <ProposalFallback {...props} />;
  }

  const entry = toolResultRegistry[toolName as ReadToolName];
  if (entry) {
    if (state === "input-streaming" && entry.Skeleton) {
      const Skeleton = entry.Skeleton;
      return <Skeleton input={props.input} />;
    }
    const Component = entry.Component;
    return <Component {...props} />;
  }

  return (
    <ToolCallDisplay
      toolName={toolName}
      input={props.input}
      output={props.output ?? undefined}
      error={errorText}
      state={state}
    />
  );
}
