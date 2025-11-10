# Tasks: Layered Architecture Refactor

**Input**: Design documents from `/specs/010-layered-architecture-refactor/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Constitution mandates test-first; ensure implementation updates relevant tests/configs as part of each task.
**Organization**: Tasks are grouped by user story to enable independent delivery and verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable task (independent files, no ordering dependency)
- **[Story]**: User story association (US1, US2, US3) — omit for setup/foundational/polish
- Include exact file paths in descriptions for clarity

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Capture current state before restructuring begins.

- [x] T001 Document current `lib/` inventory in `/workspaces/InterviewApp/docs/architecture/lib-inventory.md`
- [x] T002 Outline migration approach and rollback plan in `/workspaces/InterviewApp/docs/architecture/layered-refactor-plan.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish baseline directories and guidance before moving code.
**⚠️ CRITICAL**: Complete this phase before touching user stories.

- [x] T003 Create canonical layer folders at `/workspaces/InterviewApp/src/{domain,application,infrastructure,presentation,shared,features}` with `.gitkeep`
- [x] T004 Author responsibility guides in `/workspaces/InterviewApp/src/*/README.md` describing allowed dependencies
- [x] T005 Write feature module overview in `/workspaces/InterviewApp/src/features/README.md` including naming and test strategy

**Checkpoint**: Layer skeleton and documentation ready for migration.

---

## Phase 3: User Story 1 - Establish Layered Structure (Priority: P1) 🎯 MVP

**Goal**: Relocate `lib/` contents into canonical layers with clear documentation.
**Independent Test**: Verify all former `lib/` files now reside within the five layer directories and README guidance reflects the move.

### Implementation

- [x] T006 [US1] Move domain logic from `/workspaces/InterviewApp/lib/{domain,entitlements,evaluation,session,structure-analysis}` into `/workspaces/InterviewApp/src/domain/**`
- [x] T007 [US1] Relocate application orchestrators from `/workspaces/InterviewApp/lib/{validation,validations,services,optimization}` into `/workspaces/InterviewApp/src/application/**`
- [x] T008 [US1] Transfer infrastructure adapters from `/workspaces/InterviewApp/lib/{supabase,redis,posthog,rate-limit,retry,circuit-breaker,logging,webhooks}` into `/workspaces/InterviewApp/src/infrastructure/**`
- [x] T009 [US1] Align Next.js App Router routes under `/workspaces/InterviewApp/src/app/**` with updated imports from layered modules
- [x] T010 [P] [US1] Consolidate shared primitives and logger contracts into `/workspaces/InterviewApp/src/shared/**`
- [x] T011 [US1] Update layer READMEs in `/workspaces/InterviewApp/src/*/README.md` with migrated module listings and dependency rules
- [x] T012 [US1] Clean up obsolete `/workspaces/InterviewApp/lib/` imports and remove the directory

**Checkpoint**: Layered structure in place; MVP delivered.

---

## Phase 4: User Story 2 - Enable Feature Modules (Priority: P2)

**Goal**: Introduce feature-scoped modules that bundle vertical slices.
**Independent Test**: Scaffold a feature (e.g., booking) and confirm lint/tests run without touching legacy global services.

### Implementation

- [x] T013 [US2] Scaffold `/workspaces/InterviewApp/src/features/{booking,scheduling,auth,billing,notifications}/{domain,application,infrastructure,presentation}`
- [x] T014 [P] [US2] Migrate booking-specific assets into `/workspaces/InterviewApp/src/features/booking/**` wiring to shared layers
- [x] T015 [P] [US2] Migrate scheduling-specific assets into `/workspaces/InterviewApp/src/features/scheduling/**`
- [x] T016 [P] [US2] Migrate auth-specific assets into `/workspaces/InterviewApp/src/features/auth/**`
- [x] T017 [P] [US2] Migrate billing-specific assets into `/workspaces/InterviewApp/src/features/billing/**`
- [x] T018 [P] [US2] Migrate notifications-specific assets into `/workspaces/InterviewApp/src/features/notifications/**`
- [x] T019 [US2] Update `/workspaces/InterviewApp/src/features/README.md` with ownership, dependency, and testing guidance
- [x] T020 [US2] Refactor `/workspaces/InterviewApp/src/app/**` and `/workspaces/InterviewApp/src/presentation/**` to import from feature modules instead of shared services

