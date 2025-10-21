# Supabase TypeScript Types

This document explains how to use and generate TypeScript types for your Supabase database in the InterviewApp project.

## Overview

The project uses Supabase for database operations and has been configured with TypeScript type generation to ensure type safety across your application. All Supabase clients are configured to use the generated types.

## Files Structure

```
src/
├── types/
│   └── database.types.ts          # Generated Supabase database types
└── lib/
    └── supabase/
        ├── client.ts              # Browser/client-side Supabase client
        ├── server.ts              # Server-side Supabase client
        └── middleware.ts          # Middleware Supabase client (Edge Runtime)
```

## Generating Types

### Prerequisites

1. **Supabase CLI**: Already installed as a dev dependency
2. **Docker**: Required for local development (install Docker Desktop)
3. **Supabase Project**: Either local or remote project configured

### Local Development

To generate types from your local Supabase instance:

```bash
# Start local Supabase (requires Docker)
npx supabase start

# Generate types from local database
pnpm run update-types
```

### Remote Project

To generate types from your remote Supabase project:

1. **Login to Supabase CLI**:
   ```bash
   npx supabase login
   ```

2. **Set your project reference**:
   ```bash
   export PROJECT_REF="your-project-id"
   ```

3. **Generate types**:
   ```bash
   pnpm run update-types:remote
   ```

### Manual Generation

You can also generate types manually:

```bash
# Local
npx supabase gen types typescript --local > src/types/database.types.ts

# Remote
npx supabase gen types typescript --project-id "YOUR_PROJECT_ID" > src/types/database.types.ts
```

## Using Types in Your Code

### Basic Usage

All Supabase clients are already configured with types. You can use them directly:

```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// TypeScript will now provide autocomplete and type checking
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('email', 'user@example.com')
```

### Type Helpers

The generated types include helpful utility types:

```typescript
import type { Database, Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

// Get row type for a table
type User = Tables<'users'>

// Get insert type for a table
type NewUser = TablesInsert<'users'>

// Get update type for a table
type UserUpdate = TablesUpdate<'users'>
```

### Example Usage

```typescript
import { createClient } from '@/lib/supabase/client'
import type { Tables, TablesInsert } from '@/types/database.types'

const supabase = createClient()

// Type-safe user creation
async function createUser(userData: TablesInsert<'users'>) {
  const { data, error } = await supabase
    .from('users')
    .insert(userData)
    .select()
    .single()

  if (error) throw error
  return data
}

// Type-safe user fetching
async function getUser(id: string): Promise<Tables<'users'> | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}
```

## Configuration

### Package.json Scripts

The following scripts have been added to `package.json`:

- `update-types`: Generate types from local Supabase instance
- `update-types:remote`: Generate types from remote Supabase project

### Client Configuration

All Supabase clients are configured with the `Database` type:

- **Client-side** (`src/lib/supabase/client.ts`): Uses `createBrowserClient<Database>`
- **Server-side** (`src/lib/supabase/server.ts`): Uses `createServerClient<Database>`
- **Middleware** (`src/lib/supabase/middleware.ts`): Uses `createServerClient<Database>`

## Best Practices

1. **Regular Updates**: Update types whenever you modify your database schema
2. **Version Control**: Commit the generated types file to version control
3. **CI/CD Integration**: Consider adding type generation to your CI/CD pipeline
4. **Type Safety**: Always use the generated types for database operations

## Troubleshooting

### Docker Issues

If you encounter Docker-related errors:

1. Install Docker Desktop
2. Start Docker Desktop
3. Run `npx supabase start` to start local services

### CLI Issues

If the Supabase CLI is not found:

```bash
# Reinstall the CLI
pnpm add -D supabase@latest

# Or use npx
npx supabase@latest gen types typescript --local > src/types/database.types.ts
```

### Type Errors

If you encounter type errors after generating new types:

1. Restart your TypeScript language server
2. Clear Next.js cache: `rm -rf .next`
3. Rebuild the project: `pnpm build`

## Resources

- [Supabase TypeScript Documentation](https://supabase.com/docs/guides/api/rest/generating-types)
- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [TypeScript with Supabase](https://supabase.com/docs/guides/api/rest/generating-types)
