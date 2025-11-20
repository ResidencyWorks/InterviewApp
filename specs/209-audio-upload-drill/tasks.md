# Tasks: Audio Upload for Drill Recordings

**Input**: Design documents from `/specs/009-audio-upload-drill/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and shared configuration

- [X] T001 Create `drill-recordings` bucket in Supabase Storage (private, RLS enabled)
- [X] T002 Configure Supabase bucket lifecycle policy for 30-day auto-delete
- [X] T003 [P] Configure Supabase bucket CORS policies for signed URL playback
- [X] T004 Create `recordings` table in PostgreSQL with indexes (see data-model.md)
- [X] T005 Add environment variables to `.env.local` (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- [X] T006 [P] Install @supabase/supabase-js dependency
- [X] T007 [P] Setup PostHog analytics initialization
- [X] T008 [P] Setup Sentry error tracking
- [X] T009 [P] Configure Vercel deployment settings

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T010 Create base Recording domain model in `src/models/recording.ts`
- [X] T011 [P] Create Supabase storage client wrapper in `src/lib/storage/supabase-storage.ts`
- [X] T012 [P] Create user entitlement validation service in `src/services/entitlement.ts`
- [X] T013 [P] Create upload types and interfaces in `src/lib/upload/types.ts`
- [X] T014 Setup error handling infrastructure (error types, Sentry integration)
- [X] T015 [P] Configure Zod validation schemas in `src/lib/upload/schemas.ts`
- [X] T016 [P] Setup PostHog analytics event logging utilities

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Record and Upload Audio Response (Priority: P1) 🎯 MVP

**Goal**: Core functionality enabling users to record audio and upload for evaluation

**Independent Test**: Record audio, verify upload completion, confirm successful storage without needing playback or evaluation features

**Mapping**: FR-001, FR-002, FR-003, FR-004, FR-006, FR-014, FR-015, FR-016 (core recording and upload functionality)

### Implementation for User Story 1

- [X] T017 [P] [US1] Create UploadSession tracking model in `src/lib/upload/types.ts`
- [X] T018 [P] [US1] Implement exponential backoff retry logic in `src/lib/upload/retry-logic.ts` (base delay: 1s, multiplier: 2x, jitter: ±25%, attempts: 1s, 2s, 4s)
- [X] T019 [US1] Implement core upload service orchestration in `src/lib/upload/upload-service.ts` (depends on T018)
- [X] T020 [US1] Implement POST /api/upload API route in `src/app/api/upload/route.ts` (depends on T019)
- [X] T021 [P] [US1] Create AudioRecorder component with MediaRecorder wrapper in `src/components/drill/AudioRecorder.tsx`
- [X] T022 [US1] Integrate upload service with AudioRecorder component (depends on T020, T021)
- [X] T023 [US1] Implement file metadata validation and recording status tracking (size, type, duration, recording → uploading → completed)
- [X] T024 [US1] Add upload cancellation handling when new recording starts (FR-016)
- [X] T025 [US1] Add success/error message handling and user feedback
- [X] T026 [US1] Integrate PostHog analytics for upload events (depends on T016)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently - users can record and upload audio responses

---

## Phase 4: User Story 2 - Fallback Text Input for Mic-Blocked States (Priority: P2)

**Goal**: Alternative input method when microphone permissions are denied or unavailable

**Independent Test**: Simulate microphone permission denial, verify text input functionality works independently

**Mapping**: FR-009, FR-010 (permission detection and fallback UI)

### Implementation for User Story 2

- [X] T027 [P] [US2] Create TextFallback component in `src/components/drill/TextFallback.tsx`
- [X] T028 [US2] Implement microphone permission detection logic in AudioRecorder component
- [X] T029 [US2] Add automatic fallback UI display when permissions are denied
- [X] T030 [US2] Implement manual mode switching between recording and text input
- [X] T031 [US2] Update upload service to handle text submissions (alternative to audio file)
- [X] T032 [US2] Add form validation for text input (length limits, character validation)
- [X] T033 [US2] Store text responses in database alongside audio recordings metadata
- [X] T034 [US2] Integrate PostHog analytics for permission denial and fallback usage events

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can submit audio OR text responses

---

## Phase 5: User Story 3 - Monitor Upload Progress with Retry (Priority: P3)

**Goal**: Enhanced UX with progress tracking and automatic retry for failed uploads

**Independent Test**: Simulate network failures, verify retry behavior and progress updates work independently

**Mapping**: FR-011, FR-012, FR-013 (progress tracking, retry logic, analytics)

### Implementation for User Story 3

- [X] T035 [P] [US3] Create UploadProgress component in `src/components/drill/UploadProgress.tsx`
- [X] T036 [US3] Implement progress percentage calculation from bytes uploaded
- [X] T037 [US3] Integrate retry logic with exponential backoff from T018
- [X] T038 [US3] Add upload progress event emission (every 1 second during upload, every 10% increment)
- [X] T039 [US3] Implement retry UI feedback (showing retry attempts and delays)
- [X] T040 [US3] Add manual retry button after max retry attempts exhausted
- [X] T041 [US3] Update upload service to track progress state in UploadSession model
- [X] T042 [US3] Log progress events to PostHog (start, progress every 10%, retry, completion, failure)
- [X] T043 [US3] Add network error detection and error categorization (retryable vs. permanent)
- [X] T044 [US3] Implement progress indicator updates (real-time, every 1 second per FR-003)

**Checkpoint**: All user stories should now be independently functional - full upload experience with retry and progress tracking

---

## Phase 6: Signed URL Playback & Cleanup

**Goal**: Generate time-limited URLs for audio playback and enforce 30-day retention policy

**Mapping**: FR-007, FR-008 (signed URL generation, file deletion)

### Implementation for Signed URL Playback

- [X] T045 [P] Implement signed URL generation service in `src/lib/storage/signed-url.ts`
- [X] T046 Create POST /api/recordings/[recordingId]/signed-url API route in `src/app/api/recordings/[recordingId]/signed-url/route.ts`
- [X] T047 Implement URL expiry validation (15-minute limit)
- [X] T048 Add playback access control (verify user owns recording)
- [X] T049 [P] Implement lifecycle cleanup service in `src/lib/storage/lifecycle.ts`
- [X] T050 Create scheduled job or Edge Function for automatic 30-day file deletion
- [X] T051 Add metadata cleanup when files are deleted from storage

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements and quality assurance

- [X] T052 [P] Add JSDoc comments to all exported functions per Constitution requirements
- [X] T053 [P] Run biome format and lint on all new files
- [X] T054 [P] Add unit tests for retry logic in `tests/unit/lib/upload/retry-logic.test.ts`
- [X] T055 [P] Add unit tests for signed URL generation in `tests/unit/lib/storage/signed-url.test.ts`
- [X] T056 [P] Add unit tests for Recording model in `tests/unit/models/recording.test.ts`
- [X] T057 Add integration tests for upload API route in `tests/integration/api/upload/route.test.ts`
- [X] T058 Add integration tests for upload service in `tests/integration/lib/upload/upload-service.test.ts`
- [X] T059 Add E2E test for full upload flow in `tests/e2e/upload-flow.spec.ts`
- [X] T060 Test cross-browser compatibility (Chrome, Firefox, Safari)
- [X] T061 Validate all success criteria from spec.md are met
- [X] T062 Run quickstart.md validation
- [X] T063 Performance testing (verify upload p95 < 2s, signed URL p95 < 500ms)
- [X] T064 Update documentation in `docs/` if needed
- [X] T065 Security audit (verify service role credentials never exposed)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories CAN proceed in parallel once Foundational is complete
  - Or sequentially in priority order (P1 → P2 → P3)
- **Signed URL (Phase 6)**: Depends on User Story 1 completion (upload needs to work first)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Requires US1 to be functional for progress tracking context

### Within Each User Story

- Core implementation before integration
- Service layer before API routes
- Components depend on service layer
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003, T006-T009)
- All Foundational tasks marked [P] can run in parallel (T011, T012, T013, T015, T016)
- Once Foundational phase completes, User Stories 1-3 can start in parallel (if team capacity allows)
- Within User Story 1: T017, T018, T021 can run in parallel
- Within User Story 2: T027 can run in parallel
- Within User Story 3: T035 can run in parallel
- Polish phase tests (T054-T056, T057-T058) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all foundational models/services together:
Task: T017 [US1] - Create UploadSession tracking model in src/lib/upload/types.ts
Task: T018 [US1] - Implement exponential backoff retry logic in src/lib/upload/retry-logic.ts
Task: T021 [US1] - Create AudioRecorder component with MediaRecorder wrapper in src/components/drill/AudioRecorder.tsx

# Then integrate:
Task: T019 [US1] - Implement core upload service orchestration (depends on T018)
Task: T022 [US1] - Integrate upload service with AudioRecorder component (depends on T020, T021)
```

