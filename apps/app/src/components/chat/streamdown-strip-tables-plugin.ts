import type { Element, Root, RootContent } from "hast";

/*
 * CROWDEV-425 — Streamdown rehype plugin that removes any `<table>` block
 * from an assistant message's HAST tree.
 *
 * Defense-in-depth backstop for system-prompt rule 11 ("NEVER emit a
 * markdown table in your prose"). The chat surface renders tabular data
 * exclusively through tool-result widgets; if the model slips up and
 * still emits a markdown table next to a widget (or inside an inline-mode
 * narrow summary), this plugin drops the table from the rendered output
 * before the user ever sees it.
 *
 * Why a render-time strip rather than a server-side response edit:
 *
 * 1. The agent runtime streams tokens directly to the client; rewriting
 *    mid-stream would need a token-level state machine that respects
 *    open/closed table fences. Cheaper to let Streamdown parse, then
 *    walk the HAST tree and drop table nodes.
 * 2. Other surfaces that consume `agentMessages.text` (e.g. future export
 *    or transcript views) may legitimately want the raw markdown; the
 *    rendered chat surface is the only place that must never show a
 *    duplicate table.
 *
 * Scope: removes `<table>` element nodes from the top-level block list and
 * from nested containers. Streamdown processes each markdown block
 * independently, so a single markdown table renders as a single
 * top-level `<table>` element — the plugin removes it in O(blocks).
 */

function isElement(node: RootContent | undefined): node is Element {
    return node !== undefined && node.type === "element";
}

function stripTablesFromChildren(parent: Element | Root): void {
    // Iterate in reverse so splice does not shift indexes we still need.
    for (let index = parent.children.length - 1; index >= 0; index -= 1) {
        const child = parent.children[index];
        if (!isElement(child)) continue;
        if (child.tagName === "table") {
            parent.children.splice(index, 1);
            continue;
        }
        // Recurse into containers in case Streamdown wraps the table in a
        // div / figure / scroll-shell. Tables nested inside an unrelated
        // block (a list item, for example) are also dropped — that case
        // would have rendered as duplicate tabular data anyway.
        stripTablesFromChildren(child);
    }
}

interface StreamdownStripTablesOptions {
    /**
     * When `false` the plugin is a no-op. The caller flips this on for
     * assistant messages and leaves it off for non-chat surfaces.
     */
    active?: boolean;
}

export function streamdownStripTablesPlugin(
    options: StreamdownStripTablesOptions = {},
) {
    const active = options.active ?? false;

    return function transformer(tree: Root): void {
        if (!active) return;
        stripTablesFromChildren(tree);
    };
}
