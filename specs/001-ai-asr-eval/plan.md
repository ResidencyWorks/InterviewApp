
# Implementation Plan: M3 – AI/ASR Endpoint + BullMQ Worker

**Branch**: `001-ai-asr-eval` | **Date**: 2025-11-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-ai-asr-eval/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a Next.js API endpoint `/api/evaluate` that accepts text or audio URL, validates input, and orchestrates evaluation jobs via BullMQ. Jobs run Whisper ASR (audio transcription) and GPT-4-turbo (feedback/scoring), with results validated by Zod and stored in Supabase Postgres for idempotency and audit. The system tracks latency/cost, emits PostHog events, and supports hybrid sync/async responses. CLI harness and test coverage ensure SLA compliance (p95 < 10s).


## Technical Context

**Language/Version**: TypeScript 5.9, Node.js 22.x, Next.js 16
**Primary Dependencies**: BullMQ, openai, posthog-node, zod, @supabase/supabase-js, uuid
**Storage**: Supabase Postgres (primary for EvaluationResult), Upstash Redis (BullMQ queue)
**Testing**: Vitest, Testing Library, Playwright (for CLI harness)
**Target Platform**: Linux server (Vercel/Node), CLI (local)
**Project Type**: Web backend (API route), CLI tool
**Performance Goals**: p95 < 10s for evaluation, Redis lookup ≤50ms, content validation ≤1s
**Constraints**: Hybrid sync/async API, idempotency, retries/backoff, strict Zod validation, auditability
**Scale/Scope**: 10k+ jobs/day, 25+ concurrent requests, scalable to 1000s of users

**Performance Gates:**

## Project Structure

### Documentation (this feature)

```
specs/001-ai-asr-eval/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```
src/
├── app/api/evaluate/         # Next.js API route for evaluation
├── domain/evaluation/        # Core domain logic, Zod schemas
├── infrastructure/bullmq/    # BullMQ queue and worker
├── infrastructure/openai/    # Whisper/GPT integration
├── infrastructure/supabase/  # DB access for EvaluationResult
├── infrastructure/posthog/   # Analytics event emission
├── cli/evaluate-harness.ts   # CLI harness for SLA testing
└── models/                   # Shared types/entities

```
├── contract/
├── integration/
└── unit/
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
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Performance gate (250ms) vs evaluation path | Need full ASR + GPT scoring which exceeds 250ms | Pure async only would degrade UX; hybrid keeps fast responses for text under timeout. Exception requested in spec. |
| Added status & webhook endpoints | Observability & async reliability | Polling-only risks poor DX; webhook adds push model without separate service |
| Auth + rate limiting middleware | Prevent abuse & ensure SLA fairness | Public open endpoint risks cost explosion & noisy metrics |
| PostHog event schema + tests | Trace reliability & scoring metrics | Ad-hoc events reduce ability to monitor SLA & debug issues |
| Error code taxonomy & retry logic | Deterministic failure handling | Implicit error strings lead to inconsistent retries and analytics gaps |
| New schema file `ai-evaluation-schema.ts` | Avoid collision with legacy `evaluation-schema.ts` | Overwriting legacy schema risks breaking existing features (ResidencyWorks) |