---

## Parallel Example: User Story 2

```bash
# Create fallback component independently:
Task: T027 [US2] - Create TextFallback component in src/components/drill/TextFallback.tsx

# Then update AudioRecorder for permission detection:
Task: T028 [US2] - Implement microphone permission detection logic
Task: T029 [US2] - Add automatic fallback UI display
```

---

## Parallel Example: User Story 3

```bash
# Create progress component independently:
Task: T035 [US3] - Create UploadProgress component in src/components/drill/UploadProgress.tsx

# Then integrate retry logic:
Task: T037 [US3] - Integrate retry logic with exponential backoff
Task: T041 [US3] - Update upload service to track progress state
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (Supabase bucket, database, dependencies)
2. Complete Phase 2: Foundational (models, services, validation)
3. Complete Phase 3: User Story 1 (record and upload audio)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add Signed URL playback → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (core upload)
   - Developer B: User Story 2 (fallback text input)
   - Developer C: User Story 3 (progress & retry)
   - Developer D: Signed URL generation (Phase 6)
3. Stories complete and integrate independently
4. All developers participate in Polish phase testing

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability (US1, US2, US3)
- Each user story should be independently completable and testable
- Verify task completion before moving to dependent tasks
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Total: 65 tasks organized across 7 phases
- MVP scope: Phases 1-3 (T001-T026, approximately 26 tasks)
- Full feature scope: All phases (T001-T065, 65 tasks)
- Parallel opportunities: ~30 tasks can run in parallel across different team members
