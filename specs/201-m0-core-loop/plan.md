# Implementation Plan: M0 Core Loop – Interview Drills

**Branch**: `001-m0-core-loop` | **Date**: 2025-01-27 | **Spec**: [link]
**Input**: Feature specification from `/specs/001-m0-core-loop/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a full-stack interview drill application with magic link authentication, AI-powered evaluation, and real-time content management. The system enables users to practice interview skills through structured drills with immediate AI feedback, while supporting dynamic content updates and comprehensive analytics tracking.

## Technical Context

**Language/Version**: TypeScript 5.0+ with strict mode enabled
**Primary Dependencies**: Next.js 14, Supabase, OpenAI API, PostHog, Sentry, shadcn/ui, Tailwind CSS
**Storage**: Supabase PostgreSQL for user data, Redis (Upstash) for entitlement caching, file system for content packs
**Testing**: Vitest for unit/integration tests, Playwright for E2E tests
**Target Platform**: Web application (modern browsers), Vercel deployment
**Project Type**: Web application (Next.js full-stack)
**Performance Goals**: /api/evaluate ≤250ms, Redis lookups ≤50ms, content validation ≤1s
**Constraints**: TypeScript strict mode, 80% test coverage, Biome formatting, lefthook hooks
**Scale/Scope**: M0 MVP with 3 core user stories, 1 admin story, 5 API endpoints

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

- [x] Core loop performance targets defined (≤250ms)
- [x] Redis lookup targets defined (≤50ms)
- [x] Content validation targets defined (≤1s)

**MCP Integration Gates:**

- [x] Context7 for specs/plans identified
- [x] Supabase for auth/storage/DB planned
- [x] Vercel for deployment planned
- [x] PostHog for analytics planned
- [x] Sentry for error tracking planned

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```
# Next.js Full-Stack Web Application
src/
├── app/                    # Next.js 14 App Router
│   ├── (auth)/            # Auth route group
│   │   ├── login/         # Magic link login page
│   │   └── callback/      # Auth callback handler
│   ├── (dashboard)/       # Protected route group
│   │   ├── drill/         # Main drill interface
│   │   └── loader/        # Content pack loader (admin)
│   ├── api/               # API routes
│   │   ├── auth/          # Auth endpoints
│   │   ├── evaluate/      # Evaluation endpoint
│   │   ├── content/       # Content pack endpoints
│   │   └── webhooks/      # Stripe webhooks
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   ├── auth/             # Auth-related components
│   ├── drill/            # Drill-specific components
│   └── admin/            # Admin components
├── lib/                  # Shared utilities and configurations
│   ├── auth/             # Auth utilities (Supabase)
│   ├── db/               # Database utilities
│   ├── redis/            # Redis utilities (Upstash)
│   ├── openai/           # OpenAI integration
│   ├── analytics/        # PostHog integration
│   ├── monitoring/       # Sentry integration
│   └── validations/      # Zod schemas
├── types/                # TypeScript type definitions
└── hooks/                # Custom React hooks

tests/
├── unit/                 # Unit tests (Vitest)
├── integration/          # Integration tests
├── e2e/                  # End-to-end tests (Playwright)
└── fixtures/             # Test data and mocks

# Configuration files
.devcontainer/            # VS Code devcontainer
├── devcontainer.json
└── Dockerfile

# Root configuration
package.json
pnpm-lock.yaml
biome.json
lefthook.yml
tsconfig.json
next.config.js
tailwind.config.js
.env.example
```

**Structure Decision**: Next.js 14 full-stack web application with App Router. Single codebase with clear separation between frontend components, API routes, and shared utilities. Uses modern React patterns with TypeScript throughout.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
