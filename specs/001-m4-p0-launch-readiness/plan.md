# Implementation Plan: M4 P0 Launch Readiness - PHI Compliance, Documentation & Operational Readiness

**Branch**: `001-m4-p0-launch-readiness` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-m4-p0-launch-readiness/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement PHI scrubbing utilities and data redaction mechanisms to ensure healthcare compliance, create operational runbooks for incident recovery, document performance and cost targets, add content pack status visibility, and establish support SLA documentation. This feature focuses on launch readiness through security compliance, operational documentation, and user transparency.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) targeting Node.js 22.x LTS
**Primary Dependencies**: Next.js 16 App Router, React 19, Supabase client SDK, PostHog (posthog-js, posthog-node), Sentry (@sentry/nextjs), Zod, Vitest, Biome
**Storage**: Supabase PostgreSQL (evaluation results, user data), Upstash Redis (cache, BullMQ queue)
**Testing**: Vitest for unit/integration tests, Playwright for e2e validation
**Target Platform**: Web application deployed on Vercel (serverless + edge runtimes)
**Project Type**: Full-stack web (Next.js) with Onion Architecture layering
**Performance Goals**: PHI scrubbing adds <100ms latency (SC-010), content pack banner displays within 2s (SC-006), existing performance targets maintained (≤250ms core loop, ≤50ms Redis lookup)
**Constraints**: Must not break existing analytics/error tracking functionality, scrubbing must be transparent to users, documentation must be ≤150 words per section, runbook commands must be executable
**Scale/Scope**: All user submissions, all analytics events, all error logs, operational documentation for production incidents

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
- [x] PHI scrubbing performance target defined (<100ms)

**MCP Integration Gates:**

- [x] Context7 for specs/plans identified
- [x] Supabase for auth/storage/DB planned
- [x] Vercel for deployment planned
- [x] PostHog for analytics planned
- [x] Sentry for error tracking planned

## Project Structure

### Documentation (this feature)

```
specs/001-m4-p0-launch-readiness/
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
├── shared/
│   └── security/                    # NEW: Security utilities
│       ├── phi-scrubber.ts          # PHI scrubbing utility
│       ├── data-scrubber.ts         # Data redaction utility
│       └── analytics-validator.ts   # Analytics validation utility
├── components/
│   └── content/                     # NEW: Content-related components
│       └── ContentPackMissingBanner.tsx  # Warning banner component
├── app/
│   ├── api/
│   │   ├── evaluations/route.ts     # MODIFY: Add PHI scrub before save
│   │   ├── submit-text/route.ts    # MODIFY: Add PHI scrub
│   │   └── text-submit/route.ts    # MODIFY: Add PHI scrub
│   └── (dashboard)/
│       └── layout.tsx              # MODIFY: Add content pack banner
├── infrastructure/
│   ├── logging/
│   │   └── logger.ts               # MODIFY: Add log scrubbing
│   └── posthog/
│       └── client.ts                # MODIFY: Add PostHog scrubbing
├── features/
│   ├── notifications/
│   │   ├── infrastructure/posthog/
│   │   │   └── AnalyticsService.ts  # MODIFY: Add scrubbing
│   │   └── application/analytics/
│   │       └── transcript-analytics.ts  # MODIFY: Add scrubbing
│   └── scheduling/
│       └── infrastructure/monitoring/
│           ├── error-monitoring.ts  # MODIFY: Add context scrubbing
│           └── SentryMonitoring.ts  # MODIFY: Add Sentry scrubbing
└── instrumentation-client.ts        # MODIFY: Add Sentry beforeSend scrubbing

docs/
├── performance/
│   └── latency-budget.md           # NEW: Latency budget documentation
├── operations/
│   ├── cost-control.md             # NEW: Cost-control documentation
│   └── failover-rollback-runbook.md  # NEW: Operational runbook
├── qa/
│   └── p0-ux-checklist.md          # NEW: P0 UX checklist
└── m4-p0-proof-attachments.md      # NEW: Proof attachments index

README.md                            # MODIFY: Add SLA section
```

**Structure Decision**: Following existing Onion Architecture pattern. Security utilities in `src/shared/security/` (shared layer), UI components in `src/components/` (presentation layer), modifications to existing infrastructure adapters, documentation in `docs/` organized by purpose.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | No violations - all gates pass |
