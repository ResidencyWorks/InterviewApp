<!--
Sync Impact Report:
Version change: N/A → 1.0.0 (initial creation)
Modified principles: N/A (all new)
Added sections: Code Quality, Architecture Guidelines, Test-First Development, Tooling & Development Standards, UX & UI Standards, Performance Requirements, Managed Cloud Providers, Deployment Standards
Removed sections: N/A (template placeholders removed)
Templates requiring updates:
✅ Updated: .specify/templates/plan-template.md (Constitution Check section)
✅ Updated: .specify/templates/tasks-template.md (Setup and Foundational phases)
⚠ Pending: N/A
Follow-up TODOs: N/A
-->

# InterviewApp Constitution

## Core Principles

### I. Code Quality (NON-NEGOTIABLE)

All code must pass Biome formatting and linting checks. TypeScript must be used in strict mode across all files. Commit messages must follow conventional commit format and pass `lefthook` hooks. Use clear, concise variable and function names. **Comments are required where they improve clarity** — avoid redundant or excessive commentary. Use **JSDoc-style comments** for all exported functions, services, and API endpoints. Code should prefer clarity and correctness over brevity or cleverness.

### II. Architecture Guidelines

Apply **Onion Architecture** with **Domain-Driven Design** where applicable: Domain layer (core logic) must remain independent of frameworks and MCPs. Application services should orchestrate flows and remain thin. Interface adapters (e.g., API routes, UI) must use DI to interact with core logic. Avoid service bleed: isolate infrastructure concerns behind clear interfaces.

**Next.js 16 Proxy Migration**: Use `proxy.ts` instead of `middleware.ts` for global request handling. All global middleware logic (auth, rate limiting) must reside in `proxy.ts`.

### III. Test-First Development (NON-NEGOTIABLE)

Follow test-first approach: Unit test (e.g., Zod schema), Integration test (e.g., Stripe webhook idempotency). Use Vitest for all test files. Code coverage must reach ≥80% for unit + integration tests in M0. TDD mandatory: Tests written → User approved → Tests fail → Then implement; Red-Green-Refactor cycle strictly enforced.

### IV. Tooling & Development Standards

Use `pnpm` as the sole package manager. Devcontainer must include: Node.js LTS, `biome` for lint/format, `lefthook` for git hooks. All PRs and commits must pass: `lefthook` pre-commit: biome lint & format, `lefthook` pre-push: type check + tests. No ESLint or Prettier — Biome replaces both.

**MCP Workflow & Tooling (NON-NEGOTIABLE)**:

- Every planning task, architectural decision, or implementation change MUST start by invoking the sequential thinking tool to capture goals, unknowns, and validation steps.
- Serena semantic tools are the only acceptable interface for code discovery, symbol navigation, refactors, and diffs. Full-file reads happen only when Serena cannot retrieve the necessary context.
- Context7 lookups are mandatory whenever referencing third-party packages or MCP behavior; cite the latest retrieved documentation (e.g., Model Context Protocol specification 2025-11-25 for `tools/list`, `tools/call`, `tool_use`, `tool_results`, and `execution.taskSupport` semantics).
- MCP tool usage MUST follow spec-compliant flows: enumerate capabilities via `tools/list`, send schema-conformant `tools/call` payloads, bubble up tool errors verbatim, and re-submit `tool_results` when relaying outputs to the model.
- Plans, task breakdowns, and implementation notes must explicitly reference the Serena/Context7/MCP steps that were performed so reviewers can trace compliance.

### V. UX & UI Standards

Use `shadcn/ui` for components, built on Tailwind CSS. All screens must include: Loading states, Error fallbacks, Responsive layouts. Accessibility required: keyboard navigation, screen reader compatibility.

## Performance Requirements

Core loop `/api/evaluate` must return in ≤ 250ms dev. Redis (Upstash) entitlement lookups must resolve ≤ 50ms. JSON content pack validation + hot-swap ≤ 1s.

## Managed Cloud Providers (MCPs)

Use the following platforms unless explicitly overridden:

- `Context7` — for structured specs, plans, and quality gates
- `Supabase` — for auth, storage, and Postgres DB
- `Vercel` — for deploy previews, staging/prod environments
- `PostHog` — for product analytics, event logging
- `Sentry` — for client and API error tracking
- `GitHub` — for repo versioning, PR workflows, lefthook integration

## Deployment Standards

`.env.example` must define all required keys. Sentry and PostHog must be wired from Day 1. PRs must be previewable on Vercel.

## Governance

Constitution supersedes all other practices. Amendments require documentation, approval, migration plan. All PRs/reviews must verify compliance. Complexity must be justified. Use project guidelines for runtime development guidance.

**Version**: 1.0.0 | **Ratified**: 2025-01-27 | **Last Amended**: 2025-01-27
