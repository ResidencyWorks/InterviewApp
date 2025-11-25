# Implementation Plan: ResidencyWorks M0 Trial - MatchReady Interview Drills

**Branch**: `006-mobile-performance-transcript-response` | **Date**: 2025-01-27 | **Spec**: ResidencyWorks3daytrial.md
**Input**: ResidencyWorks M0 trial specification for 3-day delivery

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Deliver a working skeleton of the core interview drill loop with fake ASR (Automatic Speech Recognition) to prove architecture, latency, data flow, and UX before full build. The system must support: record/type → submit → (fake STT) → score (rules) → LLM-style refactor (stub) → return JSON → render chips + notes → save to store → analytics fired.

## Technical Context

**Language/Version**: TypeScript 5.3.0, Node.js 22.x, Next.js 16.0.0
**Primary Dependencies**: React 19.2.0, Supabase, OpenAI, Stripe, PostHog, Sentry, Upstash Redis, Tailwind CSS, shadcn/ui
**Storage**: Supabase (PostgreSQL), Upstash Redis (entitlements cache), Vercel (deployment)
**Testing**: Vitest, Playwright, Testing Library, 80% coverage target
**Target Platform**: Web application (mobile-responsive), Vercel deployment
**Project Type**: Single Next.js application with API routes
**Performance Goals**: Core loop ≤250ms, Redis lookups ≤50ms, content validation ≤1s, transcript response <10s
**Constraints**: 3-day delivery window, fake ASR for M0, mobile-first responsive design, real auth/entitlements
**Scale/Scope**: Trial system for architecture validation, 1-2 prompts per category, basic analytics

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Code Quality Gates:**

- [x] TypeScript strict mode enabled (tsconfig.json configured)
- [x] Biome formatting and linting configured (biome.json present)
- [x] lefthook hooks configured for pre-commit/pre-push (lefthook.yml present)
- [x] JSDoc comments planned for all exported functions (existing codebase follows this)

**Architecture Gates:**

- [x] Onion Architecture pattern identified (existing lib/ structure with domain, infrastructure layers)
- [x] Domain layer independence from frameworks confirmed (domain entities and services isolated)
- [x] Interface adapters using DI pattern planned (existing service factories and adapters)

**Testing Gates:**

- [x] Test-first approach planned (Vitest config present, test directories exist)
- [x] Vitest configuration planned (vitest.config.ts configured)
- [x] 80% coverage target set (specification requirement)
- [x] Unit and integration test strategy defined (existing test structure)

**Tooling Gates:**

- [x] pnpm as package manager confirmed (package.json specifies pnpm@10.18.3)
- [x] Devcontainer with Node.js LTS, Biome, lefthook planned (existing setup)
- [x] No ESLint/Prettier (Biome only) (biome.json configured, no ESLint config)

**Performance Gates:**

- [x] Core loop performance targets defined (≤250ms for /api/evaluate)
- [x] Redis lookup targets defined (≤50ms for Upstash Redis)
- [x] Content validation targets defined (≤1s for content pack validation)

**MCP Integration Gates:**

- [x] Context7 for specs/plans identified (current planning system)
- [x] Supabase for auth/storage/DB planned (existing integration)
- [x] Vercel for deployment planned (next.config.js configured)
- [x] PostHog for analytics planned (posthog-js dependency)
- [x] Sentry for error tracking planned (sentry config files present)

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
# Single Next.js application structure
app/
├── (auth)/                    # Auth route group
├── (dashboard)/               # Dashboard route group
├── admin/                     # Admin pages
├── api/                       # API routes
│   ├── evaluate/              # Core evaluation endpoint
│   ├── content-packs/         # Content pack management
│   ├── webhooks/              # Stripe webhooks
│   └── auth/                  # Auth endpoints
├── auth/                      # Auth pages
├── globals.css                # Global styles
├── layout.tsx                 # Root layout
└── page.tsx                   # Home page

components/                    # Reusable UI components
├── ui/                        # shadcn/ui components
└── [feature-components]/      # Feature-specific components

lib/                          # Core business logic
├── domain/                    # Domain entities and services
│   ├── entities/              # Business entities
│   └── services/              # Domain services
├── infrastructure/            # External integrations
│   ├── supabase/              # Supabase adapters
│   ├── openai/                # OpenAI adapters
│   └── filesystem/            # File system adapters
├── llm/                       # LLM service layer
│   ├── application/           # Application services
│   ├── domain/                # LLM domain logic
│   └── infrastructure/        # LLM infrastructure
└── supabase/                  # Supabase client setup

tests/                        # Test files
├── __mocks__/                 # Test mocks
├── api/                       # API route tests
├── components/                # Component tests
└── lib/                       # Unit tests

public/                       # Static assets
supabase/                     # Supabase config and migrations
specs/                        # Specification documents
```

**Structure Decision**: Single Next.js application with clear separation of concerns. The existing structure already follows Onion Architecture principles with domain, infrastructure, and application layers properly separated. The app directory uses Next.js 13+ App Router with route groups for organization.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
