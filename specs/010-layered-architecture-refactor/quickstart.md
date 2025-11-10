# Quickstart: Layered Architecture Refactor

1. **Checkout feature branch**
   - `git fetch && git checkout 010-layered-architecture-refactor`

2. **Install dependencies**
   - `pnpm install`
   - Ensure devcontainer rebuilds with Node.js LTS, Biome, and lefthook enabled.

3. **Run baseline quality gates**
   - `pnpm lint` to validate formatting and static analysis.
   - `pnpm lint:boundaries` to enforce layered dependency rules configured in `biome.json`.
   - `pnpm test:unit` and `pnpm test:integration` for fast feedback by layer.
   - `pnpm test:e2e` (Playwright) for presentation coverage when needed.

4. **Apply structure migration**
   - Move `lib/*` assets into the appropriate `src/domain`, `src/application`, `src/infrastructure`, `src/presentation`, or `src/shared` directories.
   - Scaffold feature modules under `src/features/<feature>/` with `domain/`, `application/`, `infrastructure/`, `presentation/`.
   - Update import paths to use canonical aliases (`@domain/*`, `@app/*`, `@infra/*`, `@presentation/*`, `@shared/*`, `@features/*`).

5. **Wire composition root**
   - Use `src/infrastructure/config/environment.ts` for Zod-validated environment variables.
   - Access infrastructure clients via `src/infrastructure/config/clients.ts`.
   - Retrieve shared dependencies in presentation code through `createAppContainer()` from `src/infrastructure/config/container.ts`.

6. **Document layers**
   - Add `README.md` (or similar guidance) to each layer directory summarizing responsibilities and allowed dependencies.
   - Record ADR outlining dependency rules at repository root.

7. **Verify test segmentation**
   - Keep unit tests under `tests/unit/**` and integration tests under `tests/integration/**`.
   - Store Playwright specs in `tests/e2e/**` and run via `pnpm test:e2e`.
   - Share fixtures through `tests/fixtures/**` where needed.

8. **Run full suite before PR**
   - `pnpm check:all`
   - `pnpm lint:boundaries`
   - `pnpm test:unit`
   - `pnpm test:integration`
   - `pnpm test:e2e`
