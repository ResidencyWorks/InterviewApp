# Implementation Plan: Layered Architecture Refactor

**Branch**: `010-layered-architecture-refactor` | **Date**: 2025-11-09 | **Spec**: [/workspaces/InterviewApp/specs/010-layered-architecture-refactor/spec.md](/workspaces/InterviewApp/specs/010-layered-architecture-refactor/spec.md)
**Input**: Feature specification from `/specs/010-layered-architecture-refactor/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Replatform the monolithic `lib/` folder into opinionated layers (`domain`, `application`, `infrastructure`, `presentation`, `shared`) and feature-specific modules while enforcing dependency boundaries, testing separation, and constitution-aligned tooling standards.

## Technical Context

**Language/Version**: TypeScript (strict mode) targeting Node.js LTS
**Primary Dependencies**: Next.js App Router, shadcn/ui, Prisma ORM, Supabase client SDK, Vitest, Biome
**Storage**: Supabase Postgres (primary), Upstash Redis cache
**Testing**: Vitest for unit/integration, Playwright for e2e validation
**Target Platform**: Web application deployed on Vercel (serverless + edge runtimes)
**Project Type**: Full-stack web (Next.js) with shared monorepo-style layering
**Performance Goals**: Core evaluation loop ≤250 ms, Redis entitlement lookup ≤50 ms, content validation ≤1 s
**Constraints**: Onion architecture boundaries, pnpm-only workflows, no direct infrastructure dependencies in domain layer, tests isolated from external services for unit scope
**Scale/Scope**: Multi-team product with five core feature modules (booking, scheduling, auth, billing, notifications)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Code Quality Gates:**

- [x] TypeScript strict mode enabled
- [x] Biome formatting and linting configured
- [x] lefthook hooks configured for pre-commit/pre-push
- [x] JSDoc comments planned for all exported functions

**Architecture Gates:**

- [x] Onion Architecture pattern identified
- [x] Domain layer independence from frameworks confirmed
- [x] Interface adapters using DI pattern planned

**Testing Gates:**

- [x] Test-first approach planned
- [x] Vitest configuration planned
- [x] 80% coverage target set
- [x] Unit and integration test strategy defined

**Tooling Gates:**

- [x] pnpm as package manager confirmed
- [x] Devcontainer with Node.js LTS, Biome, lefthook planned
- [x] No ESLint/Prettier (Biome only)

**Performance Gates:**

- [x] Core loop performance targets defined (≤250 ms)
- [x] Redis lookup targets defined (≤50 ms)
- [x] Content validation targets defined (≤1 s)

**MCP Integration Gates:**

- [x] Context7 for specs/plans identified
- [x] Supabase for auth/storage/DB planned
- [x] Vercel for deployment planned
- [x] PostHog for analytics planned
- [x] Sentry for error tracking planned

## Project Structure

### Documentation (this feature)

```
specs/010-layered-architecture-refactor/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```
src/
├── app/                    # Next.js App Router entry (presentation layer)
├── domain/
│   ├── entities/
│   ├── value-objects/
│   └── repositories/
├── application/
│   ├── use-cases/
│   ├── dto/
│   └── validators/
├── infrastructure/
│   ├── config/
│   ├── adapters/
│   ├── prisma/
│   └── clients/
├── presentation/
│   ├── components/         # shadcn/ui based components
│   └── controllers/        # HTTP/controller glue
├── shared/
│   ├── errors/
│   ├── logger/
│   └── primitives/
└── features/
    ├── booking/
    │   ├── domain/
    │   ├── application/
    │   ├── infrastructure/
    │   └── presentation/
    ├── scheduling/
    ├── auth/
    ├── billing/
    └── notifications/

tests/
├── unit/
│   ├── domain/
│   └── application/
├── integration/
│   └── infrastructure/
└── e2e/
    └── presentation/
```

**Structure Decision**: Maintain a single Next.js repository reorganized into onion layers under `src/`, with the App Router living in `src/app`, feature modules nested under `src/features/*`, and mirrored test suites to reinforce dependency boundaries.

## Complexity Tracking

No constitution deviations or exceptions anticipated; additional justification table not required.
