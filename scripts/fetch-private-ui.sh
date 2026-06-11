#!/usr/bin/env bash
# Restores the paid UntitledUI React source, which is not redistributed in the
# working tree (CROWDEV-462). Idempotent: exits immediately when the tree is
# already present (local dev checkouts keep their untracked copy).
#
# Resolution order:
#   1. Tree already present                  -> no-op
#   2. UNTITLEDUI_REPO_TOKEN set             -> clone the private mirror repo
#   3. Fallback                              -> sparse-restore from pinned public
#                                               history (forward-only removal:
#                                               the kit remains in pre-removal
#                                               commits; dies if history is ever
#                                               rewritten — switch to the token
#                                               path at that point)
#
# Note: the kit directories are gitignored, so Turborepo does not hash them as
# inputs. That is acceptable because the kit only changes via this script's
# pinned sources, never independently of a tracked change.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KIT_DEST="$ROOT/packages/ui/src/components/untitledui"
EXAMPLES_DEST="$ROOT/packages/ui/examples"

# Last public commit containing the kit before it was untracked.
PINNED_SHA="f7c4bb1c1b8e476b8743e78220b908ede2f421ef"
PUBLIC_REPO_URL="https://github.com/EricJamesCrow/smartpockets.git"
PRIVATE_REPO="EricJamesCrow/smartpockets-untitledui"

if [ -n "$(ls -A "$KIT_DEST" 2>/dev/null)" ]; then
    exit 0
fi

echo "[fetch-private-ui] UntitledUI kit missing — restoring..."

restore_from_private() {
    local tmp
    tmp="$(mktemp -d)"
    git clone --quiet --depth 1 \
        "https://x-access-token:${UNTITLEDUI_REPO_TOKEN}@github.com/${PRIVATE_REPO}.git" \
        "$tmp/kit"
    mkdir -p "$KIT_DEST" "$EXAMPLES_DEST"
    cp -R "$tmp/kit/untitledui/." "$KIT_DEST/"
    cp -R "$tmp/kit/examples/." "$EXAMPLES_DEST/"
    rm -rf "$tmp"
    echo "[fetch-private-ui] restored from private mirror (${PRIVATE_REPO})"
}

restore_from_history() {
    local tmp
    tmp="$(mktemp -d)"
    git clone --quiet --filter=blob:none --no-checkout "$PUBLIC_REPO_URL" "$tmp/repo"
    git -C "$tmp/repo" sparse-checkout set --no-cone \
        "packages/ui/src/components/untitledui" "packages/ui/examples"
    git -C "$tmp/repo" checkout --quiet "$PINNED_SHA"
    mkdir -p "$KIT_DEST" "$EXAMPLES_DEST"
    cp -R "$tmp/repo/packages/ui/src/components/untitledui/." "$KIT_DEST/"
    cp -R "$tmp/repo/packages/ui/examples/." "$EXAMPLES_DEST/"
    rm -rf "$tmp"
    echo "[fetch-private-ui] restored from public history @ ${PINNED_SHA:0:7}"
}

if [ -n "${UNTITLEDUI_REPO_TOKEN:-}" ]; then
    restore_from_private
else
    restore_from_history
fi
