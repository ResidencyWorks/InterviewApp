```markdown
# Feature Specification: M3 – AI/ASR Endpoint + BullMQ Worker

**Feature Branch**: `001-ai-asr-eval`
**Created**: 2025-11-20
**Status**: Draft
**Input**: User description: "M3 – AI/ASR Endpoint + BullMQ Worker: Integrate Whisper ASR + GPT feedback with BullMQ for job orchestration and SLA validation."

## Clarifications

### Session 2025-11-20

- Q: "What should be the durable storage for EvaluationResult?" → A: "Postgres (Supabase) — durable, queryable, and already used in the repo; best for idempotency and audit trails."

### Session 2025-11-20

- Q: "sync vs async response behavior—should the endpoint always wait for final evaluation or prefer async job response?" → A: "Hybrid: sync up to timeout, else 202+jobId"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit evaluation (Priority: P1)

As a client (frontend or CLI), I can POST an evaluation request to `/api/evaluate` with either:
- a `text` payload (raw user speech text) or
- an `audio_url` pointing to a publicly accessible audio file

So that I receive a validated evaluation containing `score`, `feedback`, `what_changed`, and `practice_rule` for the submission.

**Why this priority**: This is the core end-to-end experience delivering immediate value to users and downstream systems.

**Independent Test**: POST a `text` payload to `/api/evaluate` and verify a 200 response body matches the evaluation Zod schema and contains a numeric `score` and human-readable `feedback`.

**Acceptance Scenarios**:

1. **Given** a service healthy and Redis/BullMQ available, **When** a client POSTs {"requestId":"<uuid>", "text":"Hello world"} to `/api/evaluate`, **Then** the service returns `200` and a JSON body that validates against the evaluation schema and includes `duration`, `score`, `feedback`, `what_changed`, and `practice_rule`.

2. **Given** a client POSTs {"requestId":"<uuid>", "audio_url":"https://.../clip.mp3"}, **When** the job is processed by the worker, **Then** the endpoint returns `200` and the validated evaluation JSON within the SLA (see Success Criteria). If processing cannot complete within the synchronous server timeout (configured default 30s), the endpoint returns `202` with `jobId` and instructions for polling or webhooks (hybrid behavior: sync when quick, async otherwise).

---

### User Story 2 - Reliable background processing (Priority: P2)

As a system operator, I need a BullMQ worker that consumes jobs from `evaluationQueue`, runs Whisper transcription and GPT evaluation, stores results, and emits observability events so the system is reliable and measurable.

**Why this priority**: Ensures long-running or heavy tasks are resilient, retryable, and measurable; it's required for scale and fault tolerance.

**Independent Test**: Enqueue an audio evaluation job directly on the queue (or via `/api/evaluate`) and confirm the worker completes transcription, evaluates via GPT, writes a result, and emits the `job_completed` and `score_returned` PostHog events.

**Acceptance Scenarios**:

1. **Given** a job in `evaluationQueue`, **When** the worker processes it, **Then** it attempts Whisper transcription, sends the transcript to GPT for structured output, validates the GPT output matches evaluation Zod schema, marks job completed, and emits `job_completed` with latency/token usage.

2. **Given** transient failures (OpenAI timeout, network error), **When** the worker fails, **Then** it retries with exponential backoff up to 3 attempts and emits failure metrics if retries exhausted.

---

### User Story 3 - Observability and SLA testing (Priority: P3)

As an SRE or QA engineer, I want a CLI test harness that sends 20–30 representative requests and reports p95 latency, success rate, and token usage so we can validate SLA claims.

**Why this priority**: Demonstrates the system meets SLAs and provides an automated smoke test for releases.

**Independent Test**: Run the CLI harness which posts 25 evaluation requests, then produce a report showing p50/p95/p99 latencies and whether p95 < 10s.

**Acceptance Scenarios**:

1. **Given** the service is deployed, **When** the CLI harness runs 25 requests, **Then** it reports p95 latency and asserts p95 < 10s for the sample workload.

---

### Edge Cases

- Audio URL unreachable or 404: system should mark job failed with clear error and emit a `job_failed` event.
- Whisper returns an empty transcript: mark job failed or return an evaluation with score 0 and reason code.
- GPT returns malformed JSON: worker retries; on repeated malformed responses, mark job failed and persist raw GPT output for investigation.
- Duplicate `requestId`: system must be idempotent and return the same evaluation result (see FR-009 idempotency).
- Very long audio files ( > 5 minutes): worker should reject or require pre-processing (documented behavior in Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose a Next.js POST route at `/api/evaluate` that accepts either `text` or `audio_url` plus a `requestId` (UUID) and optional `metadata`.
- **FR-002**: Incoming requests MUST be validated server-side using a Zod schema that enforces required fields and types; invalid requests return `400` with validation errors.
- **FR-003**: Each accepted request MUST be assigned or carry a `requestId` (UUID) for tracking and deduplication.
- **FR-004**: The system MUST enqueue audio evaluation requests onto a BullMQ queue named `evaluationQueue` and process them with a worker that performs: transcription → GPT evaluation → validation → result storage/emission.
- **FR-005**: The worker MUST call OpenAI Whisper (or equivalent) for transcription and then call GPT (model `gpt-4-turbo`) with a prompt that requests a structured JSON with `score`, `feedback`, `what_changed`, and `practice_rule`.
- **FR-006**: GPT evaluation responses MUST be validated against the same Zod schema; invalid GPT outputs trigger retry with backoff up to 3 attempts.
- **FR-007**: The worker MUST track job latency (start/end), and token usage (when available) and include those metrics with `job_completed` PostHog events.
- **FR-008**: Emit PostHog events: `job_completed` (includes jobId, requestId, durationMs, tokensUsed, score) and `score_returned` (jobId, requestId, latency, score) when a validated evaluation is returned to a client.
- **FR-009**: Implement idempotency so that duplicate submissions (same `requestId`) do not result in duplicate work or different results — return the stored result for that `requestId`.
- **FR-010**: Configure BullMQ retries with exponential backoff and a maximum of 3 attempts for transient errors; permanent schema validation failures should not be retried.
- **FR-011**: The `/api/evaluate` endpoint MUST return a Zod-validated JSON body when returning a final evaluation (or a 202 + `jobId` when processing will be asynchronous).
 - **FR-012**: The system MUST expose a polling status endpoint `GET /api/evaluate/status/:jobId` returning job `status`, optional `result`, `error`, and `poll_after_ms` exactly per the contract examples.
 - **FR-013**: When a webhook URL + secret are configured, the system MUST dispatch a completion/failure payload (with `jobId`, `requestId`, `status`, `result` or `error`) to that URL with header `X-Evaluate-Webhook-Token` and retry transient failures (see error codes & retry policy).
 - **FR-014**: All evaluation and status endpoints MUST enforce authenticated access (API key or Bearer token) and apply a configurable rate limit (default 60 requests/min per key) returning `401` or `429` appropriately.

### Non-Functional Requirements

- **NFR-001 (Rate Limiter Accuracy)**: Rate limiter must allow ≤1% false positives (blocking below limit) and ≤0.1% false negatives (allowing above limit) in load tests.
- **NFR-002 (Security Logging)**: All auth failures (401) and rate limit exceed events (429) MUST be logged with timestamp, key identifier, and remote IP.
- **NFR-003 (Test Coverage)**: Unit + integration test coverage for this feature must reach ≥80% and be enforced by CI before merge.
- **NFR-004 (Webhook Reliability)**: Webhook dispatch MUST retry transient network failures up to 3 times with exponential backoff (1s, 3s, 9s). Permanent 4xx (other than 429) are not retried.

### Key Entities *(include if feature involves data)*

- **EvaluationRequest**: { requestId: UUID, text?: string, audio_url?: string, metadata?: object }
- **EvaluationJob**: { jobId: string, requestId: UUID, status: queued|processing|completed|failed, attempts: number, createdAt, updatedAt }
- **Transcript**: { requestId: UUID, transcript: string, provider: string, durationMs }
- **EvaluationResult**: { requestId: UUID, jobId: string, score: number, feedback: string, what_changed: string, practice_rule: string, durationMs: number, tokensUsed?: number }
- **MetricEvent**: { event: string, jobId, requestId, latencyMs, tokensUsed, timestamp }

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 (Latency SLA)**: For a representative sample of 25 mixed requests (text and short audio), p95 end-to-end evaluation latency must be < 10 seconds when services (OpenAI, Redis) are healthy. Verified by the CLI harness.
- **SC-002 (Reliability)**: 95% of evaluation jobs complete successfully (status completed) within 30s in the same sample harness run.
- **SC-003 (Idempotency)**: Submitting the same `requestId` twice returns the identical `EvaluationResult` and does not create a second successful job.
- **SC-004 (Observability)**: A `job_completed` event and a `score_returned` event are emitted for each completed job and include `jobId`, `requestId`, `durationMs`, and `score`.
- **SC-005 (Validation)**: All final responses returned by `/api/evaluate` validate against the evaluation Zod schema (no schema validation errors in successful responses).
 - **SC-006 (Auth & Rate Limit)**: Unauthorized requests receive 401; clients exceeding configured limit receive 429 with `retry_after_ms` header; conformance validated in T040 tests.

### Example Responses (NEW)

#### 200 Synchronous Success (text path)

```json
{
	"requestId": "41c9f14f-5c2d-4e2e-9db5-2c6b9e4e2e17",
	"jobId": "eval:1732129380123",
	"score": 82,
	"feedback": "Good pacing and clarity; consider varying intonation.",
	"what_changed": "Reduced filler words from 8 to 2; more confident tone.",
	"practice_rule": "Pause ~300ms before answering behavioral questions.",
	"durationMs": 1240,
	"tokensUsed": 456
}
```

#### 202 Accepted (async path)

```json
{
	"status": "accepted",
	"jobId": "eval:1732129380456",
	"requestId": "41c9f14f-5c2d-4e2e-9db5-2c6b9e4e2e17",
	"poll_after_ms": 3000,
	"location": "/api/evaluate/status/eval:1732129380456"
}
```

#### Polling Status (in-progress)

```json
{
	"jobId": "eval:1732129380456",
	"requestId": "41c9f14f-5c2d-4e2e-9db5-2c6b9e4e2e17",
	"status": "processing",
	"result": null,
	"error": null,
	"poll_after_ms": 3000
}
```

#### Polling Status (completed)

```json
{
	"jobId": "eval:1732129380456",
	"requestId": "41c9f14f-5c2d-4e2e-9db5-2c6b9e4e2e17",
	"status": "completed",
	"result": {
		"requestId": "41c9f14f-5c2d-4e2e-9db5-2c6b9e4e2e17",
		"jobId": "eval:1732129380456",
		"score": 90,
		"feedback": "Improved energy and projection; minor pacing issues remain.",
		"what_changed": "Fewer filler words; stronger opening statement.",
		"practice_rule": "Record practice sessions focusing on pacing every morning.",
		"durationMs": 2980,
		"tokensUsed": 612
	},
	"error": null,
	"poll_after_ms": 0
}
```

#### Polling Status (failed)

```json
{
	"jobId": "eval:1732129380456",
	"requestId": "41c9f14f-5c2d-4e2e-9db5-2c6b9e4e2e17",
	"status": "failed",
	"result": null,
	"error": { "code": "audio_too_long", "message": "Audio length exceeds max 300s for synchronous path." },
	"poll_after_ms": 0
}
```


## Assumptions

- OpenAI credentials (Whisper & GPT) and PostHog keys are available as environment variables.
- Redis is available for BullMQ and has sufficient capacity for the target workload.
- The API will attempt synchronous processing and return the final evaluation where feasible; if processing cannot complete within the configured synchronous timeout (default 30s), the endpoint will return `202` with a `jobId` and instructions for polling or receiving a webhook callback. This hybrid approach minimizes client wait while preserving SLA guarantees.
- Result storage for `EvaluationResult` will be Postgres (Supabase) for durability, queryability, and auditability, supporting idempotency and future reporting needs.
 - Long audio files (>5 minutes) are out of scope for synchronous evaluation and should be pre-processed or rejected.

### Polling & Webhook Contract (NEW)

- Polling endpoint: `GET /api/evaluate/status/:jobId` SHOULD return current job status and, when available, the final `EvaluationResult`.
- Polling response shape (200):

```json
{
	"jobId": "string",
	"requestId": "uuid",
	"status": "queued|processing|completed|failed",
	"result": { /* EvaluationResult when status===completed */ } | null,
	"error": { "code": "string", "message": "string" } | null,
	"poll_after_ms": 3000
}
```

- Webhook callback: When configured, workers SHOULD POST the same `job` payload to a configured callback URL using a shared secret header `X-Evaluate-Webhook-Token: <secret>`. The body includes `jobId`, `requestId`, `status`, and the `EvaluationResult` or `error` object.

### Authentication & Rate Limiting

- The `/api/evaluate` endpoint MUST require an API credential. Supported modes:
	- `Authorization: Bearer <token>` for service clients, or
	- `x-api-key: <key>` for simple service-to-service calls.
- Public unauthenticated access is NOT permitted for production. If the feature is used in a permissive environment, add explicit rate-limiting (default suggestion: 60 req/min per API key) and abuse controls.

### Idempotency Semantics (Detailed)

- On request arrival the API SHOULD perform these checks in order:
	1. If a completed `EvaluationResult` exists in DB for `requestId`, return that result immediately (200).
	2. If a job exists for the `requestId` and is not completed, return `202` plus `jobId` and current `status` (or optionally wait up to `SYNC_TIMEOUT_MS` for completion based on request path). Clients may poll `GET /api/evaluate/status/:jobId` or receive webhook callbacks.
	3. Otherwise create a new job and return either the final result (if processed synchronously within `SYNC_TIMEOUT_MS`) or `202` with `jobId`.

- Worker-side: Before performing the expensive evaluation, the worker MUST check `evaluation_results` by `requestId` and skip processing if a completed result exists; instead emit `job_completed` with stored metadata.

### Long-audio policy

- Files longer than 300 seconds (5 minutes) are outside the synchronous fast-path. Behavior:
	- If `audio_url` references a file >300s and the client is using the synchronous path, the API MUST return `400` with an error code `audio_too_long` and instructions to re-submit via the async flow.
	- The worker MAY accept long files in async mode but MUST persist a `note` indicating long-file processing and may apply additional throttling or manual review.

### Synchronous waiting mechanism

- Implementation recommendation: For the fast text-path prefer enqueuing the job then using BullMQ's `job.waitUntilFinished(queueEvents, timeout)` or equivalent with a total wait bounded by `SYNC_TIMEOUT_MS`. Avoid running a worker that processes jobs in the exact same thread/process in blocking mode to prevent deadlocks.

### Constitution Exception Request

- **Performance Violation**: The constitution requires the "core loop `/api/evaluate` ≤ 250ms".
- **Justification**: This feature involves ASR (Whisper) and LLM (GPT-4) inference, which inherently exceed 250ms. The "Hybrid" design (sync up to 30s) is a critical user requirement to avoid polling complexity for short text inputs.
- **Exception**: We request an exception for `/api/evaluate` to allow a synchronous timeout up to `SYNC_TIMEOUT_MS` (default 30s). The 250ms limit shall apply only to the initial request validation and enqueueing phase (async path) or entitlement checks.
- **Mitigation**: If the synchronous attempt exceeds the timeout, the system falls back to `202 Accepted` (async), ensuring the client is not blocked indefinitely.

### Error Codes (Normalized)

| Code | Type | Description | Retry? |
|------|------|-------------|--------|
| audio_too_long | PERMANENT | Audio exceeds 300s threshold for sync path | No |
| malformed_gpt_output | TRANSIENT* | GPT returned invalid JSON (retry until max attempts) | Yes (≤3) |
| transcription_empty | PERMANENT | Whisper produced empty transcript | No |
| network_error | TRANSIENT | Network/connection failure to provider | Yes (≤3) |
| provider_timeout | TRANSIENT | Whisper/GPT timed out | Yes (≤3) |
| rate_limited | TRANSIENT | 429 from provider | Yes (respect Retry-After) |
| auth_failed | PERMANENT | Invalid API credential | No |
| webhook_delivery_failed | TRANSIENT | Webhook endpoint unreachable / 5xx | Yes (≤3) |
| tokens_unavailable | INFO | Provider did not return token usage | N/A |

`TRANSIENT*` malformed_gpt_output considered transient until retry limit reached; then stored as permanent failure reason.

## Out of Scope

- UI changes or client-side implementation beyond a minimal CLI harness for SLA testing.
- Detailed storage schema design or exact database choices.
