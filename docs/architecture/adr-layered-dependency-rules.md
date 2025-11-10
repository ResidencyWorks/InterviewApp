# ADR: Layered Dependency Rules

- **Status**: Proposed → Accepted (2025-11-09)
- **Authors**: Platform Architecture Guild
- **Context**: Layered architecture refactor (Spec `010-layered-architecture-refactor`)
- **Links**:
  - [Specification](../../specs/010-layered-architecture-refactor/spec.md)
  - [Implementation Plan](../../specs/010-layered-architecture-refactor/plan.md)
  - [Boundary Contract](../../specs/010-layered-architecture-refactor/contracts/boundaries.md)

## Problem

The legacy `lib/` directory mixed domain logic, infrastructure adapters, and presentation helpers. Repeated breaches of the Onion Architecture principle made it difficult to reason about dependencies, replace implementations, or establish team ownership. We needed enforceable conventions to keep:

- Domain logic free from framework and infrastructure coupling
- Application services responsible for orchestration and DTO boundaries
- Infrastructure adapters containing all external integrations
- Presentation (including Next.js `src/app`) dependent on the composition root rather than ad-hoc imports
- Feature modules acting as vertical slices that respect the horizontal layer rules

## Decision

1. **Path Aliases**
   - Added canonical aliases in `tsconfig.json`:
     - `@domain/*`, `@app/*`, `@infra/*`, `@presentation/*`, `@shared/*`, `@features/*`
   - Presentation code may only import from `@app`, `@features`, and the composition root exposed under `@infra/config`.

2. **Biome Boundary Enforcement**
   - Configured `biome.json` overrides with `noRestrictedImports` to block prohibited imports:
     - Domain code cannot depend on application, infrastructure, presentation, or feature layers.
     - Application code cannot depend on presentation.
     - Presentation (`src/app`, `src/presentation`) cannot import domain symbols directly.

3. **Centralized Composition Root**
   - Introduced `src/infrastructure/config/{environment.ts,clients.ts,container.ts}`:
     - `environment.ts` validates all environment variables through Zod.
     - `clients.ts` constructs Supabase, Redis, and PostHog clients.
     - `container.ts` exposes the validated config and lazy client accessors for presentation/feature code.

4. **Feature Modules**
   - Feature namespaces (`src/features/<feature>/...`) re-export their public surface from the application layer so presentation code does not access domain or infrastructure folders directly.

## Consequences

### Positive

- Architectural guardrails run locally and in CI (`pnpm lint:boundaries`).
- Dependency violations are caught at lint time instead of during review.
- Shared composition root simplifies server routes and enables test harnesses to swap infrastructure clients.
- Teams can reason about ownership: domain `@domain` stays immutable, while features surface stable APIs via `@features/*`.

### Trade-offs

- Requires ongoing maintenance of the Biome overrides when adding new layers or directories.
- Developers must learn the centralized container pattern (documented in `src/infrastructure/config/README.md`).
- Some legacy modules may need shims while the migration completes (tracked in `tasks.md`).

### Follow-up Work

- Expand container bindings to expose common application use-cases (US3 scope).
- Extend Biome rules (Task T032) to forbid ad-hoc root directories.
- Update onboarding docs (`specs/010-layered-architecture-refactor/quickstart.md`) with the new commands and directory structure.
