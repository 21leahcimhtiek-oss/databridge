# Contributing to DataBridge

Thank you for your interest in contributing! This guide explains the workflow, conventions, and expectations for contributors.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Branch Naming](#branch-naming)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing](#testing)

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/databridge.git
   cd databridge
   ```
3. **Install** dependencies:
   ```bash
   npm install
   ```
4. **Configure** environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase, Stripe, and Upstash credentials
   ```
5. **Apply** the database migration in the Supabase SQL editor (`supabase/migrations/001_initial_schema.sql`).
6. **Start** the development server:
   ```bash
   npm run dev
   ```

## Development Workflow

1. Sync your fork with `upstream/main`.
2. Create a feature branch (see naming convention below).
3. Make focused, incremental commits.
4. Run the full validation suite before pushing:
   ```bash
   npm run type-check
   npm run lint
   npm test
   ```
5. Push your branch and open a Pull Request against `main`.

## Branch Naming

Use lowercase kebab-case with a type prefix:

| Prefix | Use case |
|--------|----------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation only |
| `chore/` | Tooling, deps, build |
| `refactor/` | Code restructuring without behaviour change |
| `test/` | Adding or updating tests |

Examples: `feat/mysql-connector`, `fix/pipeline-run-error`, `docs/deployment-guide`

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

**Types:** `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`

Examples:
```
feat(connectors): add MySQL connector with connection pooling
fix(pipeline): handle null rows_processed in run summary
docs(readme): add Docker deployment instructions
chore(deps): upgrade Next.js to 14.2.3
```

## Pull Request Process

1. Ensure `npm run type-check && npm run lint && npm test` all pass.
2. Update documentation if your change affects user-facing behaviour or the public API surface.
3. Fill in the PR description: motivation, changes made, testing notes.
4. Request review from at least one maintainer.
5. Address all reviewer comments before merging.
6. PRs are merged via **squash and merge** to keep a linear history on `main`.

## Code Style

- **TypeScript strict mode** is mandatory — no implicit `any`.
- Use **named exports** for utilities, hooks, and components (avoid default exports in `src/lib/`).
- File naming: PascalCase for React components, camelCase for utilities and hooks.
- Keep functions small and single-purpose; co-locate tests next to source files under `__tests__/`.
- Do not commit `.env.local` or any file containing secrets.

## Testing

- Write unit tests for all new functions in `src/lib/` (use Jest + `@testing-library/react` for components).
- Write integration tests for new API route handlers.
- Target >80% line coverage on new code.
- End-to-end tests live in `e2e/` and run via `npm run test:e2e`.

For questions, open a GitHub Discussion or reach out via the issue tracker.