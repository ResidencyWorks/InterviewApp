# Implementation Plan: Project Structure Review

**Branch**: `008-project-structure-review` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-project-structure-review/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Analyze the entire project structure across all directories (@types/, @supabase/, @src/, @scripts/, @public/, @app/) to identify duplicated functionality, structural inconsistencies, and optimization opportunities. Provide actionable recommendations for consolidation and cleanup to improve maintainability and reduce technical debt.

## Technical Context

**Language/Version**: TypeScript 5.0+ with strict mode enabled
**Primary Dependencies**: Next.js 14, React 19, Supabase, PostHog, Sentry, Biome, Vitest
**Storage**: N/A (analysis-only feature)
**Testing**: Vitest for unit tests, manual analysis validation
**Target Platform**: Web application (Next.js full-stack)
**Project Type**: Web application (Next.js full-stack with analysis tools)
**Performance Goals**: Analysis completion in <30 seconds, zero impact on runtime performance
**Constraints**: Non-destructive analysis only, must preserve all existing functionality during review
**Scale/Scope**: M0 MVP with 3 user stories, analysis of 15+ duplicated services, 4 major consolidation areas

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
# Next.js Full-Stack Web Application with Analysis Tools
src/
├── lib/                          # Core business logic and utilities
│   ├── auth/                     # Authentication services (multiple implementations)
│   │   ├── auth-service.ts       # Client-side auth service
│   │   ├── server-auth-service.ts # Server-side auth service
│   │   └── auth-helpers.ts       # Auth utility functions
│   ├── analytics/                # Analytics services (multiple implementations)
│   │   ├── analytics.ts          # Main analytics service
│   │   ├── transcript-analytics.ts # Transcript-specific analytics
│   │   ├── web-vitals.ts        # Web vitals tracking
│   │   └── domain/              # Analytics domain entities
│   ├── content/                 # Content pack services (multiple implementations)
│   │   ├── content-service.ts   # Main content service
│   │   ├── content-loader.ts    # Content loading logic
│   │   └── content-validator.ts # Validation logic
│   ├── domain/                  # Domain services (clean architecture)
│   │   ├── services/            # Domain services
│   │   ├── entities/            # Domain entities
│   │   └── interfaces/          # Domain interfaces
│   ├── db/                      # Database services
│   │   ├── database-service.ts  # Main database service
│   │   ├── database-helpers.ts  # Helper functions
│   │   └── database-types.ts    # Type definitions
│   └── infrastructure/          # Infrastructure implementations
├── components/                  # Reusable UI components
│   ├── ui/                      # shadcn/ui components
│   ├── auth/                    # Auth-related components
│   └── admin/                   # Admin components
├── types/                       # TypeScript type definitions
└── hooks/                       # Custom React hooks

app/                             # Next.js App Router
├── (auth)/                      # Auth route group
├── (dashboard)/                 # Dashboard route group
├── admin/                       # Admin pages
├── api/                         # API routes
└── globals.css                  # Global styles

supabase/                        # Supabase configuration
├── migrations/                  # Database migrations
├── seeds/                       # Database seeds
└── config.toml                 # Supabase config

scripts/                         # Utility scripts
├── maintenance.sh              # Maintenance scripts
├── migrate.sh                   # Migration scripts
└── troubleshoot.sh              # Troubleshooting scripts

public/                          # Static assets
├── icons/                       # Icon assets
└── images/                      # Image assets

tests/                           # Test files
├── unit/                        # Unit tests (Vitest)
├── integration/                 # Integration tests
└── fixtures/                    # Test data and mocks
```

**Structure Decision**: Next.js 14 full-stack web application with analysis tools. The current structure shows significant duplication across service layers, particularly in authentication, analytics, and content management services. The analysis will focus on identifying consolidation opportunities while maintaining the existing onion architecture pattern.

## Complexity Tracking

*No Constitution Check violations - all gates passed successfully*

## Phase 0: Research Complete ✅

**Research Document**: [research.md](./research.md)

**Key Decisions**:
- Systematic directory traversal with pattern matching for comprehensive analysis
- Interface comparison and dependency analysis for duplication detection
- Architectural pattern templates for consistency validation
- Impact-effort matrix for recommendation prioritization

**All technical unknowns resolved** - no NEEDS CLARIFICATION markers remain.

## Phase 1: Design Complete ✅

**Data Model**: [data-model.md](./data-model.md)
- Core entities: ProjectStructure, Directory, File, ServiceDuplication, StructuralInconsistency, CleanupRecommendation
- Validation rules and state transitions defined
- Relationships mapped between entities

**API Contracts**: [contracts/api-specification.md](./contracts/api-specification.md)
- RESTful API design for analysis operations
- Comprehensive error handling and response formats
- Rate limiting and caching strategies

**Quickstart Guide**: [quickstart.md](./quickstart.md)
- Step-by-step analysis process
- Key findings preview with specific duplications identified
- Prioritized implementation strategy

**Agent Context Updated**: Cursor IDE context updated with TypeScript 5.0+, Next.js 14, React 19, Supabase, PostHog, Sentry, Biome, Vitest

## Constitution Check - Post Design ✅

**All gates remain passed** - design decisions align with constitution requirements:
- Onion Architecture pattern maintained
- TypeScript strict mode compliance
- Test-first approach planned
- Performance targets defined
- MCP integrations preserved
