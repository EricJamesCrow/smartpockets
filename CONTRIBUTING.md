# Contributing to SmartPockets

Thanks for your interest in contributing to SmartPockets! This guide will get you up to speed quickly.

## Getting Started

See the [Getting Started](README.md#getting-started) section for setup instructions.

## Development Workflow

1. Fork the repo and clone it locally
2. Create a feature branch off `main`: `feat/description`, `fix/description`, or `docs/description`
3. Make your changes
4. Run `bun typecheck` to catch type errors
5. Open a pull request

## Commit Convention

Format: `<type>(<scope>): <description>`

| Type | Use For |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `refactor` | Code restructuring |
| `style` | Formatting |
| `chore` | Maintenance |
| `test` | Tests |

- Keep the description under 50 characters
- Focus on the "why" not the "what"
- One logical change per commit
- Each commit should leave the codebase in a working state

## Code Style

- Use **UntitledUI** components — never create custom components that duplicate UntitledUI
- Use `cx()` from `@/utils/cx` for Tailwind class merging
- Keep components as React Server Components unless interactivity is needed
- **Convex-first**: no Next.js API routes — all data fetching goes through Convex queries/mutations
- Always include argument AND return validators on Convex functions

## Pull Requests

- Write a clear title and description
- Link related issues
- Keep PRs focused — one feature or fix per PR
- Aim for under 400 lines changed per PR
- Make sure `bun typecheck` passes before requesting review

## Design Contributions

- Figma UI Kit is coming soon
- For now, follow existing UntitledUI patterns in `packages/ui/`
- We welcome design contributions — if you're a designer, reach out in GitHub Discussions

## Questions?

- Open a [GitHub Discussion](https://github.com/EricJamesCrow/smartpockets/discussions)
- File a [bug report](https://github.com/EricJamesCrow/smartpockets/issues)
