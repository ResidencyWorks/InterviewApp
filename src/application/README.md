# `src/application`

## Purpose

Encapsulates use-cases, command/query handlers, DTOs, and validation logic that orchestrate domain behavior. The application layer coordinates workflows, enforces business processes, and translates between external payloads and domain entities.

## Allowed Dependencies

- `src/domain` for domain entities, value objects, and repository interfaces
- `src/shared` for cross-layer primitives (result/either, logger contract, typed errors)
- Feature-scoped domain/application modules within `src/features/<feature>`

## Forbidden Dependencies

- `src/infrastructure`, `src/presentation`, `src/app` (direct imports)
- Direct usage of HTTP frameworks, database clients, or environment variables

## Validation & DTOs

- Define request/response DTOs here with Zod/Valibot schemas.
- Keep domain invariants inside domain entities; use application layer to guard input and orchestrate conversions.

## Testing Guidance

- Co-located unit tests should mock repository interfaces and external services.
- Tests must not require network access or environment configuration.

## Current Modules

- `services/` — orchestrators like `content-pack-validation` and `dashboardService`
- `validations/` — DTO validation schemas grouped by domain (auth, content, evaluation)
- `validation/` — shared validation helpers (e.g., schema registries)
- `optimization/` — application-level performance helpers and optimizers
