# Quickstart: Content Pack Loader

**Feature**: Content Pack Loader
**Date**: 2025-01-27
**Branch**: `002-content-pack-loader`

## Overview

The Content Pack Loader allows admin users to upload, validate, and hot-swap content pack JSON files without requiring application redeployment. This guide provides a quick start for developers implementing this feature.

## Prerequisites

- Node.js 18+ with pnpm
- Supabase project with PostgreSQL
- PostHog account for analytics
- Sentry account for error tracking
- Admin user access to the InterviewApp system
- Devcontainer environment (recommended)

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Admin UI      │    │   API Routes     │    │   Domain Layer  │
│   (shadcn/ui)   │◄──►│   (Next.js)      │◄──►│   (Business)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │  Infrastructure  │    │   Validation    │
                       │   (Supabase)     │    │    (Zod)        │
                       └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Analytics      │
                       │   (PostHog)      │
                       └──────────────────┘
```

## Key Components

### 1. Domain Layer (`src/lib/domain/`)

Core business logic independent of frameworks:

```typescript
// Content pack entity
export interface ContentPack {
  id: string;
  version: string;
  name: string;
  content: ContentPackData;
  status: ContentPackStatus;
  // ... other properties
}

// Content pack service
export class ContentPackService {
  constructor(
    private repository: IContentPackRepository,
    private validator: IContentPackValidator,
    private analytics: IAnalyticsService
  ) {}

  async uploadContentPack(file: File, metadata: UploadMetadata): Promise<ContentPack> {
    // Business logic for content pack upload
  }

  async activateContentPack(id: string): Promise<ContentPack> {
    // Business logic for content pack activation
  }
}
```

### 2. Infrastructure Layer (`src/lib/infrastructure/`)

External service adapters:

```typescript
// Supabase repository implementation
export class SupabaseContentPackRepository implements IContentPackRepository {
  constructor(private client: SupabaseClient) {}

  async save(contentPack: ContentPack): Promise<ContentPack> {
    // Supabase-specific implementation
  }

  async findById(id: string): Promise<ContentPack | null> {
    // Supabase-specific implementation
  }
}

// PostHog analytics implementation
export class PostHogAnalyticsService implements IAnalyticsService {
  constructor(private client: PostHog) {}

  async trackEvent(event: string, properties: Record<string, any>): Promise<void> {
    // PostHog-specific implementation with retry logic
  }
}
```

### 3. Validation Layer (`src/lib/validation/`)

Zod schema definitions:

```typescript
// Content pack schema
export const ContentPackSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  name: z.string().min(1).max(100),
  content: z.object({
    evaluations: z.array(EvaluationSchema),
    categories: z.array(CategorySchema)
  }),
  metadata: z.object({
    author: z.string().optional(),
    tags: z.array(z.string()).optional()
  })
});

// Validation service
export class ContentPackValidator implements IContentPackValidator {
  async validate(data: unknown): Promise<ValidationResult> {
    // Zod validation with detailed error reporting
  }
}
```

### 4. API Routes (`src/app/api/`)

Next.js API endpoints:

```typescript
// POST /api/content-packs
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  // Validate file type and size
  // Process upload through domain service
  // Return response
}

// POST /api/content-packs/[id]/activate
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Activate content pack through domain service
  // Log analytics event
  // Return response
}
```

### 5. Auth-Only Route Protection (`src/proxy.ts`)

Next.js proxy for route protection:

```typescript
// src/proxy.ts
import { createProxyClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createProxyClient({ req, res })

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protect admin routes
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    // Check if user has admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*', '/api/content-packs/:path*', '/api/uploads/:path*']
}
```

### 6. Admin UI (`src/app/admin/`)

React components for admin interface:

```typescript
// Content pack upload component
export function ContentPackUpload() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');

  const handleFileUpload = async (file: File) => {
    // Upload file through API
    // Track progress
    // Handle validation results
  };

  return (
    <div className="space-y-4">
      <FileUpload onUpload={handleFileUpload} />
      <UploadProgress status={uploadStatus} />
      <ValidationResults results={validationResults} />
    </div>
  );
}
```

## Implementation Steps

### Step 1: Setup Database Schema

Run the SQL migrations in Supabase:

```sql
-- Create content_packs table
CREATE TABLE content_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  -- ... other columns
);

