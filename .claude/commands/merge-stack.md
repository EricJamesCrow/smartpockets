---
description: Merge a Graphite stack via CLI, sync trunk, and clean up local branches.
---

## Your Task

Merge the current Graphite stack, sync local main, and clean up stale branches.

## Steps

### 1. Identify the stack

Run this to see the current stack structure:

```bash
gt log short
```

Show the user the stack and confirm which PRs will be merged. If not on a stack branch, ask the user which stack to merge.

### 2. Check PR readiness

For each PR in the stack, verify it's ready to merge:

```bash
gh pr list --state open --json number,title,reviewDecision,statusCheckRollup --jq '.[] | {number, title, reviewDecision, checks: [.statusCheckRollup[]? | .conclusion] | unique}'
```

Report any PRs that have failing checks or are awaiting review. If any PR is not ready, ask the user whether to proceed anyway or wait.

### 3. Merge the stack

Merge the bottom PR first (Graphite auto-merges the stack upward):

```bash
gh pr merge <bottom-pr-number> --squash --delete-branch
```

Wait for each PR to merge before proceeding. If Graphite doesn't auto-merge the rest, merge them in order from bottom to top.

Alternatively, if there are issues with CLI merge, tell the user to merge via the Graphite dashboard link and then continue with sync.

### 4. Sync local state

```bash
gt sync
```

This updates local main, removes merged branch tracking, and restacks any remaining branches.

### 5. Clean up stale local branches

```bash
git branch -v | grep '\[gone\]' | sed 's/^[+* ]//' | awk '{print $1}' | while read branch; do
  echo "Deleting branch: $branch"
  worktree=$(git worktree list | grep "\\[$branch\\]" | awk '{print $1}')
  if [ ! -z "$worktree" ] && [ "$worktree" != "$(git rev-parse --show-toplevel)" ]; then
    echo "  Removing worktree: $worktree"
    git worktree remove --force "$worktree"
  fi
  git branch -D "$branch"
done
```

### 6. Verify clean state

```bash
git branch --show-current
gt log short
git log --oneline -5
```

Confirm you're on main with no stale branches remaining. Report the merged commits.

## Expected Result

- All stack PRs merged and closed on GitHub
- Local main up to date with remote
- All stale local branches deleted
- Clean working state ready for next feature
