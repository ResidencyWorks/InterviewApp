# `src/domain`

## Purpose

Holds the core business logic for InterviewApp. Code in this layer expresses domain entities, value objects, domain services, and domain events. It must remain pure and free from framework concerns.

## Allowed Dependencies

- Other modules inside `src/domain`
- Shared primitives from `src/shared` (e.g., result/either types, error contracts)
- Type definitions that do **not** introduce infrastructure or presentation side effects

## Forbidden Dependencies

- `src/application`, `src/infrastructure`, `src/presentation`, `src/app`
- External SDKs, databases, or network clients
- Environment access (`process.env`, file system, timers)

## Testing Guidance

- Unit tests live alongside the code (`*.unit.spec.ts`)
- Tests must run without touching the network, file system, or environment variables

## Current Modules

- `entities/` — canonical domain entities and aggregates
- `repositories/` — repository contracts that infrastructure implements
- `services/` — pure domain services (e.g., `ContentPackService`)
- `interfaces/` — shared domain interfaces (DTO-free)
- `entitlements/` — entitlement policies and helpers
- `evaluation/` — evaluation schemas and engines
- `session/` — session state and business rules
- `structure-analysis/` — static analysis rules and analyzers

## Notes

- Keep public APIs explicit (interfaces exported at folder index).
- Prefer pure functions and immutable data when possible.
