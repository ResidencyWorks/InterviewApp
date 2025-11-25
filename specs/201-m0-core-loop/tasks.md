---
description: "Task list for M0 Core Loop – Interview Drills feature implementation"
---

# Tasks: M0 Core Loop – Interview Drills

**Input**: Design documents from `/specs/001-m0-core-loop/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Tests are REQUIRED for this feature - focusing on core functionality testing with 80% coverage target.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Configuration files**: `.devcontainer/`, `.vscode/`, root level config files
- **Scripts**: `scripts/` directory for development and CI scripts

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic development environment structure

- [x] T001 Create Next.js 14 project structure with App Router
- [x] T002 [P] Install and configure Supabase client library
- [x] T003 [P] Install and configure OpenAI API client
- [x] T004 [P] Install and configure Redis client (Upstash)
- [x] T005 [P] Install and configure PostHog analytics
- [x] T006 [P] Install and configure Sentry monitoring
- [x] T007 [P] Install and configure shadcn/ui components
- [x] T008 [P] Install and configure Tailwind CSS
- [x] T009 [P] Create environment variable configuration files
- [x] T010 [P] Setup TypeScript configuration for Next.js
- [x] T011 [P] Configure Next.js with required proxy and API routes
- [x] T012 [P] Setup database schema and migrations for Supabase
- [x] T013 [P] Create shared type definitions in src/types/
- [x] T014 [P] Setup Zod validation schemas in src/lib/validations/
- [x] T015 [P] Configure Redis connection and caching utilities
- [x] T016 [P] Setup OpenAI API configuration and utilities
- [x] T017 [P] Configure PostHog analytics tracking
- [x] T018 [P] Configure Sentry error monitoring
- [x] T019 [P] Create shared UI components in src/components/ui/
- [x] T020 [P] Setup custom React hooks in src/hooks/
- [x] T020a [P] Add JSDoc comments to all exported functions in src/lib/
- [x] T020b [P] Add JSDoc comments to all API endpoints in src/app/api/
- [x] T020c [P] Add JSDoc comments to all service classes and methods

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T021 [P] Implement Supabase authentication utilities in src/lib/auth/
- [x] T022 [P] Implement database utilities in src/lib/db/
- [x] T023 [P] Implement Redis utilities in src/lib/redis/
- [x] T024 [P] Implement OpenAI integration in src/lib/openai/
- [x] T025 [P] Implement analytics utilities in src/lib/analytics/
- [x] T026 [P] Implement monitoring utilities in src/lib/monitoring/
- [x] T027 [P] Create core domain models and interfaces
- [x] T028 [P] Setup API route structure and proxy
- [x] T029 [P] Configure authentication proxy for protected routes
- [x] T030 [P] Setup error handling and logging infrastructure
- [x] T031 [P] Configure content pack validation and loading system
- [x] T032 [P] Setup evaluation API infrastructure
- [x] T033 [P] Configure webhook handling for Stripe integration
- [x] T033a [P] Implement performance monitoring for /api/evaluate endpoint
- [x] T033b [P] Implement Redis lookup performance validation
- [x] T033c [P] Implement content pack validation performance monitoring
- [x] T033d [P] Create performance benchmark tests for success criteria validation

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Login and Access Gated Routes (Priority: P1) 🎯 MVP

**Goal**: Users can log in via email magic link and access protected drill pages after checkout.

**Independent Test**: Can be fully tested by verifying magic link authentication flow and route protection without requiring any other features to be implemented.

### Implementation for User Story 1

- [x] T034 [US1] Create magic link login page in src/app/(auth)/login/page.tsx
- [x] T035 [US1] Create auth callback handler in src/app/(auth)/callback/route.ts
- [x] T036 [US1] Implement authentication components in src/components/auth/
- [x] T037 [US1] Create protected route wrapper component
- [x] T038 [US1] Implement route protection proxy
- [x] T039 [US1] Create Stripe webhook handler in src/app/api/webhooks/stripe/route.ts
- [x] T040 [US1] Implement entitlement caching in Redis
- [x] T041 [US1] Create user authentication service
- [x] T042 [US1] Implement session management
- [x] T043 [US1] Create authentication API endpoints
- [x] T044 [US1] Setup magic link email templates
- [x] T045 [US1] Implement user registration flow
- [x] T046 [US1] Create user profile management
- [x] T047 [US1] Implement logout functionality
- [x] T048 [US1] Create authentication error handling
- [x] T049 [US1] Implement authentication state management
- [x] T050 [US1] Create authentication tests in tests/unit/auth/
- [x] T051 [US1] Create authentication integration tests
- [x] T052 [US1] Create authentication E2E tests in tests/e2e/auth/

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Submit a Transcript for Evaluation (Priority: P1) 🎯 MVP

**Goal**: User submits a written or spoken response and receives AI-powered feedback.

**Independent Test**: Can be fully tested by submitting a response and verifying the evaluation API returns the expected structured feedback without requiring other user stories.

### Implementation for User Story 2

- [x] T053 [US2] Create evaluation API endpoint in src/app/api/evaluate/route.ts
- [x] T054 [US2] Implement OpenAI Whisper integration for speech-to-text
- [x] T055 [US2] Implement OpenAI GPT integration for evaluation
- [x] T056 [US2] Create evaluation result data models
- [x] T057 [US2] Implement evaluation service in src/lib/services/evaluation.ts
- [x] T058 [US2] Create drill interface page in src/app/(dashboard)/drill/page.tsx
- [x] T059 [US2] Implement response submission components
- [x] T060 [US2] Create evaluation result display components
- [x] T061 [US2] Implement score chip UI with popovers
- [x] T061a [US2] Create ScoreChip component in src/components/ui/score-chip.tsx
- [x] T061b [US2] Create ScorePopover component in src/components/ui/score-popover.tsx
- [x] T061c [US2] Implement chip color coding based on score ranges
- [x] T061d [US2] Add accessibility attributes for screen readers
- [x] T062 [US2] Create audio recording functionality
- [x] T063 [US2] Implement text input for written responses
- [x] T064 [US2] Create evaluation result validation
- [x] T065 [US2] Implement error handling for evaluation failures
- [x] T066 [US2] Create evaluation performance monitoring
- [x] T067 [US2] Implement evaluation result caching
- [x] T068 [US2] Create evaluation analytics tracking
- [x] T068a [US2] Implement score_returned event logging to PostHog
- [x] T068b [US2] Add user context to PostHog events for authenticated users
- [x] T068c [US2] Implement anonymous user tracking for unauthenticated users
- [x] T069 [US2] Create evaluation tests in tests/unit/evaluation/
- [x] T070 [US2] Create evaluation integration tests
- [x] T071 [US2] Create evaluation E2E tests in tests/e2e/evaluation/

**Checkpoint**: At this point, User Story 2 should be fully functional and testable independently

---

## Phase 5: User Story 3 - Load Content Pack (Priority: P1) 🎯 MVP

**Goal**: Admin/dev can load and swap a content pack (JSON file) at runtime.

**Independent Test**: Can be fully tested by uploading a valid JSON content pack and verifying it loads successfully without requiring user authentication or evaluation features.

### Implementation for User Story 3

- [x] T072 [US3] Create content pack loader page in src/app/(dashboard)/loader/page.tsx
- [x] T073 [US3] Implement content pack upload API in src/app/api/content/upload/route.ts
- [x] T074 [US3] Create content pack validation service
- [x] T075 [US3] Implement dry-run validation functionality
- [x] T076 [US3] Create content pack hot-swap mechanism
- [x] T077 [US3] Implement content pack storage and retrieval
- [x] T078 [US3] Create content pack versioning system
- [x] T079 [US3] Implement content pack rollback functionality
- [x] T080 [US3] Create content pack management UI
- [x] T081 [US3] Implement content pack validation error handling
- [x] T082 [US3] Create content pack analytics tracking
- [x] T082a [US3] Implement content_pack_loaded event logging to PostHog
- [x] T082b [US3] Add version and timestamp metadata to content pack events
- [x] T083 [US3] Implement content pack monitoring
- [x] T084 [US3] Create content pack backup and restore
- [x] T085 [US3] Implement content pack security validation
- [x] T086 [US3] Create content pack tests in tests/unit/content/
- [x] T087 [US3] Create content pack integration tests
- [x] T088 [US3] Create content pack E2E tests in tests/e2e/content/

**Checkpoint**: At this point, User Story 3 should be fully functional and testable independently

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect the entire application

- [x] T089 [P] Implement comprehensive error handling across all components
- [x] T090 [P] Add performance monitoring and optimization
- [x] T091 [P] Implement security hardening measures
- [x] T092 [P] Add comprehensive logging and debugging tools
- [x] T093 [P] Create user documentation and help system
- [x] T094 [P] Implement accessibility improvements
- [x] T095 [P] Add internationalization support
- [x] T096 [P] Implement comprehensive analytics tracking
- [x] T097 [P] Add monitoring and alerting systems
- [x] T098 [P] Create backup and disaster recovery procedures
- [x] T099 [P] Implement load testing and performance benchmarks
- [x] T100 [P] Add security scanning and compliance checks
- [x] T101 [P] Create deployment and maintenance documentation
- [x] T102 [P] Implement health checks and status monitoring
- [x] T103 [P] Add troubleshooting and diagnostic tools
- [x] T104 [P] Create maintenance and update procedures
- [x] T105 [P] Implement data migration and versioning
- [x] T106 [P] Add compliance and audit logging
- [x] T107 [P] Create disaster recovery and rollback procedures
- [x] T108 [P] Implement scaling and performance optimization

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: Depends on Foundational phase completion
- **Polish (Phase 6)**: Depends on all user story completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories

### Within Each User Story

- API endpoints before UI components
- Services before components
- Core functionality before error handling
- Implementation before testing
- Story complete before moving to polish phase

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- All Polish tasks marked [P] can run in parallel
- Different API endpoints can be created in parallel
- Different UI components can be created in parallel
- Different services can be created in parallel
- Different test files can be created in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all API endpoint tasks together:
Task: "Create magic link login page in src/app/(auth)/login/page.tsx"
Task: "Create auth callback handler in src/app/(auth)/callback/route.ts"
Task: "Create Stripe webhook handler in src/app/api/webhooks/stripe/route.ts"

# Launch all component tasks together:
Task: "Implement authentication components in src/components/auth/"
Task: "Create protected route wrapper component"
Task: "Create user profile management"
```

