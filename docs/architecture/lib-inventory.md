# `src/lib` Inventory — Pre-Refactor Snapshot

_Last updated: 2025-11-09_

This document captures the state of `src/lib/` before the layered architecture refactor. It serves as the canonical reference for relocating existing modules into the new `domain`, `application`, `infrastructure`, `presentation`, `shared`, and `features` directories.

## High-Level Grouping

| Category | Current Folder(s) | Primary Responsibility | Candidate Layer(s) |
|----------|-------------------|------------------------|--------------------|
| Core domain logic | `domain/`, `structure-analysis/` (entities, rules), `evaluation/`, `session/`, `entitlements/` | Business rules, scoring, entitlement checks | `src/domain`, `src/features/*/domain` |
| Application services | `services/`, `validations/`, `validation/`, `optimization/`, `analytics/application` | Orchestration, DTO validation, cross-entity workflows | `src/application`, `src/features/*/application` |
| Infrastructure adapters | `supabase/`, `redis/`, `posthog/`, `storage/`, `upload/`, `network/`, `infrastructure/**` | External integrations, persistence, caching, telemetry | `src/infrastructure`, `src/features/*/infrastructure` |
| Presentation helpers | `api/`, `startup/`, `controllers/`, `fallback/`, `accessibility/` | HTTP handlers, bootstrap logic, UI fallbacks | `src/app`, `src/presentation` |
| Shared primitives | `logging/`, `error/`, `circuit-breaker/`, `retry/`, `rate-limit/`, `utils/`, `device/`, `i18n/`, `security/` | Cross-cutting utilities and contracts safe across layers | `src/shared` |
| Specialized engines | `structure-analysis/`, `llm/**`, `analytics/**`, `content-pack/`, `asr/` | Feature-specific engines with their own sublayers | `src/features/{structure-analysis, llm, analytics, content}` |

## Detailed Directory Notes

- `domain/`: Contains entities, interfaces, repositories, and domain services. These should move to `src/domain` with per-feature slices extracted into `src/features/*/domain`.
- `structure-analysis/`: Already uses a DDD-like split (`entities`, `services`, `interfaces`). Treat as a feature module candidate.
- `services/`: Catch-all application services, mixing orchestration with infra calls. Each service needs classification into application use-cases or infrastructure adapters.
- `validation/` & `validations/`: Mixed Zod schemas and helper functions. Consolidate into application DTO validators or domain invariants.
- `infrastructure/`: Houses cache, filesystem, Supabase, and PostHog clients. Map to `src/infrastructure/{adapters,clients}`.
- `analytics/`: Hybrid domain/application code. Keep domain logic with reporting value objects; move event publishing into infrastructure.
- `monitoring/`, `alerts/`, `logging/`: Infrastructure observability stacks; include in `src/infrastructure/monitoring` and surface contracts in `src/shared/logger`.
- `optimization/`, `performance/`, `scaling/`: Cross-layer utilities—evaluate per module to decide between `application` and `shared`.
- `api/`: Legacy API handlers. Convert to App Router entries under `src/app` or feature-scoped presentation controllers.
- `startup/`: Environment bootstrap routines. Re-home under `src/infrastructure/config`.

## Outstanding Questions

1. Which engine modules (e.g., `llm`, `structure-analysis`) should ship as independent feature modules versus shared platform capabilities?
2. Are there deprecated directories that can be archived instead of migrated (e.g., `device/`, `load/`)?
3. Do any subdirectories include credentials or environment-specific state that require redaction before relocation?

Document updates should accompany each migration PR to keep the inventory accurate until `src/lib/` is fully decomissioned.
