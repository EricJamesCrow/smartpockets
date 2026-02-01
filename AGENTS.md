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

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits (e.g. `fix(ui): add z-50 to modal overlay`).
- PRs should include a clear description, testing notes (or "not tested"), and screenshots or recordings for UI changes.

## Configuration & Secrets
- Copy `.env.example` to `.env.local` and set Convex, Clerk, and AI provider keys.
- After backend changes, regenerate Convex types with `npx convex dev`.