**Checkpoint**: Feature boundaries in place; teams can iterate autonomously.

---

## Phase 5: User Story 3 - Enforce Boundaries & Testing Strategy (Priority: P3)

**Goal**: Add tooling and test segmentation that protect onion architecture.
**Independent Test**: Run linting and layer-specific tests to confirm boundary violations fail CI and unit tests avoid external dependencies.

### Implementation

- [x] T021 [US3] Define path aliases (`@domain/*`, `@app/*`, `@infra/*`, `@presentation/*`, `@shared/*`, `@features/*`) in `/workspaces/InterviewApp/tsconfig.json`
- [x] T022 [US3] Configure boundary linting in `/workspaces/InterviewApp/biome.json` (and related Biome configs) to block disallowed imports
- [x] T023 [P] [US3] Add scripts (`lint:boundaries`, `test:unit`, `test:integration`, `test:e2e`) to `/workspaces/InterviewApp/package.json`
- [x] T024 [P] [US3] Reorganize tests under `/workspaces/InterviewApp/tests/{unit,integration,e2e}` and update Vitest/Playwright configs
- [x] T025 [US3] Centralize startup configuration in `/workspaces/InterviewApp/src/infrastructure/config/{environment.ts,clients.ts,container.ts}`
- [x] T026 [US3] Publish ADR at `/workspaces/InterviewApp/docs/architecture/adr-layered-dependency-rules.md` documenting guardrails and tooling

**Checkpoint**: Tooling and tests enforce architectural contracts.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation updates, and handoff readiness.

- [x] T027 [P] Align `/workspaces/InterviewApp/specs/010-layered-architecture-refactor/quickstart.md` with final commands, aliases, and directory paths
- [x] T028 Capture migration validation results in `/workspaces/InterviewApp/docs/architecture/migration-report.md`
- [x] T029 Refresh architecture overview in `/workspaces/InterviewApp/README.md` to reflect layered + feature module structure
- [x] T030 Archive or document unsupported legacy scripts in `/workspaces/InterviewApp/docs/architecture/legacy-scripts-guidelines.md`
- [x] T031 Define cross-feature capability patterns (e.g., analytics) in `/workspaces/InterviewApp/docs/architecture/cross-feature-playbook.md`
- [x] T032 Extend Biome boundary rules to forbid unauthorized folder roots (prevent ad-hoc directories) in `/workspaces/InterviewApp/biome.json`

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → Phase 3 (US1)**: Sequential; US1 delivers MVP layered structure.
- **US2** depends on US1 completion; can run alongside US3 once layers exist.
- **US3** depends on US1, partially parallel with US2 (shared config coordination required).
- **Polish** follows completion of targeted user stories.

### User Story Dependencies

- **US1**: No story dependencies; foundation for others.
- **US2**: Requires US1 layers; independent of US3.
- **US3**: Requires US1 layers; complementary to US2.

### Parallel Opportunities

- T014–T018 can proceed simultaneously by separate feature squads.
- T023 and T024 can run once T021–T022 complete.
- Polish tasks (T027–T029) may run in parallel post-implementation.

---

## Parallel Example: User Story 2

```bash
# Booking migration
Task: "T014 [P] [US2] Migrate booking-specific assets into /workspaces/InterviewApp/src/features/booking/**"

# Scheduling migration
Task: "T015 [P] [US2] Migrate scheduling-specific assets into /workspaces/InterviewApp/src/features/scheduling/**"

# Auth migration
Task: "T016 [P] [US2] Migrate auth-specific assets into /workspaces/InterviewApp/src/features/auth/**"
```

---

## Implementation Strategy

1. Deliver MVP by completing Phases 1–3 (US1) and validate structure.
2. Iterate with US2 to grant feature autonomy.
3. Harden architecture via US3 tooling/tests.
4. Finish with polish tasks for documentation and validation artifacts.

---

## Notes

- Maintain sequential task IDs; mark `[P]` only when tasks touch independent files.
- Keep user stories independently testable per spec acceptance criteria.
- Update documentation as part of the same phase to prevent drift.
- Ensure tests/configs are in place before merging structural changes.
