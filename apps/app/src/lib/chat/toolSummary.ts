/**
 * Derive a short collapsed-header summary from a tool's output. Returns
 * undefined for tools where the rich tool-result component is the right
 * UI — generic fallback path only.
 *
 * Used by `ToolResultRenderer` when no per-tool component matches and we
 * fall back to the generic `ToolCallDisplay`. The returned string is
 * truncated by the caller; keep it short (≤ ~40 chars) for ideal layout.
 */
export function deriveSummary(toolName: string, output: unknown): string | undefined {
    void toolName;
    if (!output || typeof output !== "object") return undefined;
    const o = output as Record<string, unknown>;

    if (Array.isArray(o.ids)) {
        const n = (o.ids as unknown[]).length;
        return `${n} ${n === 1 ? "result" : "results"}`;
    }
    if (typeof o.count === "number") {
        return `${o.count} ${o.count === 1 ? "result" : "results"}`;
    }
    if (
        o.preview &&
        typeof o.preview === "object" &&
        "summary" in o.preview &&
        typeof (o.preview as { summary: unknown }).summary === "string"
    ) {
        return (o.preview as { summary: string }).summary;
    }
    return undefined;
}
