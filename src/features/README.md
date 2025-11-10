# `src/features`

## Purpose

Encapsulate product capabilities within vertical modules. Each feature folder (e.g., `booking`, `scheduling`, `auth`, `billing`, `notifications`) owns its domain logic, application services, infrastructure adapters, and presentation helpers.

## Standard Layout

```
src/features/<feature>/
├── domain/          # Entities, aggregates, domain events
├── application/     # Use-cases, DTOs, validators
├── infrastructure/  # External adapters specific to the feature
└── presentation/    # Feature-scoped components, view-models, server actions
```

## Dependency Rules

- Feature modules may import:
  - `src/shared` primitives
  - `src/domain` interfaces (for shared contracts)
  - Other feature modules **only through** documented interfaces in `src/shared`
- Feature modules must **not** import directly from another feature’s internal folders.
- Infrastructure code remains feature-local unless promoted to `src/infrastructure`.

## Testing Strategy

- Place unit tests alongside domain/application code.
- Store integration tests under `tests/integration/<feature>` to exercise adapters.
- E2E scenarios referencing feature flows should reuse presentation entry points.

## Ownership & Governance

- Each feature module has a primary squad owner responsible for maintenance.
- Any cross-feature capability must be documented in `docs/architecture/cross-feature-playbook.md`.
- New feature folders require an accompanying README summarizing scope and external dependencies.

### Current Feature Modules

- `booking`: Content pack ingestion, validation, storage, admin presentation surfaces.
- `scheduling`: Evaluation pipeline (LLM, ASR, transcript recovery), performance/monitoring infrastructure.
- `auth`: Authentication helpers, server auth services, entitlement policies.
- `billing`: Stripe webhook orchestration and billing event handlers.
- `notifications`: Analytics domain contracts, PostHog adapters, alerting utilities.