---

## Implementation Strategy

### MVP First (All User Stories P1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Authentication)
4. Complete Phase 4: User Story 2 (Evaluation)
5. Complete Phase 5: User Story 3 (Content Pack)
6. **STOP and VALIDATE**: Test all user stories independently
7. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (Auth MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Evaluation MVP!)
4. Add User Story 3 → Test independently → Deploy/Demo (Content MVP!)
5. Add Polish phase → Test independently → Deploy/Demo
6. Each phase adds value without breaking previous phases

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Authentication)
   - Developer B: User Story 2 (Evaluation)
   - Developer C: User Story 3 (Content Pack)
3. All stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [US1], [US2], [US3] labels map tasks to user stories for traceability
- Each user story should be independently completable and testable
- Verify each story works independently before considering complete
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

## Performance Targets

- **Authentication Flow**: ≤10 seconds from login request to authenticated access
- **Evaluation API**: ≤250ms for response evaluation
- **Content Pack Load**: ≤1 second for validation and hot-swap
- **Redis Lookups**: ≤50ms for entitlement checks
- **Page Load**: ≤2 seconds for drill interface

## Security Considerations

- Magic link authentication with secure token handling
- Protected routes with proper authorization checks
- Content pack validation to prevent malicious uploads
- API rate limiting and input validation
- Secure webhook handling for Stripe integration
- Environment variable security and validation
