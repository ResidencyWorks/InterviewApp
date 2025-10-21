# Implementation Plan: Content Pack Loader

**Branch**: `002-content-pack-loader` | **Date**: 2025-01-27 | **Spec**: `/specs/002-content-pack-loader/spec.md`
**Input**: Feature specification from `/specs/002-content-pack-loader/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Admin users can upload, validate, and hot-swap content pack JSON files without application redeployment. The system provides comprehensive validation using Zod schemas, persists content packs in Supabase with file system fallback, implements queue-based upload processing, and includes graceful error handling for PostHog logging failures.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.x with strict mode
**Primary Dependencies**: Next.js 14, Zod, Supabase, PostHog, shadcn/ui, Tailwind CSS
**Storage**: Supabase PostgreSQL with file system fallback
**Testing**: Vitest with 80% coverage target
**Target Platform**: Web application (Vercel deployment)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: Content pack validation ≤1s, upload/validation ≤30s, hot-swap without redeploy
**Constraints**: ≤10MB content pack files, admin-only access, graceful PostHog failure handling, devcontainer integration, Sentry error tracking
**Scale/Scope**: Admin users, content pack management, evaluation system integration

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

```
src/
├── app/                    # Next.js 14 App Router
│   ├── admin/             # Admin-only content pack management
│   │   ├── content-packs/ # Content pack upload/management UI
│   │   └── page.tsx       # Admin dashboard
│   ├── api/               # API routes
│   │   ├── content-packs/ # Content pack CRUD operations
│   │   └── upload/        # File upload handling
│   └── globals.css        # Global styles
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   ├── admin/            # Admin-specific components
│   └── content-pack/     # Content pack specific components
├── lib/                  # Core business logic
│   ├── domain/           # Domain entities and services
│   ├── infrastructure/   # External service adapters
│   ├── validation/       # Zod schemas
│   └── utils/            # Utility functions
├── types/                # TypeScript type definitions
└── hooks/                # React hooks

tests/
├── unit/                 # Unit tests for domain logic
├── integration/          # API integration tests
└── e2e/                  # End-to-end tests
```

**Structure Decision**: Web application using Next.js 14 App Router with Onion Architecture. Domain layer (`lib/domain/`) remains independent of frameworks, while infrastructure adapters (`lib/infrastructure/`) handle external services like Supabase and PostHog.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