-- Create indexes
CREATE INDEX idx_content_packs_status ON content_packs(status);
-- ... other indexes
```

### Step 2: Implement Domain Layer

Create the core business logic:

```bash
# Create domain entities
mkdir -p src/lib/domain/entities
mkdir -p src/lib/domain/services
mkdir -p src/lib/domain/repositories

# Create interfaces
touch src/lib/domain/repositories/IContentPackRepository.ts
touch src/lib/domain/services/ContentPackService.ts
```

### Step 3: Implement Infrastructure Layer

Create external service adapters:

```bash
# Create infrastructure adapters
mkdir -p src/lib/infrastructure/supabase
mkdir -p src/lib/infrastructure/posthog
mkdir -p src/lib/infrastructure/validation

# Create implementations
touch src/lib/infrastructure/supabase/ContentPackRepository.ts
touch src/lib/infrastructure/posthog/AnalyticsService.ts
touch src/lib/infrastructure/validation/ContentPackValidator.ts
```

### Step 4: Create API Routes

Implement Next.js API endpoints:

```bash
# Create API routes
mkdir -p src/app/api/content-packs
mkdir -p src/app/api/uploads

# Create route handlers
touch src/app/api/content-packs/route.ts
touch src/app/api/content-packs/[id]/activate/route.ts
touch src/app/api/uploads/route.ts
```

### Step 5: Build Admin UI

Create React components:

```bash
# Create admin components
mkdir -p src/app/admin/content-packs
mkdir -p src/components/admin
mkdir -p src/components/content-pack

# Create components
touch src/app/admin/content-packs/page.tsx
touch src/components/admin/ContentPackUpload.tsx
touch src/components/content-pack/ValidationResults.tsx
```

### Step 6: Add Tests

Implement comprehensive test coverage:

```bash
# Create test files
mkdir -p tests/unit/domain
mkdir -p tests/integration/api
mkdir -p tests/e2e/admin

# Create test files
touch tests/unit/domain/ContentPackService.test.ts
touch tests/integration/api/content-packs.test.ts
touch tests/e2e/admin/content-pack-upload.test.ts
```

## Configuration

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_sentry_auth_token

# File upload limits
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=application/json
```

### Supabase Configuration

```typescript
// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### PostHog Configuration

```typescript
// src/lib/posthog/client.ts
import posthog from 'posthog-js'

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  })
}

export { posthog }
```

### Sentry Configuration

```typescript
// src/lib/sentry/client.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // Filter out sensitive content pack data
    if (event.exception) {
      event.exception.values?.forEach(exception => {
        if (exception.value?.includes('content_pack_data')) {
          exception.value = exception.value.replace(/content_pack_data[^}]*}/g, 'content_pack_data: [FILTERED]')
        }
      })
    }
    return event
  }
})

export { Sentry }
```

### Devcontainer Configuration

```json
// .devcontainer/devcontainer.json
{
  "name": "InterviewApp Content Pack Loader",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:18",
  "features": {
    "ghcr.io/devcontainers/features/git:1": {},
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "bradlc.vscode-tailwindcss",
        "ms-vscode.vscode-typescript-next",
        "esbenp.prettier-vscode",
        "ms-vscode.vscode-json"
      ],
      "settings": {
        "typescript.preferences.importModuleSpecifier": "relative"
      }
    }
  },
  "postCreateCommand": "pnpm install",
  "remoteEnv": {
    "NEXT_PUBLIC_SUPABASE_URL": "${localEnv:SUPABASE_URL}",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "${localEnv:SUPABASE_ANON_KEY}",
    "NEXT_PUBLIC_POSTHOG_KEY": "${localEnv:POSTHOG_KEY}",
    "NEXT_PUBLIC_SENTRY_DSN": "${localEnv:SENTRY_DSN}"
  },
  "mounts": [
    "source=${localWorkspaceFolder}/sample-content-packs,target=/workspaces/InterviewApp/sample-content-packs,type=bind,consistency=cached"
  ]
}
```

## Usage Examples

### Upload Content Pack

```typescript
// Admin uploads a content pack
const formData = new FormData();
formData.append('file', file);
formData.append('name', 'Interview Questions v1.2');

