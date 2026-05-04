"use client";

import type { ReactElement } from "react";
import { motion } from "motion/react";
import { proposalFallback, toolResultRegistry } from "./registry";
import type { ReadToolName, ToolResultComponentProps } from "./types";
import { ToolErrorRow } from "@/components/chat/ToolErrorRow";
import { ToolCallDisplay } from "@/components/chat/ToolCallDisplay";
import { deriveSummary } from "@/lib/chat/toolSummary";
import { getToolIcon } from "@/lib/icons/toolIconMap";

const PROPOSAL_PREFIX = "propose_";
const PROPOSAL_READ_TOOL = "get_proposal";

// Dispatcher per spec W3 §3.4 / W1 §7.
export function ToolResultRenderer(props: ToolResultComponentProps) {
  const { toolName, state, errorText } = props;

  let body: ReactElement;
  if (state === "output-error") {
    body = <ToolErrorRow toolName={toolName} errorText={errorText ?? "Tool failed"} />;
  } else if (toolName.startsWith(PROPOSAL_PREFIX) || toolName === PROPOSAL_READ_TOOL) {
    const ProposalFallback = proposalFallback as unknown as (
      props: ToolResultComponentProps,
    ) => ReactElement;
    body = <ProposalFallback {...props} />;
  } else {
    const entry = toolResultRegistry[toolName as ReadToolName];
    if (entry) {
      if (state === "input-streaming" && entry.Skeleton) {
        const Skeleton = entry.Skeleton;
        body = <Skeleton input={props.input} />;
      } else {
        const Component = entry.Component;
        body = <Component {...props} />;
      }
    } else {
      body = (
        <ToolCallDisplay
          toolName={toolName}
          input={props.input}
          output={props.output ?? undefined}
          error={errorText}
          state={state}
          icon={getToolIcon(toolName)}
          summary={deriveSummary(toolName, props.output)}
        />
      );
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
    >
      {body}
    </motion.div>
  );
}
