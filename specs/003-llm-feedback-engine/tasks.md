---
description: "Task list for LLM Feedback Engine implementation"
---

# Tasks: LLM Feedback Engine

**Input**: Design documents from `/specs/003-llm-feedback-engine/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths follow Onion Architecture structure from plan.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project structure per implementation plan in src/lib/llm/
- [x] T002 Initialize TypeScript project with OpenAI SDK dependencies
- [x] T003 [P] Configure Biome for linting and formatting in biome.json
- [x] T004 [P] Setup lefthook for git hooks in .lefthook.yml
- [x] T005 [P] Configure TypeScript strict mode in tsconfig.json
- [x] T006 [P] Setup pnpm as package manager in package.json
- [x] T007 [P] Configure Vitest for testing framework in vitest.config.ts
- [x] T008 [P] Setup devcontainer with Node.js LTS, Biome, lefthook in .devcontainer/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 Setup environment configuration management in .env.example
- [x] T010 [P] Implement error handling infrastructure in src/lib/llm/domain/errors/
- [x] T011 [P] Setup PostHog for product analytics in src/lib/llm/infrastructure/analytics/
- [x] T012 [P] Configure Sentry for error tracking in src/lib/llm/infrastructure/monitoring/
- [x] T013 Create base domain entities in src/lib/llm/domain/entities/
- [x] T014 Setup retry and fallback infrastructure in src/lib/llm/infrastructure/retry/
- [x] T015 [P] Configure OpenAI API client in src/lib/llm/infrastructure/openai/
- [x] T016 [P] Setup Zod validation schemas in src/lib/llm/types/

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - AI-Powered Interview Feedback (Priority: P1) 🎯 MVP

**Goal**: As a user, I want the app to analyze my submission using AI and return clear, structured feedback to improve my interview answers.

**Independent Test**: Submit text content via POST /evaluate and receive structured feedback with score, strengths, and improvements.

### Implementation for User Story 1

- [x] T017 [P] [US1] Create Submission entity in src/lib/llm/domain/entities/Submission.ts
- [x] T018 [P] [US1] Create Feedback entity in src/lib/llm/domain/entities/Feedback.ts
- [x] T019 [P] [US1] Create EvaluationRequest entity in src/lib/llm/domain/entities/EvaluationRequest.ts
- [x] T020 [P] [US1] Create domain interfaces in src/lib/llm/domain/interfaces/
- [x] T021 [US1] Implement FeedbackService in src/lib/llm/domain/services/FeedbackService.ts
- [x] T022 [US1] Implement OpenAITextAdapter in src/lib/llm/infrastructure/openai/OpenAITextAdapter.ts
- [x] T023 [US1] Implement EvaluateSubmissionUseCase in src/lib/llm/application/use-cases/EvaluateSubmissionUseCase.ts
- [x] T024 [US1] Implement LLMFeedbackService in src/lib/llm/application/services/LLMFeedbackService.ts
- [x] T025 [US1] Create /evaluate API endpoint in src/app/api/evaluate/route.ts
- [x] T026 [US1] Add validation and error handling for evaluation requests
- [x] T027 [US1] Add PostHog tracking for score_returned event
- [x] T028 [US1] Add Sentry error tracking for LLM service errors

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Speech-to-Text Integration (Priority: P2)

**Goal**: Support audio submissions using OpenAI Whisper for speech-to-text processing before evaluation.

**Independent Test**: Submit audio URL via POST /evaluate and receive feedback based on transcribed content.

### Implementation for User Story 2

- [x] T029 [P] [US2] Implement OpenAISpeechAdapter in src/lib/llm/infrastructure/openai/OpenAISpeechAdapter.ts
- [x] T030 [US2] Extend EvaluateSubmissionUseCase to handle audio processing
- [x] T031 [US2] Update LLMFeedbackService to support audio submissions
- [x] T032 [US2] Add audio validation in evaluation request schema
- [x] T033 [US2] Implement audio file processing pipeline
- [x] T034 [US2] Add PostHog tracking for audio processing events
- [x] T035 [US2] Add Sentry error tracking for Whisper API failures

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Evaluation Status Tracking (Priority: P3)

**Goal**: Provide real-time status tracking for long-running evaluations with progress indicators.

**Independent Test**: Submit evaluation request and check status via GET /evaluate/{submissionId}/status.

### Implementation for User Story 3

- [x] T036 [P] [US3] Create EvaluationStatus entity in src/lib/llm/domain/entities/EvaluationStatus.ts
- [x] T037 [US3] Implement status tracking service in src/lib/llm/domain/services/StatusTrackingService.ts
- [x] T038 [US3] Create /evaluate/{submissionId}/status API endpoint in src/app/api/evaluate/[submissionId]/status/route.ts
- [x] T039 [US3] Implement progress tracking in EvaluateSubmissionUseCase
- [x] T040 [US3] Add status persistence for evaluation requests
- [x] T041 [US3] Implement timeout handling for long-running evaluations
- [x] T042 [US3] Add PostHog tracking for status check events

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T043 [P] Documentation updates in docs/llm-feedback-engine/
- [x] T044 Code cleanup and refactoring across all LLM service components
- [x] T045 Performance optimization for LLM API calls and retry logic
- [x] T046 [P] Additional unit tests in tests/unit/llm/
- [x] T047 Security hardening for API endpoints and OpenAI key management
- [x] T048 Run quickstart.md validation scenarios
- [x] T049 [P] Integration tests in tests/integration/llm/
- [x] T050 Circuit breaker implementation for OpenAI API failures

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 functionality
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent status tracking

### Within Each User Story

- Domain entities before services
- Services before use cases
- Use cases before API endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Domain entities within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all domain entities for User Story 1 together:
Task: "Create Submission entity in src/lib/llm/domain/entities/Submission.ts"
Task: "Create Feedback entity in src/lib/llm/domain/entities/Feedback.ts"
Task: "Create EvaluationRequest entity in src/lib/llm/domain/entities/EvaluationRequest.ts"
Task: "Create domain interfaces in src/lib/llm/domain/interfaces/"

# Launch infrastructure components in parallel:
Task: "Implement OpenAITextAdapter in src/lib/llm/infrastructure/openai/OpenAITextAdapter.ts"
Task: "Add PostHog tracking for score_returned event"
Task: "Add Sentry error tracking for LLM service errors"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Core feedback)
   - Developer B: User Story 2 (Audio processing)
   - Developer C: User Story 3 (Status tracking)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (if tests are included)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Follow Onion Architecture principles from plan.md
- Use TypeScript strict mode and Zod validation throughout
- Implement comprehensive error handling and monitoring
