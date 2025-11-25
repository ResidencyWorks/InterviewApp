---
description: "Task list for Monitoring & Analytics feature implementation"
---

# Tasks: Monitoring & Analytics

**Input**: Design documents from `/specs/005-monitoring-analytics/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/openapi.yaml

**Tests**: Tests are REQUIRED for this feature - comprehensive testing of monitoring and analytics to ensure proper error capture and event tracking.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths follow Onion Architecture structure from plan.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Fix existing test failures and prepare monitoring infrastructure

**Note**: PostHog and Sentry are already installed. Focus on fixing failing tests and preparing integration infrastructure.

- [x] T001 Fix missing FeedbackService module error in src/lib/llm/domain/services/FeedbackService.ts
- [x] T002 Fix UUID validation errors in FeedbackService tests by using valid UUID format
- [x] T003 Fix OpenAITextAdapter timeout configuration test expectations
- [x] T004 Fix OpenAITextAdapter isAvailable test by mocking API health check
- [x] T005 Fix RetryService max attempts test by ensuring proper retry execution
- [x] T006 Fix API integration test error response format to include error code
- [ ] T007 Fix API integration test authentication error handling (401 responses)
- [ ] T008 Fix API integration test rate limiting behavior
- [x] T009 Fix EvaluationService caching key generation for Redis lookups
- [x] T010 Fix EvaluationService database pagination for listResults method

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core monitoring infrastructure that MUST be complete before user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T011 [P] Create monitoring configuration schema in src/lib/monitoring/config/schema.ts using Zod
- [ ] T012 [P] Create environment validation service in src/lib/monitoring/validation/env-validator.ts
- [ ] T013 [P] Create analytics domain entities in src/lib/analytics/domain/entities/ (AnalyticsEvent, ErrorEvent, EventContext)
- [ ] T014 [P] Create monitoring interfaces in src/lib/analytics/domain/interfaces/ (IAnalyticsService, IErrorService)
- [ ] T015 Create base monitoring configuration in src/lib/monitoring/config/index.ts
- [ ] T016 [P] Create event validation schemas in src/lib/analytics/infrastructure/validation/event-schemas.ts
- [ ] T017 [P] Create error classification utilities in src/lib/monitoring/utils/error-classifier.ts
- [ ] T018 Create circuit breaker implementation in src/lib/monitoring/utils/circuit-breaker.ts
- [ ] T019 [P] Create event buffer service in src/lib/analytics/infrastructure/buffer/event-buffer.ts
- [ ] T020 [P] Create retry logic for event transmission in src/lib/analytics/infrastructure/retry/event-retry.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Error Tracking and Monitoring (Priority: P1) 🎯 MVP

**Goal**: Automatically capture and log all application errors to Sentry with full context for quick diagnosis and resolution.

**Independent Test**: Trigger various error conditions (client-side, API, network) and verify they are captured in Sentry with proper context.

### Implementation for User Story 1

- [ ] T021 [P] [US1] Create ErrorEvent entity in src/lib/analytics/domain/entities/ErrorEvent.ts
- [ ] T022 [P] [US1] Create ErrorContext entity in src/lib/analytics/domain/entities/ErrorContext.ts
- [ ] T023 [P] [US1] Create IErrorService interface in src/lib/analytics/domain/interfaces/IErrorService.ts
- [ ] T024 [US1] Implement ErrorService in src/lib/analytics/domain/services/ErrorService.ts
- [ ] T025 [US1] Implement SentryErrorAdapter in src/lib/analytics/infrastructure/sentry/SentryErrorAdapter.ts
- [ ] T026 [US1] Create CaptureError use case in src/lib/analytics/application/use-cases/CaptureError.ts
- [ ] T027 [US1] Create error boundary component in src/components/analytics/ErrorBoundary.tsx
- [ ] T028 [US1] Add Sentry proxy for API routes in src/app/api/proxy/sentry.ts
- [ ] T029 [US1] Implement error severity classification in ErrorService
- [ ] T030 [US1] Add error filtering for sensitive data in src/lib/analytics/infrastructure/sentry/data-scrubber.ts
- [ ] T031 [US1] Create error context gathering utilities in src/lib/monitoring/utils/context-gatherer.ts
- [ ] T032 [US1] Implement graceful degradation when Sentry unavailable
- [ ] T033 [US1] Add performance monitoring for error capture (≤5s target)
- [ ] T034 [US1] Create error tracking tests in tests/unit/analytics/error-service.test.ts
- [ ] T035 [US1] Create Sentry integration tests in tests/integration/monitoring/sentry.test.ts
- [ ] T036 [US1] Create error boundary E2E tests in tests/e2e/monitoring/error-tracking.test.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - all errors captured and logged to Sentry

---

## Phase 4: User Story 2 - User Behavior Analytics (Priority: P1) 🎯 MVP

**Goal**: Track key user actions and behaviors in PostHog to understand application usage and identify improvement areas.

**Independent Test**: Perform key actions (start drill, submit response, receive score, load content pack) and verify analytics events are fired with correct metadata.

### Implementation for User Story 2

- [ ] T037 [P] [US2] Create AnalyticsEvent entity in src/lib/analytics/domain/entities/AnalyticsEvent.ts
- [ ] T038 [P] [US2] Create EventContext entity in src/lib/analytics/domain/entities/EventContext.ts
- [ ] T039 [P] [US2] Create EventMetadata entity in src/lib/analytics/domain/entities/EventMetadata.ts
- [ ] T040 [P] [US2] Create IAnalyticsService interface in src/lib/analytics/domain/interfaces/IAnalyticsService.ts
- [ ] T041 [US2] Implement AnalyticsService in src/lib/analytics/domain/services/AnalyticsService.ts
- [ ] T042 [US2] Implement PostHogAnalyticsAdapter in src/lib/analytics/infrastructure/posthog/PostHogAnalyticsAdapter.ts
- [ ] T043 [US2] Create TrackEvent use case in src/lib/analytics/application/use-cases/TrackEvent.ts
- [ ] T044 [US2] Create useAnalytics React hook in src/hooks/useAnalytics.ts
- [ ] T045 [US2] Implement session ID generation in src/lib/analytics/infrastructure/session/session-manager.ts
- [ ] T046 [US2] Add drill_started event tracking to drill interface
- [ ] T047 [US2] Add drill_submitted event tracking to response submission
- [ ] T048 [US2] Add score_returned event tracking to evaluation results
- [ ] T049 [US2] Add content_pack_loaded event tracking to content pack loader
- [ ] T050 [US2] Implement user identification in AnalyticsService
- [ ] T051 [US2] Add event batching for performance optimization
- [ ] T052 [US2] Implement graceful degradation when PostHog unavailable
- [ ] T053 [US2] Add performance monitoring for analytics (≤10ms page load overhead)
- [ ] T054 [US2] Create AnalyticsProvider component in src/components/analytics/AnalyticsProvider.tsx
- [ ] T055 [US2] Create analytics service tests in tests/unit/analytics/analytics-service.test.ts
- [ ] T056 [US2] Create PostHog integration tests in tests/integration/monitoring/posthog.test.ts
- [ ] T057 [US2] Create analytics event E2E tests in tests/e2e/monitoring/analytics-tracking.test.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - errors captured, events tracked

---

## Phase 5: User Story 3 - Secure Configuration Management (Priority: P2)

**Goal**: Securely manage monitoring configuration through environment variables with validation and protection against sensitive data exposure.

**Independent Test**: Verify environment variables are properly loaded, validated, and used without exposing sensitive data in logs or client-side code.

### Implementation for User Story 3

- [ ] T058 [P] [US3] Create MonitoringConfig entity in src/lib/monitoring/config/MonitoringConfig.ts
- [ ] T059 [P] [US3] Create PostHogConfig entity in src/lib/monitoring/config/PostHogConfig.ts
- [ ] T060 [P] [US3] Create SentryConfig entity in src/lib/monitoring/config/SentryConfig.ts
- [ ] T061 [P] [US3] Create RetentionConfig entity in src/lib/monitoring/config/RetentionConfig.ts
- [ ] T062 [P] [US3] Create PerformanceConfig entity in src/lib/monitoring/config/PerformanceConfig.ts
- [ ] T063 [US3] Implement ConfigService in src/lib/monitoring/config/ConfigService.ts
- [ ] T064 [US3] Create environment validation utility in src/lib/monitoring/validation/validate-env.ts
- [ ] T065 [US3] Update .env.example with all monitoring environment variables
- [ ] T066 [US3] Create environment variable documentation in docs/monitoring/environment-variables.md
- [ ] T067 [US3] Implement PII detection in src/lib/monitoring/utils/pii-detector.ts
- [ ] T068 [US3] Implement data scrubbing for logs in src/lib/monitoring/utils/data-scrubber.ts
- [ ] T069 [US3] Add startup validation for required environment variables
- [ ] T070 [US3] Create configuration validation tests in tests/unit/monitoring/config-service.test.ts
- [ ] T071 [US3] Create environment validation tests in tests/unit/monitoring/env-validator.test.ts
- [ ] T072 [US3] Create security tests for sensitive data handling in tests/integration/monitoring/security.test.ts

**Checkpoint**: All user stories should now be independently functional - errors tracked, events logged, configuration secure

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and overall system quality

- [ ] T073 [P] Create comprehensive monitoring documentation in docs/monitoring/overview.md
- [ ] T074 [P] Create troubleshooting guide in docs/monitoring/troubleshooting.md
- [ ] T075 [P] Create performance monitoring dashboard component in src/components/analytics/PerformanceMonitor.tsx
- [ ] T076 [P] Implement lazy loading for monitoring services
- [ ] T077 [P] Add debug mode with local event logging
- [ ] T078 [P] Create monitoring health check endpoint in src/app/api/monitoring/health/route.ts
- [ ] T079 [P] Add monitoring metrics endpoint in src/app/api/monitoring/metrics/route.ts
- [ ] T080 [P] Implement data retention policies per configuration
- [ ] T081 [P] Add user data anonymization after 30 days
- [ ] T082 [P] Create monitoring integration tests in tests/integration/monitoring/integration.test.ts
- [ ] T083 [P] Add performance benchmark tests for monitoring overhead
- [ ] T084 [P] Create quickstart validation scenarios in tests/validation/monitoring-quickstart.test.ts
- [ ] T085 Code cleanup and refactoring across all monitoring components
- [ ] T086 Security audit for sensitive data handling
- [ ] T087 Performance optimization to meet <50ms API and <10ms page load targets

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately (fix failing tests)
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P1 → P2)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories

### Within Each User Story

- Domain entities before services
- Services before use cases
- Use cases before UI components/API endpoints
- Core implementation before integration
- Implementation before testing
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (fix different test files)
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Domain entities within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members
- Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all domain entities for User Story 1 together:
Task: "Create ErrorEvent entity in src/lib/analytics/domain/entities/ErrorEvent.ts"
Task: "Create ErrorContext entity in src/lib/analytics/domain/entities/ErrorContext.ts"
Task: "Create IErrorService interface in src/lib/analytics/domain/interfaces/IErrorService.ts"

# Launch infrastructure components in parallel:
Task: "Implement SentryErrorAdapter in src/lib/analytics/infrastructure/sentry/SentryErrorAdapter.ts"
Task: "Add error filtering for sensitive data in src/lib/analytics/infrastructure/sentry/data-scrubber.ts"
Task: "Create error context gathering utilities in src/lib/monitoring/utils/context-gatherer.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2)

1. Complete Phase 1: Setup (fix failing tests)
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Error Tracking)
4. Complete Phase 4: User Story 2 (Analytics)
5. **STOP and VALIDATE**: Test both stories independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (Error Tracking MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Analytics MVP!)
4. Add User Story 3 → Test independently → Deploy/Demo (Security MVP!)
5. Add Polish phase → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Error Tracking)
   - Developer B: User Story 2 (Analytics)
   - Developer C: User Story 3 (Configuration)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify each story works independently before considering complete
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Follow Onion Architecture principles from plan.md
- Use TypeScript strict mode and Zod validation throughout
- Implement comprehensive error handling and monitoring
- Maintain performance targets: <50ms API overhead, <10ms page load overhead

## Performance Targets

- **Error Capture**: 99% of errors captured within 5 seconds
- **Event Transmission**: 95% success rate for analytics events
- **API Overhead**: <50ms additional latency for monitoring operations
- **Page Load Overhead**: <10ms additional time for monitoring initialization
- **Service Recovery**: <30 seconds to recover from monitoring service outages

## Security Considerations

- All sensitive data must be filtered from logs and analytics
- PII detection and anonymization implemented
- Secure transmission using HTTPS for all monitoring data
- Data retention policies enforced (90 days errors, 1 year analytics)
- Environment variable validation on startup
- No sensitive data exposed in client-side code or console logs
