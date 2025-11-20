# Feature Specification: M0 Core Loop Skeleton

**Feature Branch**: `007-m0-core-loop`
**Created**: 2025-10-22
**Status**: Draft
**Input**: Deliver a working skeleton of the core practice loop using a simulated speech-to-text step to validate architecture, latency, data flow, and UX. Core loop: record/type → submit → (fake STT) → score (rules) → refactor summary (stub) → return JSON → render category chips and notes → save to store → analytics fired. Scope includes minimal but real auth and entitlements gating after checkout, validated evaluation endpoint and schema with tests, trial UI, content pack loader with dry-run and hot-swap, analytics and error tracking, and basic ops hygiene artifacts.

## User Scenarios & Testing (mandatory)

### User Story 1 - Submit transcript and receive scored results (Priority: P1)

An authenticated user with access to practice routes pastes a transcript (or records, simulated in M0) and submits it. The system runs a simulated STT step, applies rules-based scoring, generates a brief refactor summary (stubbed), returns a validated JSON result, renders category chips and metrics, saves results to a local store, and fires analytics events.

**Why this priority**: Proves the end-to-end core loop that will underpin the product; enables Day-3 demo and architectural validation.

**Independent Test**: Paste a provided sample transcript and verify the results page renders 7 category chips with notes, metrics, summary bullets, practice rule, and that analytics events for start/submit/score are logged.

**Acceptance Scenarios**:

1. **Given** an authenticated user on the practice page, **When** they paste a transcript and click submit, **Then** a validated JSON response is returned and rendered with 7 category chips and required metrics.
2. **Given** an authenticated user, **When** a transcript is empty or exceeds limits, **Then** the system displays a clear validation error and does not attempt scoring.
3. **Given** a successful evaluation, **When** results are returned, **Then** the results are saved to the client store and analytics events are fired.

---

### User Story 2 - Auth and entitlement-gated access post-checkout (Priority: P2)

After a successful test checkout, the payment provider webhook updates the user’s entitlements. Gated routes become available immediately. Webhook processing is idempotent to protect against replays.

**Why this priority**: Ensures only entitled users access practice features and proves gating and idempotency.

**Independent Test**: Simulate a checkout-success webhook for a user; verify that gated practice routes unlock immediately and that replaying the webhook does not duplicate or corrupt entitlements.

**Acceptance Scenarios**:

1. **Given** a user without entitlements, **When** the system receives a valid checkout-success webhook for that user, **Then** practice routes become accessible within moments without a page redeploy.
2. **Given** a previously processed webhook, **When** the same webhook is replayed, **Then** entitlements are unchanged and no duplicate records are created.

---

### User Story 3 - Load and hot-swap content pack (Priority: P3)

An operator loads a content pack file `matchready_content_pack_v1.2.0.json`. The system validates the shape in a dry run, and upon activation, hot-swaps the active pack without redeploy, logging a content-pack-loaded event with version and timestamp.

**Why this priority**: Allows rapid iteration on scoring prompts and guidance without code changes.

**Independent Test**: Provide a valid content pack file, activate it, and verify validation, activation success, and that subsequent evaluations reflect the new pack.

**Acceptance Scenarios**:

1. **Given** a valid v1.2.0 content pack file, **When** the operator activates it, **Then** the system hot-swaps the active pack and emits a content-pack-loaded event with version and timestamp.
2. **Given** an invalid content pack shape, **When** the operator attempts activation, **Then** the system rejects the activation with clear validation errors and does not change the active pack.

### Edge Cases

- Empty transcript submission
- Transcript exceeds maximum length limit
- Categories array not equal to 7 items
- Validation failure for metrics out of range (e.g., negative duration)
- Webhook replay (duplicate delivery) and out-of-order delivery
- Content pack version mismatch (not v1.2.0) or malformed file
- Missing configuration keys at runtime (analytics, error tracking, auth)
- Network latency causing slow evaluation response

## Requirements (mandatory)

### Functional Requirements

