# Feature Specification: Layered Architecture Refactor

**Feature Branch**: `010-layered-architecture-refactor`
**Created**: 2025-11-09
**Status**: Draft
**Input**: User description highlighting the need to flatten `lib/` into clear layers, introduce feature modules, enforce dependency boundaries, and align testing, configuration, and UI practices with the new architecture.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Establish Layered Structure (Priority: P1)

As the platform engineering lead, I want the existing shared `lib/` code reorganized into explicit `domain`, `application`, `infrastructure`, `presentation`, and `shared` layers so that teams understand ownership and dependency rules at a glance.

**Why this priority**: Without a clear layered structure, teams keep adding to the kitchen-sink folder, causing regressions and slowing delivery.

**Independent Test**: Review the repository tree and confirm every former `lib/` artifact now sits in the correct layer with documented import rules.

**Acceptance Scenarios**:

1. **Given** the current codebase, **When** the refactor completes, **Then** every file previously under `lib/` resides in one of the five canonical layer directories.
2. **Given** the updated directory structure, **When** a developer inspects layer readme guidance (including how Next.js routes live under `src/app` as part of the presentation layer), **Then** the allowed dependencies for that layer are documented and enforced by tooling.

---

### User Story 2 - Enable Feature Modules (Priority: P2)

As a booking squad engineer, I want feature-specific modules (e.g., `features/booking`) that bundle domain, application, and local infrastructure code so improvements stay cohesive and avoid bloated global services.

**Why this priority**: Feature teams need autonomy to iterate without fighting global utilities or duplicating logic.

**Independent Test**: Create a new feature module skeleton and verify linting, tests, and imports succeed without relying on legacy `lib/` helpers.

**Acceptance Scenarios**:

1. **Given** a newly created feature folder, **When** the team adds domain, application, and infrastructure artifacts, **Then** imports resolve via feature-local paths and global layers.
2. **Given** an existing feature such as scheduling, **When** its code is migrated, **Then** no shared logic remains in generic `services/` or `validation` folders.

---

### User Story 3 - Enforce Boundaries and Testing Strategy (Priority: P3)

As the architecture reviewer, I want tooling that blocks cross-layer leaks and separates unit, integration, and end-to-end tests so we can trust builds to catch violations early.

**Why this priority**: Boundary violations reintroduce coupling and fragile tests that depend on external services.

**Independent Test**: Run linting and layer-specific test commands to see boundary violations flagged and tests running without external dependencies when promised.

**Acceptance Scenarios**:

1. **Given** the ESLint and path alias configuration, **When** a developer attempts to import infrastructure code from the domain layer, **Then** the linter fails with a boundary violation.
2. **Given** the new testing scripts, **When** unit tests run for domain and application code, **Then** they execute without requiring network or environment variables.

---

### Edge Cases

- How do we handle legacy scripts or prototypes that do not map cleanly to any layer?
- What happens when a cross-feature capability (e.g., shared analytics) needs both feature-specific and platform-level logic?
- How does the system protect against future teams bypassing feature modules by adding ad-hoc folders?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST expose top-level `src/domain`, `src/application`, `src/infrastructure`, `src/presentation`, `src/shared`, and `src/app` (Next.js routes) directories, each containing a layer overview that enumerates its responsibilities and allowed dependencies.
- **FR-002**: All code previously located under `lib/`, `services/`, or `validation(s)` MUST be relocated into the appropriate layer or feature module, with obsolete folders removed or archived.
- **FR-003**: The project MUST provide `src/features/<feature-name>/` modules that encapsulate domain, application, and local infrastructure adapters for each major product area (booking, scheduling, auth, billing, notifications).
- **FR-004**: Shared validation schemas MUST live alongside their respective application DTOs, while domain entities MUST keep invariants internally without referencing infrastructure code.
- **FR-005**: Canonical import aliases (`@domain/*`, `@app/*`, `@infra/*`, `@presentation/*`, `@shared/*`, `@features/*`) MUST be available to developers and referenced in documentation.
- **FR-006**: Automated dependency boundaries (lint rules and type-checker configuration) MUST prevent imports from inner layers to outer layers (e.g., domain → infrastructure) and flag violations during CI.
- **FR-007**: Testing guidance MUST co-locate unit tests with their code, distinguish unit, integration, and end-to-end suites, and ensure domain/application unit tests run without environment variables or network calls.
- **FR-008**: Startup routines, environment configuration, and client factories MUST reside under `src/infrastructure/config` and be accessible through a documented composition root used by presentation entry points.
- **FR-009**: Presentation assets (Next.js routes under `src/app`, controllers, components, hooks) MUST delegate business logic to application layer view-models or hooks, keeping UI components thin and reusable while remaining compatible with App Router conventions.
- **FR-010**: A concise architecture decision record (ADR) summarizing dependency rules MUST be created and stored at the repository root.

### Key Entities *(include if feature involves data)*

- **Layer**: Represents one of the five architectural tiers; attributes include purpose, allowed dependencies, and typical artifacts.
- **Feature Module**: Bundles domain, application, and infrastructure pieces for a product capability; attributes include feature name, owned contexts, and external integrations.
- **Testing Suite**: Categorizes tests (unit, integration, e2e) with attributes such as scope, environment requirements, and target layers.

### Assumptions

- Existing CI pipelines can be updated to respect new linting and testing commands within the project timeline.
- Teams agree to migrate active work-in-progress branches to the new structure before merging to avoid drift.
- Legacy experiments not needed in production can be archived outside the main source tree without impacting delivery schedules.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of files formerly in `lib/`, `services/`, or `validation(s)` are relocated into the new layer or feature module structure with no orphaned directories remaining.
- **SC-002**: Lint and TypeScript boundary checks block 100% of disallowed cross-layer imports in CI within the first week of adoption.
- **SC-003**: Feature teams report (via retrospective or survey) a 30% reduction in time-to-ship for changes that touch both business logic and UI after adopting feature modules.
- **SC-004**: Unit test suites for domain and application code run in under 5 minutes without requiring external services, and integration tests execute only against infrastructure code paths.
