import type { Element, Root, RootContent } from "hast";

/*
 * CROWDEV-391 — Streamdown rehype plugin that injects an inline streaming
 * cursor as the trailing child of the block's deepest "leaf" text element.
 *
 * Streamdown splits the message into blocks and runs the same rehype
 * pipeline on each block's HAST tree separately. The plugin therefore
 * runs once per block — every block ends up with a cursor marker, and CSS
 * in `globals.css` (`.sp-stream-host > *:not(:last-child) .sp-stream-cursor`)
 * hides every marker that is not in the wrapper's last child. The result:
 * only the very last block on the page shows the pulsing cursor.
 *
 * Why per-block-and-CSS rather than "only last block"? Streamdown's
 * Block component fans out blocks in `J.map(...)` and shares one
 * `rehypePlugins` array across all of them — the plugin can't tell
 * which block index it's running on. CSS does the visual gating cheaply.
 *
 * Placement: walk from the block-root's last element child downwards
 * through container elements (`ul`, `ol`, `table`, `thead`, `tbody`,
 * `tr`, `blockquote`, `figure`, ...) until we hit a leaf text element
 * (`p`, `li`, `td`, `th`, `h1-h6`, `dd`, ...). The cursor `<span>` is
 * appended as the last child of that leaf so it sits inline immediately
 * after the last visible character — the goal of CROWDEV-391.
 *
 * For `<pre>` (Streamdown's syntax-highlighted code block), descending
 * inside would disturb tokenization — we append the cursor as a sibling
 * AFTER the `<pre>` instead. Same behavior as Streamdown's built-in
 * `caret` prop for code-block-tail messages.
 */

const LEAF_TEXT_TAGS: ReadonlySet<string> = new Set([
    "p",
    "li",
    "td",
    "th",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "dt",
    "dd",
    "blockquote",
    "summary",
    "figcaption",
    "caption",
]);

/*
 * Container elements we descend INTO to find a leaf descendant. Any
 * element not listed here (and not a leaf) is treated as a leaf — so
 * unknown HTML still gets a cursor appended rather than being skipped
 * silently.
 */
const CONTAINER_TAGS: ReadonlySet<string> = new Set([
    "ul",
    "ol",
    "div",
    "section",
    "article",
    "nav",
    "aside",
    "main",
    "header",
    "footer",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "dl",
    "details",
    "figure",
]);

/*
 * Elements where appending inside would conflict with Streamdown's custom
 * renderers (code blocks, mermaid, etc.) — the cursor is appended as a
 * sibling of the block instead. For now, the only one we have to be
 * careful about is `<pre>`, which Streamdown renders as a tokenized
 * syntax-highlighted code surface.
 */
const SIBLING_PLACEMENT_TAGS: ReadonlySet<string> = new Set(["pre"]);

function buildCursorElement(): Element {
    return {
        type: "element",
        tagName: "span",
        properties: {
            "data-stream-cursor": "",
            "aria-hidden": "true",
            className: ["sp-stream-cursor"],
        },
        children: [],
    };
}

function isElement(node: RootContent | undefined): node is Element {
    return node !== undefined && node.type === "element";
}

function findLastElementChild(parent: Element | Root): Element | null {
    const children = parent.children;
    for (let index = children.length - 1; index >= 0; index -= 1) {
        const child = children[index];
        if (isElement(child)) {
            return child;
        }
    }
    return null;
}

function appendCursorAsLeafTrailer(target: Element): void {
    target.children.push(buildCursorElement());
}

function appendCursorAfter(
    parent: Element | Root,
    sibling: Element,
): void {
    const index = parent.children.indexOf(sibling);
    if (index < 0) {
        // Fallback — sibling not found (defensive; shouldn't happen).
        parent.children.push(buildCursorElement());
        return;
    }
    parent.children.splice(index + 1, 0, buildCursorElement());
}

function descendAndAppend(target: Element, parent: Element | Root): boolean {
    // For elements that should be siblings (pre/code-block), append
    // immediately after them on the parent.
    if (SIBLING_PLACEMENT_TAGS.has(target.tagName)) {
        appendCursorAfter(parent, target);
        return true;
    }

    // Leaf text element — append the cursor as the trailing child.
    if (LEAF_TEXT_TAGS.has(target.tagName)) {
        appendCursorAsLeafTrailer(target);
        return true;
    }

    // Container element — recurse into its last element child.
    if (CONTAINER_TAGS.has(target.tagName)) {
        const lastChild = findLastElementChild(target);
        if (lastChild) {
            return descendAndAppend(lastChild, target);
        }
        // Container with no element children — append the cursor inside
        // it as a fallback so something is still rendered.
        appendCursorAsLeafTrailer(target);
        return true;
    }

    // Unknown element — append inside as a leaf to avoid silent failure.
    appendCursorAsLeafTrailer(target);
    return true;
}

interface StreamdownCursorOptions {
    /**
     * Whether the chat message is actively streaming. When `false` the
     * plugin is a no-op so completed messages never carry the cursor
     * marker.
     */
    active?: boolean;
}

export function streamdownCursorPlugin(options: StreamdownCursorOptions = {}) {
    const active = options.active ?? false;

    return function transformer(tree: Root): void {
        if (!active) return;
        const lastBlockElement = findLastElementChild(tree);
        if (!lastBlockElement) return;
        descendAndAppend(lastBlockElement, tree);
    };
}
