# Layered Architecture Refactor — Migration & Rollback Plan

_Last updated: 2025-11-09_

## Migration Objectives

1. Flatten `src/lib/` into explicit Onion Architecture layers (`src/domain`, `src/application`, `src/infrastructure`, `src/app`, `src/presentation`, `src/shared`).
2. Introduce feature modules (`src/features/<feature>/{domain,application,infrastructure,presentation}`) for booking, scheduling, auth, billing, and notifications.
3. Enforce dependency boundaries via TypeScript path aliases and Biome lint rules.
4. Centralize startup/configuration logic and layer-specific documentation.

## Phase Breakdown

| Phase | Scope | Key Deliverables |
|-------|-------|------------------|
| P0: Setup | Documentation & planning | Inventory of `src/lib`, migration playbook (this document) |
| P1: Skeleton | Directory scaffolding | Canonical layer folders, README guidelines |
| P2: Layer Migration (US1) | Move shared logic into canonical layers | Re-home `lib` code, update imports, remove legacy `src/lib` |
| P3: Feature Modules (US2) | Vertical slices | Feature folder scaffolding, migrate feature-specific logic, update presentation imports |
| P4: Boundary Enforcement (US3) | Tooling & tests | TypeScript aliases, Biome rules, test suite segmentation, startup composition root |
| P5: Polish | Cross-cutting | Quickstart/docs updates, legacy script guidelines, cross-feature playbook |

## Execution Guidelines

- **Incremental commits**: Complete one subdirectory migration per commit to ease code review.
- **Test-first**: Run `pnpm biome lint`, `pnpm lint:boundaries`, and unit tests prior to moving files; follow red-green-refactor during adjustments.
- **Documentation parity**: Update layer README files immediately after relocating code.
- **Ownership**: Assign feature modules to responsible squads before migration to avoid drift.

## Rollback Plan

1. **Commit boundaries**: Maintain granular commits per layer/feature to allow `git revert` if unexpected regressions occur.
2. **Backup branch**: Preserve `main` or a dedicated snapshot branch (`pre-layered-refactor`) for quick fallback.
3. **Restore procedure**:
   - `git checkout pre-layered-refactor`
   - `git revert <migration commit range>` or `git reset --hard pre-layered-refactor`
   - Re-run CI pipeline to ensure stability.
4. **Data integrity**: Since refactor is structural, no database migrations are expected. If external clients (Supabase/PostHog) change, document reconfiguration steps separately.

## Risk Mitigation

- **Import Breakage**: Use TypeScript project references and alias linting to surface miswired imports immediately.
- **In-flight work**: Coordinate merges via feature flags or temporary compatibility exports inside `src/lib` until dependent branches are rebased.
- **Runtime Regressions**: Execute Playwright smoke tests after each major migration to confirm presentation layer wiring.
- **Legacy Scripts**: Archive or document unsupported scripts to prevent reintroduction during cleanup.

## Communication Plan

- Weekly architecture sync reviewing migration status.
- Real-time progress board mapping `src/lib` directories to target layers.
- Post-migration ADR summarizing new dependency rules (`docs/architecture/adr-layered-dependency-rules.md`).

Keep this plan updated as tasks complete or new risks emerge.
