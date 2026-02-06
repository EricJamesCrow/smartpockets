# CLAUDE.md

> This file provides guidance to Claude Code when working with code in this repository.

## Session Startup Protocol (MANDATORY)

**Before starting any work, ALWAYS run these commands:**

```bash
# 1. Fetch latest from remote
git fetch origin

# 2. Check current branch status
git status

# 3. If on main/master, pull latest
git pull origin main

# 4. If on feature branch, rebase on main (or merge if preferred)
git rebase origin/main
# OR: git merge origin/main

# 5. Verify no uncommitted changes from previous sessions
git stash list
```

**If conflicts exist or uncommitted changes are found, STOP and ask the user how to proceed.**

---

## Project Overview

<!-- Customize this section for each project -->

**[PROJECT NAME]** is a [brief description of what the project does].

**Key Features:**
- Feature 1
- Feature 2
- Feature 3

---

## Tech Stack Quick Reference

<!-- Customize versions for each project -->

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js (App Router) | 16.x |
| Language | TypeScript | 5.x |
| Runtime | React | 19.x |
| Styling | Tailwind CSS | 4.x |
| Database | Convex | latest |
| Auth | Clerk | latest |
| UI Components | shadcn/ui (New York) | latest |
| Package Manager | pnpm | latest |

---

## Development Commands

```bash
# Start development server
pnpm dev

# Type checking
pnpm exec tsc --noEmit

# Linting
pnpm lint

# Build for production
pnpm build

# Run tests
pnpm test
```

---

## Next.js Rules

### File & Directory Structure
- Use the App Router structure with `page.tsx` files in route directories
- Use kebab-case for directory names (e.g., `components/auth-form`)
- Use PascalCase for component files (e.g., `AuthForm.tsx`)
- Prefer named exports over default exports:
  ```typescript
  // ✅ Good
  export function Button() { /* ... */ }
  
  // ❌ Avoid
  export default function Button() { /* ... */ }
  ```

### Client vs Server Components
- **Default to Server Components** - most components should be RSC
- Only add `'use client'` when you need:
  - Event handlers (onClick, onChange, etc.)
  - Browser APIs (localStorage, window, etc.)
  - React hooks (useState, useEffect, etc.)
- Create small client component wrappers around interactive elements
- Wrap client components in `<Suspense>` with fallback UI

### State Management Hierarchy
Prefer in this order:
1. **Server Components** for data fetching (no state needed)
2. **URL search params** for shareable/bookmarkable state (use `nuqs`)
3. **React Server Actions** for form handling and mutations
4. **useState/useReducer** only when above options don't fit

### Performance Patterns
- Minimize `'use client'` directives - push them down the component tree
- Avoid unnecessary `useState` and `useEffect`
- Use streaming with `loading.tsx` and `<Suspense>`
- Prefer `useOptimistic` for instant UI feedback on mutations

---

## Code Style Guidelines

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserProfile.tsx` |
| Hooks | camelCase with `use` prefix | `useAuth.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Types/Interfaces | PascalCase | `UserProfile`, `ApiResponse` |
| Directories | kebab-case | `user-profile/` |

### TypeScript Practices
- Prefer `interface` for object shapes, `type` for unions/intersections
- Use `unknown` over `any` - cast explicitly when needed
- Define return types explicitly for exported functions
- Use `as const` for literal types

### Error Handling
```typescript
// ✅ Good - explicit error handling with typed errors
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  if (error instanceof SpecificError) {
    return { success: false, error: error.message };
  }
  throw error; // Re-throw unexpected errors
}

// ❌ Avoid - swallowing errors silently
try {
  await riskyOperation();
} catch (e) {
  console.log(e);
}
```

### Comments & Documentation
- Write self-documenting code; avoid obvious comments
- Use JSDoc for exported functions and complex logic
- Add `// TODO:` with context for future work
- Explain "why" not "what" in comments

---

## Git Workflow (CRITICAL)

### Atomic Commits - ALWAYS FOLLOW

**Commit after EVERY logical unit of work.** Each commit should be:
- **ONE logical change** (one component, one fix, one test)
- **In working state** (tests pass, no type errors)
- **Describable in one sentence**
- **Safely revertable** without side effects

### Commit Message Format

```
<type>(<scope>): <description under 50 chars>

[optional body explaining WHY, not WHAT]

Refs: #issue (if applicable)

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Commit Types
| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `test` | Adding/updating tests |
| `refactor` | Code restructuring (no behavior change) |
| `style` | Formatting, whitespace (no code change) |
| `chore` | Maintenance, deps, configs |
| `perf` | Performance improvements |

### Commit Frequency (IMPORTANT)

Commit immediately after each:
- ✅ Single feature component added
- ✅ Single bug fix completed  
- ✅ Test suite written for specific function
- ✅ Refactoring of single concern
- ✅ Dependency added/updated

**Example Task Breakdown:**

Instead of: "Implemented user authentication" (too broad)

Break into:
1. `feat(auth): add User model with password hashing`
2. `feat(auth): implement JWT token generation`
3. `feat(auth): create login API endpoint`
4. `test(auth): add unit tests for auth flow`

### Workflow Pattern (MANDATORY)

**After EVERY completed change, you MUST commit AND push immediately.**

```bash
# 1. Implement ONE logical unit
# 2. Verify changes work
pnpm exec tsc --noEmit  # Type check

