# `src/presentation`

## Purpose

Hosts non-routing presentation adapters such as controllers, presenters, view-model helpers, and server actions that sit between Next.js App Router (`src/app`) and the application layer. Components that are framework-specific but not routes belong here.

## Allowed Dependencies

- `src/application` for use-cases, DTO transformers, and view-model hooks
- `src/shared` for primitives, logger contracts, and typed errors
- Feature-scoped presentation utilities in `src/features/<feature>/presentation`

## Forbidden Dependencies

- Direct imports from `src/infrastructure` or low-level clients
- Invoking domain entities without going through application services

## Relationship with `src/app`

- `src/app` holds Next.js route handlers, layouts, and pages.
- Those routes should delegate orchestration to helpers housed in this directory to keep components thin and testable.

## Testing Guidance

- Write component/hook tests under `tests/e2e` or `tests/unit/presentation` depending on scope.
- When possible, render components with mocked application services to keep tests deterministic.

## Current Modules

- `components/` — shared UI primitives, shadcn wrappers, and presentation helpers
- `controllers/` — HTTP/controller glue for API routes
- `../app/` (Next.js routes) — server actions, layouts, and route handlers that delegate into this layer
