```markdown
# Tasks: M3 – AI/ASR Endpoint + BullMQ Worker

**Input**: Design documents from `/specs/001-ai-asr-eval/` (spec.md, plan.md)

## Phase 1: Setup (Shared Infrastructure)

 - [X] T001 [P] Create environment example file at `env.example` with keys: `OPENAI_API_KEY`, `POSTHOG_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_REST_URL`, `REQUEST_TIMEOUT_MS`
 - [X] T002 [P] Add runtime dependency `bullmq` and peer-dependency `ioredis` to `package.json` (dev: run `pnpm add bullmq ioredis`) — track changes in `package.json`
 - [X] T003 [P] Add worker start script to `package.json` scripts: `"worker:start": "node ./dist/infrastructure/bullmq/worker.js"` and `"worker:dev": "tsx src/infrastructure/bullmq/worker.ts"`
 - [X] T004 [P] Configure `.env.local.example` and `.env.example` in repo root with placeholders and usage notes at `README.md`
 - [X] T005 [P] Create directory structure required by plan: `src/app/api/evaluate/`, `src/infrastructure/bullmq/`, `src/infrastructure/openai/`, `src/infrastructure/supabase/`, `src/infrastructure/posthog/`, `src/domain/evaluation/`, `cli/`

---

## Phase 2: Foundational (Blocking Prerequisites)

 - [X] T006 [FR-002, FR-003] Create Zod schemas for requests/results at `src/domain/evaluation/ai-evaluation-schema.ts` (export `EvaluationRequestSchema` and `EvaluationResultSchema`) and add canonical contract at `specs/001-ai-asr-eval/contracts/evaluation-schema.md`. Note: Do NOT overwrite existing `evaluation-schema.ts`.
- [X] T007 Create Supabase migration SQL for `evaluation_results` table at `supabase/migrations/20251120000000_create_evaluation_results.sql` (columns: request_id PK, job_id, score numeric, feedback text, what_changed text, practice_rule text, duration_ms int, tokens_used int null, created_at timestamptz)
- [X] T008 [P] Implement Supabase helper for persistence at `src/infrastructure/supabase/evaluation_store.ts` with `getByRequestId(requestId)` and `upsertResult(evaluationResult)` functions
 - [X] T009 [FR-004, FR-010] Implement BullMQ queue configuration at `src/infrastructure/bullmq/queue.ts` (export `evaluationQueue`, configured retries: 3 with exponential backoff)
 - [X] T010 [FR-007, FR-008] Implement PostHog emitter wrapper at `src/infrastructure/posthog/index.ts` (export `captureEvent(name, payload)` using `posthog-node`)
 - [X] T011 [NFR-001, NFR-004] Create configuration/feature flags module at `src/config/index.ts` reading env vars and default timeouts (including `SYNC_TIMEOUT_MS` default 30000, `RATE_LIMIT_RPM` default 60)
- [X] T012 Add TypeScript build output and a minimal `tsconfig` path mapping if needed for `src/` output (ensure worker can be run via `tsx` in dev)
	- [X] T032 [P][FR-012, FR-013] Add Polling & Webhook contract doc at `specs/001-ai-asr-eval/contracts/polling-webhook.md` and update `spec.md` examples/tests to cover polling responses and webhook auth headers
	- [X] T033 [P][NFR-003] Enforce Test-First: add failing unit tests for `EvaluationRequestSchema` and `EvaluationResultSchema` and basic route validation tests before implementing core logic (tests must exist and fail prior to implementation commits). BLOCKS T013–T017.
	- [X] T034 [P][FR-014, NFR-001, NFR-002] Add auth and rate-limit config task: `src/infrastructure/auth/` and middleware `src/app/api/_middleware.ts` to enforce `Authorization`/`x-api-key` and a basic per-key rate limit (configurable via env)
 - [X] T035 [P] Create PostHog events contract at `specs/001-ai-asr-eval/contracts/posthog-events.md` (job_completed, score_returned, tokens_unavailable) and link to `T030`
	- [X] T036 [FR-012] Add polling status endpoint implementation at `src/app/api/evaluate/status/[jobId]/route.ts` with schema validation and unit tests `tests/unit/evaluate.status.spec.ts`
	- [X] T037 [FR-013, NFR-004] Add webhook receiver route (optional) at `src/app/api/evaluate/webhook/route.ts` validating `X-Evaluate-Webhook-Token` and persisting final result if not already stored; implement retry strategy (3 attempts exponential backoff) for webhook dispatch.
	- [X] T038 [FR-012, FR-013] Add contract tests for polling & webhook payloads at `tests/contract/polling-webhook.spec.ts`
	- [X] T039 [FR-007, FR-008] Add PostHog event schema tests at `tests/contract/posthog-events.spec.ts` validating payload shapes (job_completed, score_returned, tokens_unavailable)
	- [X] T040 [FR-014, NFR-001, NFR-002] Add auth & rate-limit tests at `tests/integration/auth-rate-limit.spec.ts` (cases: valid token 200, missing token 401, over limit 429 with `retry_after_ms`)
	- [X] T041 [NFR-003] Add CI coverage gate configuration (≥80%) and failing threshold test (`scripts/coverage-check.ts`) integrated into pre-push
	- [X] T042 [Error Codes] Add error code contract tests at `tests/contract/error-codes.spec.ts` verifying all documented codes appear with correct retry classification

---

## Phase 3: User Story 1 - Submit evaluation (Priority: P1)

**Goal**: Implement `/api/evaluate` Next.js route supporting sync up-to-30s evaluation or `202`+`jobId` for async processing; validate inputs and implement idempotency.

**Independent Test**: POST a `text` evaluation request and confirm a Zod-validated evaluation JSON response with `score` and `feedback` or `202` with `jobId`.

 - [X] T013 [US1][FR-001, FR-002, FR-003, FR-009, FR-011, FR-014] Create Next.js API route at `src/app/api/evaluate/route.ts` accepting POST and using `src/domain/evaluation/ai-evaluation-schema.ts` for validation (auth enforced)
 - [X] T014 [US1][FR-009] In `route.ts`, implement idempotency check using `src/infrastructure/supabase/evaluation_store.ts::getByRequestId` — return stored result if present
 - [X] T015 [US1][FR-011, FR-004, FR-010] In `route.ts`, for new requests: if `text` provided -> attempt synchronous evaluation by enqueuing a job and waiting up to `SYNC_TIMEOUT_MS` for completion; if timeout, return `202` + `jobId` and location/polling instructions
 - [X] T016 [US1][FR-004] Add enqueue helper at `src/services/evaluation/enqueue.ts` that puts job into `evaluationQueue` with job data `{ requestId, text, audio_url, metadata }` and returns `jobId`
 - [X] T017 [US1][FR-002, FR-009, FR-011, FR-014] Add unit tests for request validation, auth enforcement, and idempotency at `tests/unit/evaluate.route.spec.ts`

---

## Phase 4: User Story 2 - Background ASR + GPT evaluation (Priority: P2)

**Goal**: Implement BullMQ worker that transcribes audio via Whisper, sends transcript to GPT-4-turbo for structured evaluation, validates the response, retries on transient errors, stores result, and emits PostHog events including latency/token usage.

**Independent Test**: Enqueue audio and text jobs and confirm worker persists results and emits `job_completed` and `score_returned` events.

- [X] T018 [US2] Implement Whisper transcription helper at `src/infrastructure/openai/whisper.ts` (function `transcribeAudio(url): Promise<{ transcript, durationMs }>`)
- [X] T019 [US2] Implement GPT evaluator at `src/infrastructure/openai/gpt_evaluator.ts` with function `evaluateTranscript(transcript): Promise<EvaluationResult>` that calls GPT-4-turbo, validates output against `EvaluationResultSchema`, and records token usage per `specs/001-ai-asr-eval/contracts/evaluation-schema.md` rules
- [X] T020 [US2] Implement worker processing loop at `src/infrastructure/bullmq/worker.ts` that: marks job processing, calls transcription (if audio_url), calls GPT evaluator, validates result, calls `evaluation_store.upsertResult`, records duration/tokens (per contract), emits PostHog `job_completed` and `score_returned`, and acknowledges job
- [X] T021 [US2] Configure BullMQ job options for exponential backoff and max attempts=3 in `queue.ts` (ensure permanent schema validation failures are not retried)
- [X] T022 [US2] Implement idempotency guard inside worker: if `evaluation_store.getByRequestId` exists and job completed, skip processing and emit `job_completed` with stored metadata
- [X] T023 [US2] Add integration tests for worker in `tests/integration/worker.spec.ts` (mock OpenAI responses and PostHog calls)

---

## Phase 5: User Story 3 - Observability & SLA harness (Priority: P3)

**Goal**: Provide CLI harness that sends 20–30 requests and reports p50/p95/p99 latencies and token usage; ensure p95 < 10s for representative sample.

**Independent Test**: Run `node cli/evaluate-harness.ts` and verify report contains latency percentiles and success rate.

- [X] T024 [US3] Implement CLI harness at `cli/evaluate-harness.ts` that can send configurable number of requests (defaults: 25) with mix of `text` and `audio_url` and measure latencies
- [X] T025 [US3] Add result aggregation and percentile calculation utility at `src/lib/metrics/percentiles.ts`
- [X] T026 [US3] Add a script to `package.json`: `"test:sla": "tsx cli/evaluate-harness.ts"`
- [X] T027 [US3] Add e2e runbook `specs/001-ai-asr-eval/quickstart.md` documenting how to run the harness and interpret results

---

## Phase N: Polish & Cross-Cutting Concerns

- [X] T028 [P] Add README section `docs/ai-asr-eval.md` with architecture diagram and how to run locally
- [X] T029 [P] Add CI job configuration snippet to run worker integration tests and the SLA harness in a controlled environment
- [X] T030 [P] Add PostHog event schema documentation to `specs/001-ai-asr-eval/contracts/posthog-events.md`
- [X] T031 [P] Ensure error handling and Sentry instrumentation are present in worker and endpoint

---

## Dependencies & Execution Order

- Setup tasks (T001–T005) can run in parallel.
- Foundational tasks (T006–T012) block user story implementation.
- User Story 1 (T013–T017) is MVP and should be implemented first after foundation.
- User Story 2 (T018–T023) depends on foundational tasks and complements US1.
- User Story 3 (T024–T027) depends on US1+US2 being runnable.

```
