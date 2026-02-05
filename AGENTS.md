# Repository Guidelines

## Project Structure & Module Organization
This repo is a Turborepo monorepo for the Untitled UI Next.js starter kit.
- `apps/app`: primary Next.js app (routes in `src/app`, components in `src/components`, static assets in `public`).
- `apps/web`: secondary Next.js site.
- `packages/ui`: shared UI components and styles (`src/components`, `src/styles`).
- `packages/backend`: Convex backend functions in `convex/` with generated types in `convex/_generated`.
- `packages/email`: React Email templates in `emails/` and shared email components in `emails/_components`.
- `packages/analytics`: shared analytics hooks in `src/`.
- `tooling/typescript`: shared TS configs (`base.json`, `nextjs.json`, `react-library.json`).
- `docs/`: architecture notes and plans.

## Build, Test, and Development Commands
Use `bun` (repo is pinned to `bun@1.1.42`), though npm/yarn/pnpm also work.
- `bun dev`: run all workspaces in parallel via Turbo.
- `bun dev:app` / `bun dev:web` / `bun dev:email` / `bun dev:backend`: run a single workspace (ports 3000, 3001, 3003; backend uses `convex dev --tail-logs`).
- `bun build`: build all packages with `turbo build`.
- `bun lint`: run workspace lint tasks (currently only `packages/ui` defines eslint).
- `bun typecheck`: run TypeScript checks across workspaces.
- `bun clean`: remove build artifacts; `bun clean:workspaces` wipes all `node_modules`.

## Coding Style & Naming Conventions
- Formatting is handled by Prettier (`.prettierrc`): 4-space indentation, 160 print width, import sorting, and Tailwind class ordering.
- TypeScript everywhere; use `PascalCase.tsx` for components, `useThing.ts` for hooks, and `camelCase` for utilities.
- Keep Convex generated files untouched; edit source in `packages/backend/convex` only.

## Testing Guidelines
- No test runner is configured yet. If adding tests, colocate with sources using `*.test.ts(x)` or `*.spec.ts(x)` and add a Turbo script for that package.

## Git Workflow (CRITICAL)

### Atomic Commits - ALWAYS FOLLOW

**Commit after EVERY logical unit of work.** Each commit should be:

- ONE logical change (one component, one fix, one test)
- In working state (tests pass, no type errors)
- Describable in one sentence
- Safely revertable without side effects

### Commit Format

```
<type>(<scope>): <description under 50 chars>

[optional body]

Refs: #issue

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `test`: Tests
- `refactor`: Code restructuring
- `style`: Formatting
- `chore`: Maintenance

### Commit Frequency (IMPORTANT)

Commit immediately after each:

- Single feature component added
- Single bug fix completed
- Test suite written for specific function
- Refactoring of single concern

### Workflow Pattern

1. Implement ONE logical unit
2. Verify changes work
3. Stage relevant files: `git add <files>`
4. Commit immediately with descriptive message
5. Repeat for next unit
6. Push when feature complete

## Pull Request Guidelines
- PRs should include a clear description, testing notes (or "not tested"), and screenshots or recordings for UI changes.

## Configuration & Secrets
- Copy `.env.example` to `.env.local` and set Convex, Clerk, and AI provider keys.
- Or run `./scripts/bootstrap-env.sh` to create `.env.local` and symlink `apps/app`, `apps/web`, and `packages/backend` env files to the root.
- If `apps/web` needs a separate env file, remove the symlink and create `apps/web/.env.local` manually.
- After backend changes, regenerate Convex types with `npx convex dev`.

## Convex Deployment Notes
- Production deploys must be run from `packages/backend` (where `convex/` lives).
- A 404 from Clerk on `/clerk-users-webhook` usually means the Convex prod deployment wasn’t updated.
- The Clerk webhook handler expects `CLERK_WEBHOOK_SECRET` in Convex env vars.
- Convex auth expects `NEXT_PUBLIC_CLERK_FRONTEND_API_URL`.
- Components (e.g., `@crowdevelopment/convex-plaid`) only show up in the Convex dashboard after a successful deploy.