const response = await fetch('/api/content-packs', {
  method: 'POST',
  body: formData,
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const result = await response.json();
console.log('Upload ID:', result.uploadId);
```

### Activate Content Pack

```typescript
// Admin activates a validated content pack
const response = await fetch(`/api/content-packs/${contentPackId}/activate`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
console.log('Activated:', result.data);
console.log('Previous pack:', result.previousPackId);
```

### Monitor Upload Progress

```typescript
// Check upload status
const response = await fetch(`/api/uploads/${uploadId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const upload = await response.json();
console.log('Status:', upload.data.status);
console.log('Progress:', upload.data.progress);
```

## Error Handling

### Validation Errors

```typescript
// Handle validation errors
try {
  const result = await contentPackService.validateContentPack(data);
  if (!result.isValid) {
    result.errors.forEach(error => {
      console.error(`Error at ${error.path}: ${error.message}`);
    });
  }
} catch (error) {
  console.error('Validation failed:', error);
}
```

### Upload Errors

```typescript
// Handle upload errors with Sentry integration
const handleUpload = async (file: File) => {
  try {
    setUploadStatus('uploading');
    const result = await uploadContentPack(file);
    setUploadStatus('completed');
  } catch (error) {
    setUploadStatus('failed');
    setErrorMessage(error.message);

    // Report error to Sentry with context
    Sentry.captureException(error, {
      tags: {
        component: 'ContentPackUpload',
        operation: 'file_upload'
      },
      extra: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }
    });
  }
};
```

### Sentry Error Tracking

```typescript
// Content pack validation error tracking
export class ContentPackValidator implements IContentPackValidator {
  async validate(data: unknown): Promise<ValidationResult> {
    try {
      const result = await this.zodSchema.parseAsync(data);
      return { isValid: true, errors: [], warnings: [] };
    } catch (error) {
      // Track validation errors with context
      Sentry.captureException(error, {
        tags: {
          component: 'ContentPackValidator',
          operation: 'schema_validation'
        },
        extra: {
          schemaVersion: this.schemaVersion,
          dataSize: JSON.stringify(data).length
        }
      });

      return {
        isValid: false,
        errors: this.formatZodErrors(error),
        warnings: []
      };
    }
  }
}
```

## Performance Considerations

### File Size Limits

- Maximum file size: 10MB
- Validation timeout: 30 seconds
- Upload timeout: 60 seconds

### Concurrent Uploads

- Only one upload processed at a time
- Queue-based processing prevents conflicts
- Progress tracking for user feedback

### Caching Strategy

- Cache validated schemas in memory
- Cache active content pack in Redis
- Implement cache invalidation on activation

## Security Considerations

### Access Control

- Admin-only access to upload endpoints
- JWT token validation for all operations
- Rate limiting: 5 uploads per hour per user

### File Validation

- JSON file type validation
- File size limits enforced
- Content structure validation with Zod
- Malicious content scanning

### Data Protection

- Content packs encrypted at rest
- Secure file system permissions
- Audit logging for all operations

## Monitoring and Observability

### Metrics to Track

- Upload success/failure rates
- Validation performance
- Activation success rates
- Error rates by operation

### Logging

- Structured logging with correlation IDs
- User action tracking
- Performance metrics
- Error details with context

### Alerting

- High error rates (>5% in 5 minutes)
- Slow validation (>5 seconds)
- Database connection failures
- PostHog logging failures

## Troubleshooting

### Common Issues

1. **Upload fails with 413 error**
   - Check file size (must be ≤10MB)
   - Verify file is valid JSON

2. **Validation fails unexpectedly**
   - Check schema version compatibility
   - Verify required fields are present
   - Review validation error messages

3. **Activation fails**
   - Ensure content pack is in 'valid' status
   - Check for concurrent activation attempts
   - Verify admin permissions

4. **PostHog events not appearing**
   - Check network connectivity
   - Verify PostHog configuration
   - Review retry mechanism logs

### Debug Mode

Enable debug logging:

```typescript
// Set debug environment variable
DEBUG=content-pack-loader:*

// Or in code
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', debugData);
}
```

## Next Steps

1. **Implement the domain layer** with core business logic
2. **Create infrastructure adapters** for Supabase and PostHog
3. **Build API routes** with proper error handling
4. **Develop admin UI** with shadcn/ui components
5. **Add comprehensive tests** with 80% coverage target
6. **Implement monitoring** and alerting
7. **Deploy to staging** for testing
8. **Production deployment** with proper rollback plan

## Resources

- [Zod Documentation](https://zod.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [PostHog Documentation](https://posthog.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [shadcn/ui Components](https://ui.shadcn.com/)
