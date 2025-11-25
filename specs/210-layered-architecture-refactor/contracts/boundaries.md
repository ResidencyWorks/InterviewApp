# Architectural Contract: Layered Dependency Rules

## Path Alias Definitions

| Alias | Resolves To | Allowed Consumers | Notes |
|-------|-------------|-------------------|-------|
| `@domain/*` | `src/domain/*` | Domain, Application, Shared, Features | Pure business logic; must not import infra/presentation |
| `@app/*` | `src/application/*` | Application, Presentation, Features | Orchestrates domain use-cases and DTO translations |
| `@infra/*` | `src/infrastructure/*` | Infrastructure, Application (via interfaces), Presentation (through composition root) | Contains implementations of external dependencies |
| `@presentation/*` | `src/presentation/*` | Presentation only | UI and HTTP entry points |
| `@shared/*` | `src/shared/*` | All layers | Cross-cutting primitives (either/result, logging contracts) |
| `@features/*` | `src/features/*` | Feature-specific folders | Provides feature-scoped sub-modules with internal layering |

## Import Boundary Matrix

| From \\ To | Domain | Application | Infrastructure | Presentation | Shared | Features |
|------------|--------|-------------|----------------|--------------|--------|----------|
| **Domain** | ✅ | ✅ (interfaces only) | ❌ | ❌ | ✅ | ✅ (domain facet) |
| **Application** | ✅ | ✅ | ✅ (through interfaces) | ❌ | ✅ | ✅ |
| **Infrastructure** | ✅ (implement interfaces) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Presentation** | ❌ | ✅ | ✅ (via composition root) | ✅ | ✅ | ✅ |
| **Shared** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Features** | ✅ (local domain) | ✅ (local application) | ✅ (local infrastructure) | ✅ (local presentation) | ✅ | ✅ |

> ❌ entries MUST be enforced by lint and TypeScript configuration; any violation fails CI.

## Tooling Commands

- `pnpm lint:boundaries` — runs ESLint boundary rules and Biome linting.
- `pnpm test:unit` — executes domain/application Vitest suites without environment variables.
- `pnpm test:integration` — runs infrastructure adapters against TestContainers.
- `pnpm test:e2e` — triggers Playwright scenarios for presentation layer.

## Composition Root Contract

1. `src/infrastructure/config/environment.ts` exports validated configuration objects.
2. `src/infrastructure/config/clients.ts` builds external clients (Supabase, Redis, PostHog, Sentry).
3. `src/infrastructure/config/container.ts` wires application services via dependency injection.
4. Presentation layer imports only from the composition root (`@infra/config/container`) to obtain use-cases.

## Testing Contract

- Unit tests (`*.unit.spec.ts`) co-located with domain/application code must run without network or env dependencies.
- Integration tests (`infrastructure/__tests__`) may spin up TestContainers; they must mock external providers when no container is available.
- E2E tests reside under `presentation/__tests__/e2e` and rely on the composition root wiring defined above.
