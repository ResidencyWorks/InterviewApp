# Tasks: M4 P0 Launch Readiness - PHI Compliance, Documentation & Operational Readiness

**Input**: Design documents from `/specs/001-m4-p0-launch-readiness/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are included per project constitution (TDD mandatory). Write tests FIRST, ensure they FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., [US1], [US2], [US3])
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project structure verification (project already exists, minimal setup needed)

- [X] T001 Verify project structure matches plan.md in `/workspaces/InterviewApp/specs/001-m4-p0-launch-readiness/plan.md`
- [X] T002 [P] Verify TypeScript strict mode enabled in `tsconfig.json`
- [X] T003 [P] Verify Biome configured in `biome.json`
- [X] T004 [P] Verify lefthook hooks configured in `lefthook.yml`
- [X] T005 [P] Verify pnpm package manager configured in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core security utilities that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational (Write FIRST, ensure FAIL)

- [X] T006 [P] Unit test for PhiScrubber.scrubUserInput() in `tests/unit/shared/security/phi-scrubber.test.ts`
- [X] T007 [P] Unit test for DataScrubber.scrubObject() in `tests/unit/shared/security/data-scrubber.test.ts`
- [X] T008 [P] Unit test for AnalyticsValidator.validateEvent() in `tests/unit/shared/security/analytics-validator.test.ts`

### Implementation for Foundational

- [X] T009 [P] Create PhiScrubber class in `src/shared/security/phi-scrubber.ts` with scrubUserInput() and isPhiPresent() methods
- [X] T010 [P] Create DataScrubber class in `src/shared/security/data-scrubber.ts` with scrubObject() method for recursive scrubbing
- [X] T011 [P] Create AnalyticsValidator class in `src/shared/security/analytics-validator.ts` with validateEvent() method

**Checkpoint**: Foundation ready - security utilities created and tested. User story implementation can now begin.

---

## Phase 3: User Story 1 - Protected Health Information Compliance (Priority: P1) 🎯 MVP

**Goal**: Users' personally identifiable information (PHI) is automatically sanitized before being stored or transmitted, ensuring compliance with healthcare privacy regulations.

**Independent Test**: Submit user input containing email addresses and phone numbers, then verify that stored data and analytics events contain only anonymized identifiers.

### Tests for User Story 1 (Write FIRST, ensure FAIL)

- [X] T012 [P] [US1] Integration test: Submit evaluation with email in textContent, verify scrubbed in database in `tests/integration/api/evaluations-phi-scrub.test.ts`
- [X] T013 [P] [US1] Integration test: Submit text with phone number, verify scrubbed in database in `tests/integration/api/submit-text-phi-scrub.test.ts`
- [X] T014 [P] [US1] Integration test: Analytics event with PII, verify scrubbed in PostHog in `tests/integration/analytics/phi-scrub.test.ts`
- [X] T015 [P] [US1] Integration test: Error log with PII context, verify scrubbed in Sentry in `tests/integration/logging/phi-scrub.test.ts`

### Implementation for User Story 1

- [X] T016 [US1] Integrate PhiScrubber into POST /api/evaluations route: Scrub response_text before database insert in `src/app/api/evaluations/route.ts`
- [X] T017 [US1] Integrate PhiScrubber into POST /api/submit-text route: Scrub textContent before database insert in `src/app/api/submit-text/route.ts`
- [X] T018 [US1] Integrate PhiScrubber into POST /api/text-submit route: Scrub text field before processing in `src/app/api/text-submit/route.ts`
- [X] T019 [US1] Integrate DataScrubber into Sentry beforeSend hook: Scrub event.user, event.contexts, event.extra in `instrumentation-client.ts`
- [X] T020 [US1] Integrate DataScrubber into Logger: Scrub context metadata before Sentry capture in `src/infrastructure/logging/logger.ts`
- [X] T021 [US1] Integrate DataScrubber into ErrorMonitoringService: Scrub context metadata before capture in `src/features/scheduling/infrastructure/monitoring/error-monitoring.ts`
- [X] T022 [US1] Integrate DataScrubber into SentryMonitoring: Scrub submission and user context in `src/features/scheduling/llm/infrastructure/monitoring/SentryMonitoring.ts`
- [X] T023 [US1] Integrate DataScrubber and AnalyticsValidator into PostHogAnalyticsService: Scrub properties and validate before capture in `src/features/notifications/infrastructure/posthog/AnalyticsService.ts`
- [X] T024 [US1] Integrate DataScrubber into transcript-analytics: Scrub event payload before PostHog transmission in `src/features/notifications/application/analytics/transcript-analytics.ts`
- [X] T025 [US1] Integrate DataScrubber into PostHog client: Scrub properties in trackEvent method in `src/infrastructure/posthog/client.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional. All user input is scrubbed before storage, and all analytics/error logs are scrubbed before transmission.