# 3. Stage relevant files
git add <specific-files>

# 4. Commit with descriptive message
git commit -m "type(scope): description"

# 5. Push IMMEDIATELY (don't wait!)
git push

# 6. Repeat for next unit
```

### Why Push Immediately?
- Prevents lost work if session ends
- Enables collaboration and code review
- Creates clear history of changes
- Allows easy rollback if issues arise

### Branch Strategy
- `main` - Production-ready code (protected)
- `feat/<name>` - Feature development
- `fix/<name>` - Bug fixes
- `chore/<name>` - Maintenance tasks

### Reverting Changes

```bash
# Undo last commit, keep changes staged
git reset --soft HEAD~1

# Undo last commit, discard changes (DESTRUCTIVE)
git reset --hard HEAD~1

# Create new commit that undoes a specific commit (SAFE)
git revert <commit-hash>

# Force push (feature branches ONLY, never main!)
git push --force-with-lease
```

---

## Agent Permissions

### ✅ Allowed Without Asking

**Reading & Analysis:**
- Read files and list directories
- Search codebase for patterns
- Analyze code structure

**Safe Operations:**
- File-scoped checks (`tsc`, `prettier`, `eslint` on single files)
- Run single unit tests
- Run full test suites (they're non-destructive)
- Run builds (non-destructive, just time-consuming)

**Development:**
- Write code following established patterns in this document
- Create new files following project conventions
- Make atomic commits to feature branches
- Push to feature branches

**Dependency Installation (with judgment):**
- Type definition packages (`@types/*`)
- Well-known dev utilities (testing, linting plugins)
- Dependencies explicitly mentioned in task requirements

### ⚠️ Use Judgment - Ask When Uncertain

- Multiple valid architectural approaches exist
- Requirements are ambiguous or incomplete
- Change affects > 5 files significantly
- Unfamiliar with the codebase area
- Performance implications unclear
- Modifying shared utilities used across many files

### 🛑 Always Ask First (CRITICAL)

**Git Operations:**
- `git push` to `main` or `master` branch
- `git push --force` on any shared branch
- Rebasing/squashing commits on shared branches

**Destructive Changes:**
- Deleting files or directories
- Removing existing functionality
- Breaking changes to existing APIs
- Changes affecting database schemas

**Security-Sensitive:**
- Installing packages with network/auth capabilities
- Modifying authentication or authorization logic
- Changes to environment variables or secrets handling
- Adding new external service integrations

**Configuration:**
- Modifying core config files in ways that deviate from established patterns
- Changing build/deploy configurations
- Updating CI/CD pipelines

---

## Testing Strategy

### When to Write Tests
- New utility functions with logic
- Bug fixes (write test that fails first, then fix)
- Complex business logic
- API endpoints
- State management logic

### When Tests Are Optional
- Simple UI components with no logic
- Straightforward CRUD operations
- One-off scripts

### Test File Location
```
src/
├── components/
│   └── Button/
│       ├── Button.tsx
│       └── Button.test.tsx  # Co-located
├── lib/
│   └── utils/
│       ├── format.ts
│       └── format.test.ts   # Co-located
└── __tests__/               # Integration tests
    └── api/
        └── users.test.ts
```

---

## Common Pitfalls to Avoid

### Next.js Specific
- ❌ Using `useEffect` for data fetching (use Server Components)
- ❌ Putting `'use client'` at page level (push it down)
- ❌ Importing server-only code in client components
- ❌ Using `localStorage` without checking `typeof window`

### TypeScript Specific
- ❌ Using `any` instead of `unknown`
- ❌ Ignoring TypeScript errors with `@ts-ignore`
- ❌ Not handling null/undefined cases

### Git Specific
- ❌ Large commits with multiple unrelated changes
- ❌ Committing without pushing
- ❌ Force pushing to shared branches
- ❌ Committing sensitive data (env vars, keys)

---

## Project-Specific Notes

<!-- Add project-specific information here -->

### Key Files
- `lib/` - Shared utilities and helpers
- `components/ui/` - shadcn/ui primitives
- `components/` - Application components
- `app/` - Next.js App Router pages

### Environment Variables
```bash
# Required for development
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
```

### External Services
- **Clerk** - Authentication
- **Convex** - Database & backend
- Add others as needed...

---

## Quick Reference Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Production build
pnpm lint                   # Run linter
pnpm exec tsc --noEmit     # Type check

# Git (daily workflow)
git fetch origin           # Get latest
git pull origin main       # Update main
git checkout -b feat/name  # New feature branch
git add <files>            # Stage changes
git commit -m "type: msg"  # Commit
git push                   # Push immediately!

# Git (fixes)
git reset --soft HEAD~1    # Undo commit, keep changes
git stash                  # Temporarily store changes
git stash pop              # Restore stashed changes
```
