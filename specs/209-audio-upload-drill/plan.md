# Implementation Plan: Audio Upload for Drill Recordings

**Branch**: `009-audio-upload-drill` | **Date**: 2025-01-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/009-audio-upload-drill/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement client-side audio recording with 90-second maximum duration, upload to Supabase storage with progress tracking and retry logic, and generate time-limited signed URLs for playback. Include fallback text input for microphone-blocked scenarios.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**:
- Next.js 16 (App Router)
- Supabase JS Client (@supabase/supabase-js)
- Zod for validation
- MediaRecorder Web API
- shadcn/ui for UI components

**Storage**: Supabase Storage (dedicated bucket `drill-recordings`)
- Private bucket with service role access
- 30-day auto-delete via lifecycle policy
- Metadata storage in Supabase PostgreSQL

**Testing**: Vitest with jsdom
- Unit tests for MediaRecorder wrapper and retry logic
- Integration tests for API routes
- E2E tests for upload flow (Playwright)

**Target Platform**: Modern web browsers (Chrome 47+, Firefox 25+, Safari 14.1+)

**Project Type**: Web application (Next.js)

**Performance Goals**:
- Upload API response < 2 seconds (typical network)
- Signed URL generation < 500ms
- Progress updates every 1 second

**Constraints**:
- 90-second maximum recording duration
- 5MB typical file size limit
- 15-minute signed URL expiry
- 3 retry attempts with exponential backoff

**Scale/Scope**:
- Single file upload per drill session
- Audio files only (no video)
- Phased rollout with monitoring

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Code Quality Gates:**

- [x] TypeScript strict mode enabled
- [x] Biome formatting and linting configured
- [x] lefthook hooks configured for pre-commit/pre-push
- [x] JSDoc comments planned for all exported functions

**Architecture Gates:**

- [x] Onion Architecture pattern identified (Domain: Recording entity, Application: Upload service, Infrastructure: Supabase client)
- [x] Domain layer independence from frameworks confirmed (Recording domain model independent of Supabase)
- [x] Interface adapters using DI pattern planned (Upload service interfaces)

**Testing Gates:**

- [x] Test-first approach planned (write tests before implementation)
- [x] Vitest configuration planned
- [x] 80% coverage target set
- [x] Unit and integration test strategy defined

**Tooling Gates:**

- [x] pnpm as package manager confirmed
- [x] Devcontainer with Node.js LTS, Biome, lefthook planned
- [x] No ESLint/Prettier (Biome only)

**Performance Gates:**

- [x] Upload API performance targets defined (≤2s)
- [x] Redis lookup targets defined (N/A for this feature)
- [x] Signed URL generation targets defined (≤500ms)

**MCP Integration Gates:**

- [x] Context7 for specs/plans identified
- [x] Supabase for auth/storage/DB planned
- [x] Vercel for deployment planned
- [x] PostHog for analytics planned (upload progress events)
- [x] Sentry for error tracking planned

## Project Structure

### Documentation (this feature)

```
specs/009-audio-upload-drill/
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
├── app/
│   └── api/
│       └── upload/
│           └── route.ts              # POST /api/upload (upload audio file)
├── components/
│   └── drill/
│       ├── AudioRecorder.tsx         # MediaRecorder wrapper component
│       ├── UploadProgress.tsx        # Progress bar with retry
│       └── TextFallback.tsx          # Fallback text input
├── lib/
│   ├── upload/
│   │   ├── upload-service.ts         # Core upload orchestration
│   │   ├── retry-logic.ts            # Exponential backoff retry
│   │   └── types.ts                  # Upload-related types
│   └── storage/
│       ├── supabase-storage.ts       # Supabase client wrapper
│       ├── signed-url.ts             # Signed URL generation
│       └── lifecycle.ts              # 30-day cleanup policy
├── models/
│   └── recording.ts                  # Recording domain model
└── services/
    └── entitlement.ts                # User permission validation

tests/
├── unit/
│   ├── lib/upload/retry-logic.test.ts
│   ├── lib/storage/signed-url.test.ts
│   └── models/recording.test.ts
├── integration/
│   ├── api/upload/route.test.ts
│   └── lib/upload/upload-service.test.ts
└── e2e/
    └── upload-flow.spec.ts           # Full upload with MediaRecorder
```

**Structure Decision**: Next.js single project structure with feature-based organization under `src/`. Tests mirror the source structure under `tests/`. API routes in `app/api/` following Next.js App Router conventions.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | No violations | All gates pass |