---

## Phase 4: User Story 2 - Operational Recovery Documentation (Priority: P1)

**Goal**: Operations team can quickly recover from common production incidents using documented procedures, minimizing downtime and service disruption.

**Independent Test**: Simulate production incidents (stuck queue, Redis outage, failed deployment) and follow documented recovery procedures to verify they work.

### Tests for User Story 2 (Write FIRST, ensure FAIL)

- [X] T026 [P] [US2] Manual test: Follow runbook for stuck BullMQ queue recovery, verify procedures work in `docs/operations/failover-rollback-runbook.md`
- [X] T027 [P] [US2] Manual test: Follow runbook for Redis outage recovery, verify procedures work in `docs/operations/failover-rollback-runbook.md`
- [X] T028 [P] [US2] Manual test: Follow runbook for deployment rollback, verify procedures work in `docs/operations/failover-rollback-runbook.md`

### Implementation for User Story 2

- [X] T029 [US2] Create failover-rollback-runbook.md with stuck BullMQ queue recovery section including CLI commands in `docs/operations/failover-rollback-runbook.md`
- [X] T030 [US2] Add Redis outage recovery section with diagnosis and recovery steps to `docs/operations/failover-rollback-runbook.md`
- [X] T031 [US2] Add deployment rollback section with Vercel and git-based rollback procedures to `docs/operations/failover-rollback-runbook.md`

**Checkpoint**: At this point, User Story 2 should be complete. Operations team has documented recovery procedures for all three scenarios.

---

## Phase 5: User Story 3 - Performance and Cost Transparency (Priority: P2)

**Goal**: Stakeholders understand system performance targets and cost-control mechanisms, enabling informed decision-making and budget planning.

**Independent Test**: Review documentation to verify performance targets and cost-control mechanisms are clearly explained.

### Tests for User Story 3 (Write FIRST, ensure FAIL)

- [X] T032 [P] [US3] Documentation review: Verify latency budget document explains p95 < 10s target and component breakdowns in `docs/performance/latency-budget.md`
- [X] T033 [P] [US3] Documentation review: Verify cost-control document explains all mechanisms in ≤150 words in `docs/operations/cost-control.md`

### Implementation for User Story 3

- [X] T034 [US3] Create latency-budget.md documenting p95 < 10s target, component breakdowns, and monitoring in `docs/performance/latency-budget.md`
- [X] T035 [US3] Create cost-control.md documenting model selection, batching, Redis TTL, idempotency, rate limiting, and caching in ≤150 words in `docs/operations/cost-control.md`

**Checkpoint**: At this point, User Story 3 should be complete. Stakeholders have clear documentation on performance and cost targets.

---

## Phase 6: User Story 4 - Content Pack Status Visibility (Priority: P2)

**Goal**: Users and administrators are notified when the primary content pack is unavailable, ensuring transparency about system state and fallback behavior.

**Independent Test**: Disable the content pack and verify that a warning banner appears with appropriate messaging.

### Tests for User Story 4 (Write FIRST, ensure FAIL)

- [X] T036 [P] [US4] Unit test: ContentPackMissingBanner displays when contentPack.isActive is false in `tests/unit/components/content/ContentPackMissingBanner.test.tsx`
- [X] T037 [P] [US4] Unit test: ContentPackMissingBanner tracks content_pack_missing event on mount in `tests/unit/components/content/ContentPackMissingBanner.test.tsx`
- [X] T038 [P] [US4] Unit test: ContentPackMissingBanner dismiss button hides banner in `tests/unit/components/content/ContentPackMissingBanner.test.tsx`
- [X] T039 [P] [US4] E2E test: Banner appears when content pack missing, can be dismissed in `tests/e2e/content-pack-banner.spec.ts`

### Implementation for User Story 4

- [X] T040 [US4] Create ContentPackMissingBanner component with status check, dismiss functionality, and analytics tracking in `src/components/content/ContentPackMissingBanner.tsx`
- [X] T041 [US4] Integrate ContentPackMissingBanner into dashboard layout in `src/app/(dashboard)/layout.tsx`
- [X] T042 [US4] Verify /api/system/status returns accurate contentPack.isActive field in `src/app/api/system/status/route.ts`
- [X] T043 [US4] Ensure analytics.track() supports content_pack_missing event in `src/features/notifications/application/analytics.ts`

