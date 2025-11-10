# Legacy Scripts Guidelines

As part of the layered architecture refactor we discovered one-off scripts under `tests/integration/load/**` and other ad-hoc folders. This document captures how to handle such scripts going forward.

## Goals

- Preserve useful historical scripts (e.g., k6 load tests) without letting them bypass the new layer/feature structure.
- Provide a clear landing zone for future migration work.
- Prevent new ad-hoc root directories from appearing in the repository.

## Approved Locations

| Script Type | Destination | Notes |
|-------------|-------------|-------|
| Load / stress tests | `tests/integration/load/` | Must include README with invocation instructions. Ensure they do not run during default CI (`pnpm test:integration`). |
| One-off data migrations | `scripts/migrations/<timestamp>-<name>.ts` | Include idempotency safeguards and dry-run flag. |
| Debug utilities | `scripts/debug/<feature>/<utility>.ts` | Clearly log that the script is unsupported in production. |

## Archiving Legacy Scripts

1. Move orphaned scripts out of root-level folders (e.g., `/tests/load`) into one of the approved destinations above.
2. Add a short README or docstring explaining:
   - Source task or ticket
   - Expected execution frequency (one-off, manual, cron)
   - Required environment variables
   - Safe rollback strategy
3. Tag scripts that require manual review before use with a warning header:

```ts
/**
 * ⚠️ Legacy Script
 * Verify environment variables and backups before executing.
 */
```

## Sunsetting

- Delete scripts that reference pre-refactor paths (e.g., `src/lib/**`) once their functionality is replaced.
- Document the removal in the relevant feature README or ADR when applicable.
- If a script is no longer relevant but useful for historical context, move it to `docs/legacy-scripts/<name>.md` with a summary instead of keeping executable code.
