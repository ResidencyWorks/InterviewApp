# Quickstart: Layered Architecture Refactor

1. **Checkout feature branch**
   - `git fetch && git checkout 010-layered-architecture-refactor`

2. **Install dependencies**
   - `pnpm install`
   - Ensure devcontainer rebuilds with Node.js LTS, Biome, and lefthook enabled.

3. **Run baseline quality gates**
   - `pnpm biome lint` to confirm formatting rules.
   - `pnpm lint:boundaries` (new command) to exercise ESLint boundary config.
   - `pnpm test:unit` to verify existing domain/application tests pass without environment configuration.

4. **Apply structure migration**
   - Move `lib/*` assets into the appropriate `src/domain`, `src/application`, `src/infrastructure`, `src/presentation`, or `src/shared` directories.
   - Scaffold feature modules under `src/features/<feature>/` with `domain/`, `application/`, `infrastructure/`, `presentation/`.
   - Update import paths to use aliases defined in `tsconfig.json`.

5. **Wire composition root**
   - Consolidate environment parsing and client factories inside `src/infrastructure/config`.
   - Expose a `createAppContainer()` function that presentation handlers consume.

6. **Document layers**
   - Add `README.md` (or similar guidance) to each layer directory summarizing responsibilities and allowed dependencies.
   - Record ADR outlining dependency rules at repository root.

7. **Verify test segmentation**
   - Co-locate unit tests with domain/application modules (`*.unit.spec.ts`).
  - Relocate integration tests to `src/infrastructure/__tests__`.
   - Ensure Playwright e2e specs reference presentation entry points only.

8. **Run full suite before PR**
   - `pnpm biome check`
   - `pnpm lint:boundaries`
   - `pnpm test:unit`
   - `pnpm test:integration`
   - `pnpm test:e2e`
