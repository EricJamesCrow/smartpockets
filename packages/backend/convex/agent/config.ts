import { anthropic } from "@ai-sdk/anthropic";

/**
 * Pricing constants: USD microcents per million tokens. `null` means the executor
 * must fill before commit. See specs/W2-agent-backend.research.md §9.
 * Update this file in the same PR that bumps PROMPT_VERSION.
 * TODO: verify before first prod deploy (research R9 deferred).
 */
export const MODEL_PRICING: Record<
  string,
  { inputPerM: number | null; outputPerM: number | null }
> = {
  "claude-sonnet-4-6": { inputPerM: null, outputPerM: null },
  "claude-haiku-4-5": { inputPerM: null, outputPerM: null },
};

export const AGENT_DEFAULT_MODEL =
  process.env.AGENT_MODEL_DEFAULT ?? "claude-sonnet-4-6";
export const AGENT_CLASSIFIER_MODEL =
  process.env.AGENT_MODEL_CLASSIFIER ?? "claude-haiku-4-5";

export function getAnthropicModel(modelId: string) {
  return anthropic(modelId);
}

export function computeUsdMicrocents(
  modelId: string,
  tokensIn: number,
  tokensOut: number,
): number {
  const rates = MODEL_PRICING[modelId];
  if (!rates || rates.inputPerM === null || rates.outputPerM === null) {
    return 0;
  }
  return Math.round(
    (tokensIn * rates.inputPerM + tokensOut * rates.outputPerM) / 1_000_000,
  );
}
