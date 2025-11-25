# Research Findings: Layered Architecture Refactor

## Decision: Adopt Onion Layers with Feature Modules
- **Rationale**: Aligns with constitution’s onion architecture mandate, isolates business logic, and gives teams clear ownership by pairing vertical feature modules with horizontal layers.
- **Alternatives Considered**:
  - Keep kitchen-sink `lib/` and document conventions — rejected because it fails to enforce boundaries or scale with team growth.
  - Split into separate packages/workspaces — postponed to avoid overhead before validating new structure within single repo.

## Decision: Use TypeScript Path Aliases and ESLint Boundaries
- **Rationale**: Path aliases (`@domain/*`, `@app/*`, `@infra/*`, `@presentation/*`, `@shared/*`, `@features/*`) simplify imports while boundary lint rules prevent domain-to-infra leakage, offering immediate feedback in dev and CI.
- **Alternatives Considered**:
  - Rely on directory naming without tooling — rejected because manual policing is error-prone.
  - Heavyweight Nx project graph enforcement — deferred until repository needs build-time scaling.

## Decision: Relocate Validation and Services into Application Layer
- **Rationale**: Application layer orchestrates DTO validation and use-cases; consolidating schemas and use-case logic there reduces duplication and clarifies responsibilities.
- **Alternatives Considered**:
  - Keep `validation(s)` as shared utility — rejected because it obscures DTO ownership and mixes domain invariants with transport rules.
  - Embed validation in presentation layer — rejected to maintain thin controllers and reusable application services.

## Decision: Centralize Startup and Configuration in `src/infrastructure/config`
- **Rationale**: Infrastructure layer should construct external clients and provide a composition root consumed by presentation handlers, keeping domain/application pure.
- **Alternatives Considered**:
  - Distribute config across features — rejected as it complicates secrets management and DI.
  - Maintain legacy `startup/` root — rejected to avoid duplicated bootstrapping logic.

## Decision: Testing Strategy by Layer
- **Rationale**: Co-locating unit tests with domain/application code ensures fast, environment-free runs; infrastructure integration tests rely on dockerized services; e2e tests validate presentation flows via Playwright.
- **Alternatives Considered**:
  - Centralized `tests/unit` only — rejected for coupling tests to folder structure rather than artifact ownership.
  - Pure contract tests without unit focus — rejected as it would slow feedback and violates constitution’s test-first guidance.