- **FR-001**: The system MUST support magic-link email authentication with login, logout, and protected routes.
- **FR-002**: Practice routes MUST be gated by entitlements; unauthorized users see locked states.
- **FR-003**: Upon receiving a successful checkout webhook, the system MUST update entitlements so gated routes unlock immediately.
- **FR-004**: Webhook processing MUST be idempotent; replaying the same event MUST NOT duplicate or alter entitlements.
- **FR-005**: The system MUST expose a POST endpoint to evaluate a transcript and return a validated JSON object conforming to the schema below.
- **FR-006**: The evaluation response schema MUST conform to the EvaluationResult schema defined below.
- **FR-007**: The system MUST validate the evaluation response against the schema and reject invalid responses with descriptive errors.
- **FR-008**: There MUST be at least one unit test demonstrating a valid (happy path) schema instance and one failure case.
- **FR-009**: There MUST be an integration test demonstrating webhook idempotency (store/replay protection).
- **FR-010**: The UI MUST provide a simple page to paste a transcript and submit it; a record button may be present but non-functional in M0.
- **FR-011**: The results view MUST display 7 category chips with pass/warn indicators and note popovers, overall score, duration, words, and WPM.
- **FR-012**: The results view MUST display up to 3 "what changed" bullets and a one-line "rule to practice next".
- **FR-013**: The system MUST save evaluation results to a local store so a refresh preserves the latest result in-session.
- **FR-014**: The system MUST emit analytics events for `drill_started`, `drill_submitted`, `score_returned`, and `content_pack_loaded`, associated with the user and session.
- **FR-015**: The system MUST capture client and API errors in an error tracking service.
- **FR-016**: A content pack loader MUST accept a `matchready_content_pack_v1.2.0.json` file, perform a dry-run schema validation, and on success hot-swap the active pack without redeploy.
- **FR-017**: On successful content pack activation, the system MUST log a `content_pack_loaded` event with version and timestamp.
- **FR-018**: The repository MUST include an example environment file listing required configuration keys for auth, cache, error tracking, analytics, hosting, and payments (test mode).
- **FR-019**: The repository MUST include a one-page Owner Runbook covering key rotation/clearing caches, reprocessing failed jobs, changing content pack version and re-loading, and verifying webhooks.
- **FR-020**: The repository MUST include a README with setup steps and instructions to demo Day-3 features.

### Key Entities (include if feature involves data)

- **User**: Authenticated person; has zero or more entitlements.
- **Entitlement**: Grants access tier; cached with time-to-live for fast gating.
- **EvaluationRequest**: Input text (and metadata) submitted for evaluation.
- **EvaluationResult**: Output JSON with metrics, categories, summary bullets, practice rule, and overall score.
- **CategoryEvaluation**: One of seven category results; includes name, pass/flag, note.
- **ContentPack**: Versioned prompts/rules; imported via file and can be hot-swapped.
- **WebhookEvent**: Checkout-success notification processed idempotently.
- **AnalyticsEvent**: Instrumentation emitted at key points, linked to user/session.

### EvaluationResult Schema

The evaluation response MUST conform to this schema:

```typescript
interface EvaluationResult {
  duration_s: number; // ≥ 0
  words: number; // ≥ 0
  wpm: number; // ≥ 0
  categories: CategoryEvaluation[]; // exactly 7 items
  what_changed: string[]; // ≤ 3 strings
  practice_rule: string; // single sentence
  overall_score: number; // integer 0–100
}

interface CategoryEvaluation {
  name: string;
  passFlag: "PASS" | "FLAG";
  note: string;
}
```

## Success Criteria (mandatory)

### Measurable Outcomes

- **SC-001**: 95% of transcript evaluations render results within 2 seconds from submit (with simulated STT).
- **SC-002**: 100% of evaluation responses conform to the specified schema (unit tests passing: happy and failure cases).
- **SC-003**: Webhook idempotency integration test passes: replaying the same event does not change entitlements.
- **SC-004**: Users can complete the paste-and-submit evaluation flow and view results in under 60 seconds end-to-end during the demo.
- **SC-005**: Content pack hot-swap completes without redeploy and affects subsequent evaluations within 5 seconds; activation is logged with version and timestamp.
- **SC-006**: Required analytics events are captured for 100% of successful evaluation flows and 100% of content pack activations.
- **SC-007**: Critical client and API errors surfaced during the demo are captured by error tracking with user/session context.

## Assumptions & Dependencies

- Simulated STT is acceptable for M0; real-time recording may be present but non-functional.
- Content pack v1.2.0 JSON shape is known and stable for M0; future versions may expand.
- Webhook delivery is near-real-time; user refresh not required to see entitlement changes.
- Analytics and error tracking identifiers are available in environment configuration.
- Environment variables for auth, cache, analytics, error tracking, hosting, and payments (test mode) are provided via a shared secret store.
