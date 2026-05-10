"use client";

import type { ReactElement } from "react";
import { motion } from "motion/react";
import { proposalFallback, toolResultRegistry } from "./registry";
import { useToolHintSend } from "./shared/useToolHintSend";
import type { ReadToolName, ToolName, ToolResultComponentProps } from "./types";
import { ToolErrorRow } from "@/components/chat/ToolErrorRow";
import { ToolCallDisplay } from "@/components/chat/ToolCallDisplay";
import { deriveSummary } from "@/lib/chat/toolSummary";
import { getToolIcon } from "@/lib/icons/toolIconMap";

const PROPOSAL_PREFIX = "propose_";
const PROPOSAL_READ_TOOL = "get_proposal";

/**
 * Tools that are safe to re-dispatch on a failed run. CROWDEV-393.
 *
 * Constraint: read-only and idempotent. Replaying these neither double-mutates
 * nor commits a side-effect the user didn't ask for again. We deliberately
 * exclude every `propose_*` and `execute_*` tool here - those mutate state and
 * must be re-confirmed through the proposal flow. We also exclude tools whose
 * payload is too large or expensive to silently re-run on a transient blip
 * (none in the current set, but keep the allowlist explicit so future tool
 * additions get a deliberate review).
 */
const RETRYABLE_READ_TOOLS = new Set<ToolName>([
  "list_credit_cards",
  "get_credit_card_detail",
  "list_transactions",
  "search_merchants",
  "get_spend_by_category",
  "get_spend_over_time",
  "get_plaid_health",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Dispatcher per spec W3 §3.4 / W1 §7.
export function ToolResultRenderer(props: ToolResultComponentProps) {
  const { toolName, state, errorText, input } = props;
  const hint = useToolHintSend();

  let body: ReactElement;
  if (state === "output-error") {
    // Build a retry handler only for read-only / idempotent tools whose input
    // we can confidently round-trip. The original failed call's args live in
    // `props.input`, parsed from `agentMessages.toolCallsJson` upstream in
    // `MessageBubble`. If parsing failed `input` is `{}`; we still allow that
    // case for argless tools like `get_plaid_health`.
    const isRetryable = RETRYABLE_READ_TOOLS.has(toolName);
    const retryArgs = isRecord(input) ? (input as Record<string, unknown>) : {};
    const onRetry = isRetryable
      ? () => {
          void hint.retryFailedTool(toolName, retryArgs);
        }
      : undefined;
    body = (
      <ToolErrorRow
        toolName={toolName}
        errorText={errorText ?? "Tool failed"}
        onRetry={onRetry}
      />
    );
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
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
    >
      {body}
    </motion.div>
  );
}