**Checkpoint**: At this point, User Story 4 should be complete. Users see a warning banner when content pack is unavailable.

---

## Phase 7: User Story 5 - Support Service Level Agreement (Priority: P2)

**Goal**: Users and stakeholders have clear expectations about critical bug response times during the initial launch period, ensuring accountability and trust.

**Independent Test**: Review README documentation to verify SLA terms are clearly stated.

### Tests for User Story 5 (Write FIRST, ensure FAIL)

- [X] T044 [P] [US5] Documentation review: Verify README contains SLA section with 72-hour response time and 30-day window in `README.md`

### Implementation for User Story 5

- [X] T045 [US5] Add Support & SLA section to README with critical bug definition, reporting process, and response timeline in `README.md`

**Checkpoint**: At this point, User Story 5 should be complete. SLA documentation is clearly stated in README.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final documentation, QA checklist, and proof attachments

- [X] T046 [P] Create p0-ux-checklist.md with dual-mode UX, PHI scrub, chips, practice rule, reminders, analytics checklists in `docs/qa/p0-ux-checklist.md`
- [X] T047 [P] Create m4-p0-proof-attachments.md with links to all documentation and screenshot instructions in `docs/m4-p0-proof-attachments.md`
- [X] T048 [P] Run performance test: Verify PHI scrubbing adds <100ms latency per SC-010
- [X] T049 [P] Run integration test: Verify 100% of user-submitted text contains no PHI per SC-001
- [X] T050 [P] Run integration test: Verify 100% of analytics events contain only anonymized IDs per SC-002
- [X] T051 [P] Run integration test: Verify 100% of error logs contain no PII per SC-003
- [X] T052 Code review: Verify all JSDoc comments added per constitution
- [X] T053 Code review: Verify Biome formatting and linting passes
- [X] T054 Documentation review: Verify all documentation files created and accessible

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Independent, no dependencies
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Independent, documentation only
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Independent, requires /api/system/status endpoint (already exists)
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - Independent, documentation only

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Foundational utilities before integration tasks
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational test tasks marked [P] can run in parallel
- All Foundational implementation tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, User Stories 1-5 can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- All Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task T012: "Integration test: Submit evaluation with email in textContent, verify scrubbed in database"
Task T013: "Integration test: Submit text with phone number, verify scrubbed in database"
Task T014: "Integration test: Analytics event with PII, verify scrubbed in PostHog"
Task T015: "Integration test: Error log with PII context, verify scrubbed in Sentry"

# Launch API route integrations in parallel (different files):
Task T016: "Integrate PhiScrubber into POST /api/evaluations route"
Task T017: "Integrate PhiScrubber into POST /api/submit-text route"
Task T018: "Integrate PhiScrubber into POST /api/text-submit route"

# Launch service integrations in parallel (different files):
Task T019: "Integrate DataScrubber into Sentry beforeSend hook"
Task T020: "Integrate DataScrubber into Logger"
Task T021: "Integrate DataScrubber into ErrorMonitoringService"
Task T022: "Integrate DataScrubber into SentryMonitoring"
Task T023: "Integrate DataScrubber and AnalyticsValidator into PostHogAnalyticsService"
Task T024: "Integrate DataScrubber into transcript-analytics"
Task T025: "Integrate DataScrubber into PostHog client"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only - Both P1)

1. Complete Phase 1: Setup (verification only)
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (PHI Compliance)
4. Complete Phase 4: User Story 2 (Operational Runbooks)
5. **STOP and VALIDATE**: Test both stories independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (PHI Compliance MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Operational Readiness!)
4. Add User Story 3 → Test independently → Deploy/Demo (Transparency)
5. Add User Story 4 → Test independently → Deploy/Demo (User Visibility)
6. Add User Story 5 → Test independently → Deploy/Demo (SLA Documentation)
7. Complete Polish phase → Final validation → Launch ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (PHI scrubbing integration)
   - Developer B: User Story 2 (Runbooks documentation)
   - Developer C: User Story 3 (Performance/cost docs)
   - Developer D: User Story 4 (Banner component)
   - Developer E: User Story 5 (SLA documentation)
3. Stories complete and integrate independently
4. Polish phase can proceed in parallel once stories are complete

---

## Notes

- [P] tasks = different files, no dependencies
- [US1], [US2], etc. labels map task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Performance target: PHI scrubbing must add <100ms latency (SC-010)
- All documentation must be ≤150 words per section where specified
