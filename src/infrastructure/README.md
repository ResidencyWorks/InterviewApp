# `src/infrastructure`

## Purpose

Provides concrete implementations for external concerns: database clients, caches, messaging, observability, file systems, and HTTP integrations. It adapts technology-specific details to the interfaces declared in the domain and application layers.

## Allowed Dependencies

- `src/domain` (implement repository interfaces)
- `src/application` (satisfy use-case composition via adapters)
- `src/shared` for logging contracts, error wrappers, and primitives
- External SDKs and platform-specific libraries (Supabase, Redis, PostHog, Sentry, etc.)

## Forbidden Dependencies

- `src/presentation` and `src/app` (avoid UI coupling)
- Business logic that belongs in domain or application layers

## Structure Guidelines

- Group clients/adapters by integration (`supabase/`, `redis/`, `posthog/`, etc.)
- Keep configuration inside `src/infrastructure/config` and expose factories/DI containers.
- Surface only interfaces and factories to consuming layers (no direct SDK exports).

## Testing Guidance

- Integration tests live under `src/infrastructure/__tests__`.
- Prefer TestContainers or lightweight mocks; document any external dependencies in quickstart.

## Current Modules

- `supabase/` — client factories, repositories, storage helpers
- `redis/` — cache clients, cache key utilities, cache TTLs
- `posthog/` — analytics client configuration and helpers
- `rate-limit/` — rate limiter middleware implementations
- `retry/` — retry utilities for external calls
- `circuit-breaker/` — protective wrappers for unreliable integrations
- `logging/` — structured logger implementation using Sentry
- `webhooks/` — webhook idempotency store and processing utilities
