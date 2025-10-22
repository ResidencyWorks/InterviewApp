# Tasks: M0 Core Loop Skeleton

This file lists dependency-ordered, executable tasks organized by user story.

## Phase 1: Setup

- [X] T001 Create .env.example with required keys at /workspaces/InterviewApp/.env.example
- [X] T002 Add Owner Runbook at /workspaces/InterviewApp/docs/owner-runbook.md
- [X] T003 Add README demo steps at /workspaces/InterviewApp/README.md
- [X] T004 Add sample content pack v1.2.0 at /workspaces/InterviewApp/sample-data/matchready_content_pack_v1.2.0.json

## Phase 2: Foundational

- [X] T005 Define evaluation schema at /workspaces/InterviewApp/src/lib/evaluation/evaluation-schema.ts
- [X] T006 Implement analytics helpers at /workspaces/InterviewApp/src/lib/analytics/transcript-analytics.ts
- [X] T007 Implement error capture helpers at /workspaces/InterviewApp/src/lib/error/TranscriptErrorRecovery.ts
- [X] T007a Implement error tracking service integration at /workspaces/InterviewApp/src/lib/error/ErrorTrackingService.ts
- [X] T008 Implement content pack interfaces at /workspaces/InterviewApp/src/lib/content-pack/types.ts
- [X] T009 Implement content pack loader with dry-run at /workspaces/InterviewApp/src/lib/content-pack/ContentPackLoader.ts

## Phase 3: User Story 1 - Submit transcript and receive scored results (P1)

- [X] T010 [US1] Implement evaluation engine rules at /workspaces/InterviewApp/src/lib/evaluation/evaluation-engine.ts
- [ ] T011 [US1] Implement refactor summary stub at /workspaces/InterviewApp/src/lib/evaluation/refactor-summary.ts
- [X] T012 [US1] Create POST /api/evaluate endpoint at /workspaces/InterviewApp/app/api/evaluate/route.ts
- [ ] T013 [P] [US1] Add unit test happy path for schema at /workspaces/InterviewApp/tests/evaluation-schema.happy.test.ts
- [ ] T014 [P] [US1] Add unit test failure path for schema at /workspaces/InterviewApp/tests/evaluation-schema.fail.test.ts
- [X] T015 [US1] Create client store for results at /workspaces/InterviewApp/src/store/evaluationResultsStore.ts
- [X] T016 [US1] Build submit UI at /workspaces/InterviewApp/app/(dashboard)/practice/page.tsx
- [X] T017 [US1] Build results view with chips and metrics at /workspaces/InterviewApp/src/components/evaluation/ResultsView.tsx
- [X] T018 [US1] Fire analytics events (start/submit/score) in UI at /workspaces/InterviewApp/app/(dashboard)/practice/page.tsx
- [X] T018a [US1] Fire drill_started analytics event on page load at /workspaces/InterviewApp/app/(dashboard)/practice/page.tsx

## Phase 4: User Story 2 - Auth and entitlement-gated access post-checkout (P2)

- [X] T019 [US2] Implement auth login/logout and protected routes at /workspaces/InterviewApp/src/lib/auth/auth.ts
- [X] T020 [US2] Implement entitlements service with TTL cache at /workspaces/InterviewApp/src/lib/entitlements/EntitlementsService.ts
- [X] T021 [US2] Create checkout-success webhook at /workspaces/InterviewApp/app/api/webhooks/stripe/route.ts
- [X] T022 [P] [US2] Implement idempotency store at /workspaces/InterviewApp/src/lib/webhooks/IdempotencyStore.ts
- [X] T023 [US2] Add integration test for webhook idempotency at /workspaces/InterviewApp/tests/webhook-idempotency.int.test.ts
- [X] T024 [US2] Gate practice routes by entitlement at /workspaces/InterviewApp/app/(dashboard)/practice/page.tsx

## Phase 5: User Story 3 - Load and hot-swap content pack (P3)

- [X] T025 [US3] Add content pack validation schema at /workspaces/InterviewApp/src/lib/content-pack/schema.ts
- [X] T026 [US3] Implement activation and hot-swap at /workspaces/InterviewApp/src/lib/content-pack/ContentPackActivation.ts
- [X] T027 [US3] Add UI to upload/activate pack at /workspaces/InterviewApp/src/components/content-pack/ContentPackList.tsx
- [X] T028 [P] [US3] Emit content_pack_loaded analytics at /workspaces/InterviewApp/src/lib/analytics/transcript-analytics.ts

## Final Phase: Polish & Cross-Cutting

- [X] T029 Add basic loading/error states to practice UI at /workspaces/InterviewApp/app/(dashboard)/practice/page.tsx
- [X] T030 Document test instructions in docs/owner-runbook.md at /workspaces/InterviewApp/docs/owner-runbook.md
- [X] T031 Ensure README lists Day-3 demo flow at /workspaces/InterviewApp/README.md
- [X] T032 Add performance monitoring for evaluation endpoint at /workspaces/InterviewApp/src/lib/monitoring/PerformanceMonitor.ts
- [X] T033 Add performance validation for content pack hot-swap at /workspaces/InterviewApp/src/lib/content-pack/ContentPackActivation.ts

## Dependencies (Story Order)

1. US1 → US2 → US3

## Parallel Execution Examples

- T013 and T014 can run in parallel once schema file (T005) exists.
- T022 can be implemented in parallel with T021.
- T028 can be implemented in parallel with T025.

## Implementation Strategy

- Deliver MVP for US1 first (submission → evaluation → render → analytics).
- Layer in auth + gating + webhook idempotency.
- Add content pack loader and hot-swap.
- Finish with ops artifacts and polish.
