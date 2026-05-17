type RuntimeLogEvent =
  | "agent_runtime_error"
  | "agent_tool_error"
  | "agent_cleanup_error"
  | "agent_compaction_error"
  | "agent_titling_error"
  | "agent_write_tool_error";

type RuntimeErrorLogInput = {
  event?: RuntimeLogEvent;
  phase?: string;
  toolName?: string;
  bucket?: string;
  modelId?: string;
  error?: unknown;
  errorCode?: string;
  retryable?: boolean;
  correlationParts?: Array<unknown>;
};

export type SanitizedAgentRuntimeErrorLog = {
  event: RuntimeLogEvent;
  phase?: string;
  toolName?: string;
  bucket?: string;
  modelId?: string;
  errorClass: string;
  errorCode?: string;
  retryable?: boolean;
  correlationId?: string;
};

const MAX_FIELD_LENGTH = 80;

function cleanField(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const cleaned = String(value).replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, MAX_FIELD_LENGTH);
  return cleaned.length > 0 ? cleaned : undefined;
}

function errorClass(error: unknown): string {
  if (error instanceof Error) return cleanField(error.name) ?? "Error";
  if (typeof error === "object" && error !== null) {
    const constructorName = (error as { constructor?: { name?: string } }).constructor?.name;
    return cleanField(constructorName) ?? "Object";
  }
  return cleanField(typeof error) ?? "unknown";
}

function errorCode(input: RuntimeErrorLogInput): string | undefined {
  const explicit = cleanField(input.errorCode);
  if (explicit) return explicit;
  const candidate = input.error as { code?: unknown; name?: unknown } | undefined;
  return cleanField(candidate?.code);
}

export function correlationIdFromParts(parts: Array<unknown> | undefined): string | undefined {
  const values = (parts ?? [])
    .map((part) => cleanField(part))
    .filter((part): part is string => Boolean(part));
  if (values.length === 0) return undefined;
  let hash = 0x811c9dc5;
  for (const char of values.join("\u001f")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `cid_${hash.toString(36).padStart(7, "0")}`;
}

export function sanitizeAgentRuntimeErrorLog(input: RuntimeErrorLogInput): SanitizedAgentRuntimeErrorLog {
  const record: SanitizedAgentRuntimeErrorLog = {
    event: input.event ?? "agent_runtime_error",
    errorClass: errorClass(input.error),
  };
  const phase = cleanField(input.phase);
  if (phase) record.phase = phase;
  const toolName = cleanField(input.toolName);
  if (toolName) record.toolName = toolName;
  const bucket = cleanField(input.bucket);
  if (bucket) record.bucket = bucket;
  const modelId = cleanField(input.modelId);
  if (modelId) record.modelId = modelId;
  const code = errorCode(input);
  if (code) record.errorCode = code;
  if (typeof input.retryable === "boolean") record.retryable = input.retryable;
  const correlationId = correlationIdFromParts(input.correlationParts);
  if (correlationId) record.correlationId = correlationId;
  return record;
}

export function logAgentRuntimeError(input: RuntimeErrorLogInput): void {
  console.warn("[agent.runtime.error]", sanitizeAgentRuntimeErrorLog(input));
}
