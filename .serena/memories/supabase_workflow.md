# Supabase Workflow and Best Practices

## Migration Management

### Always Use Supabase CLI for Migrations
- **NEVER** manually create migration files directly in `supabase/migrations/`
- **ALWAYS** use the Supabase CLI commands to generate migrations
- This ensures proper naming, ordering, and timestamp formatting

### Correct Workflow for Creating Migrations

1. **Generate a new migration file**:
   ```bash
   pnpm supabase migration new <migration_name>
   ```
   Example: `pnpm supabase migration new create_drill_progress`

2. **Edit the generated migration file** in `supabase/migrations/`
   - The CLI will create a file with proper timestamp: `YYYYMMDDHHMMSS_migration_name.sql`
   - Add your SQL DDL statements to this file

3. **Apply migrations locally** (if using local dev):
   ```bash
   pnpm supabase db push
   ```

4. **Apply migrations to remote** (production):
   ```bash
   pnpm supabase db push
   ```

### Migration Repair (if needed)
If migrations get out of sync:
```bash
pnpm supabase migration repair --status reverted <version>
pnpm supabase db pull  # to sync local with remote
```

### Type Generation
After applying migrations that change the database schema:
```bash
pnpm run update-types        # for local database
pnpm run update-types:remote # for remote database
```

This regenerates `src/types/database.types.ts` with the latest schema.

## Key Commands Reference

- `pnpm supabase migration new <name>` - Create new migration
- `pnpm supabase db push` - Apply pending migrations
- `pnpm supabase db pull` - Pull remote schema to local
- `pnpm supabase migration list` - List all migrations and their status
- `pnpm supabase migration repair` - Fix migration history issues
- `pnpm run update-types` - Regenerate TypeScript types from schema

## Why This Matters

1. **Proper Timestamps**: CLI ensures migrations are ordered correctly
2. **Version Control**: Proper naming prevents conflicts
3. **Team Sync**: Everyone uses the same migration format
4. **Type Safety**: Regenerating types keeps TypeScript in sync with database
5. **Deployment**: CI/CD pipelines expect CLI-generated migration format

## Common Mistakes to Avoid

❌ Creating files like `20251205_migration.sql` manually
❌ Skipping type regeneration after schema changes
❌ Using `as any` to bypass type errors instead of regenerating types
❌ Applying migrations via SQL Editor for permanent changes (use for hotfixes only)

✅ Use `pnpm supabase migration new` for all migrations
✅ Regenerate types after every schema change
✅ Commit both migrations and updated types together
✅ Use SQL Editor only for testing/debugging queries
