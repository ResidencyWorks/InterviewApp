# Implementation Plan: Content Pack Loader

**Branch**: `002-content-pack-loader` | **Date**: 2025-01-27 | **Spec**: [link]
**Input**: Feature specification from `/specs/002-content-pack-loader/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a dev/admin-only content pack loader for JSON content packs with drag-and-drop UI, Zod validation, hot-swap capabilities, and PostHog analytics. The system enables developers to upload, validate, and activate content packs without redeployment, with fallback handling and comprehensive error tracking via Sentry. Includes role-based access control via Supabase and devcontainer integration.

## Technical Context

**Language/Version**: TypeScript 5.0+ with strict mode enabled
**Primary Dependencies**: Next.js 14, Supabase, PostHog, Sentry, shadcn/ui, Zod, multer
**Storage**: In-memory for active content packs, Supabase for role management, file system for temporary uploads
**Testing**: Vitest for unit tests, Playwright for E2E tests
**Target Platform**: Web application (admin interface), Vercel deployment
**Project Type**: Web application (Next.js admin interface)
**Performance Goals**: Content pack validation ≤1s, hot-swap ≤500ms, file upload ≤30s for 10MB
**Constraints**: Admin-only access, role-based security, devcontainer integration
**Scale/Scope**: M0 MVP with 3 user stories, 1 admin interface, 4 API endpoints

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

- [x] Content pack validation performance targets defined (≤1s)
- [x] Hot-swap performance targets defined (≤500ms)
- [x] File upload performance targets defined (≤30s for 10MB)

**MCP Integration Gates:**

- [x] Context7 for specs/plans identified
- [x] Supabase for auth/storage/DB planned
- [x] Vercel for deployment planned
- [x] PostHog for analytics planned
- [x] Sentry for error tracking planned

## Project Structure

### Documentation (this feature)

```
specs/002-content-pack-loader/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
# Content Pack Loader Integration
src/
├── app/
│   ├── (admin)/              # Admin route group (protected)
│   │   └── content-loader/   # Content pack loader interface
│   └── api/
│       ├── content/          # Content pack API endpoints
│       │   ├── upload/       # File upload endpoint
│       │   ├── validate/     # Validation endpoint
│       │   ├── activate/     # Activation endpoint
│       │   └── status/       # Status endpoint
│       └── admin/            # Admin-only endpoints
├── components/
│   ├── admin/               # Admin-specific components
│   │   ├── ContentPackUploader.tsx
│   │   ├── ValidationResults.tsx
│   │   ├── FallbackWarning.tsx
│   │   └── ContentPackStatus.tsx
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── content/             # Content pack management
│   │   ├── domain/          # Domain layer
│   │   │   ├── entities/    # ContentPack, ValidationResult
│   │   │   ├── services/    # ContentPackService
│   │   │   └── interfaces/  # Service contracts
│   │   ├── application/     # Application layer
│   │   │   ├── services/    # ContentPackManagementService
│   │   │   └── use-cases/   # Upload, Validate, Activate
│   │   ├── infrastructure/  # Infrastructure layer
│   │   │   ├── validation/  # Zod schema validation
│   │   │   ├── storage/     # File system operations
│   │   │   └── analytics/   # PostHog integration
│   │   └── types/           # TypeScript definitions
│   ├── auth/               # Auth utilities (Supabase)
│   └── admin/              # Admin utilities
├── types/                  # TypeScript type definitions
└── hooks/                  # Custom React hooks
    └── useContentPack.ts   # Content pack management hook

tests/
├── unit/
│   └── content/           # Unit tests for content pack logic
├── integration/
│   └── content/           # Integration tests
└── e2e/
    └── admin/             # E2E tests for admin interface

# Devcontainer integration
.devcontainer/
├── devcontainer.json
└── scripts/
    └── setup-content-loader.sh  # Content loader setup script
```

**Structure Decision**: Next.js 14 admin interface with Onion Architecture for content pack management. Clear separation between admin UI, API endpoints, and core business logic. Devcontainer integration for development environment setup.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [None currently identified] | [N/A] | [N/A] |
