# Data Model: Content Pack Loader

**Feature**: Content Pack Loader
**Date**: 2025-01-27
**Branch**: `002-content-pack-loader`

## Core Entities

### ContentPack

Represents a content pack configuration file containing evaluation criteria, content, and metadata.

```typescript
interface ContentPack {
  id: string;                    // UUID v4
  version: string;               // Semantic version (e.g., "1.2.3")
  name: string;                  // Human-readable name
  description?: string;          // Optional description
  schemaVersion: string;         // Schema version for validation
  content: ContentPackData;      // The actual content data
  metadata: ContentPackMetadata; // Additional metadata
  status: ContentPackStatus;     // Current status
  createdAt: Date;              // Creation timestamp
  updatedAt: Date;              // Last update timestamp
  activatedAt?: Date;           // When this pack was activated
  activatedBy?: string;         // User ID who activated it
  uploadedBy: string;           // User ID who uploaded it
  fileSize: number;             // Original file size in bytes
  checksum: string;             // SHA-256 hash of content
}

enum ContentPackStatus {
  UPLOADED = 'uploaded',         // Just uploaded, not validated
  VALIDATING = 'validating',     // Currently being validated
  VALID = 'valid',              // Validated successfully
  INVALID = 'invalid',          // Validation failed
  ACTIVATED = 'activated',      // Currently active in system
  ARCHIVED = 'archived'         // Replaced by newer version
}
```

### ContentPackData

The actual content data structure (flexible based on schema version).

```typescript
interface ContentPackData {
  // Structure depends on schema version
  // This is the validated JSON content from the uploaded file
  [key: string]: any;
}
```

### ContentPackMetadata

Additional metadata about the content pack.

```typescript
interface ContentPackMetadata {
  author?: string;              // Content pack author
  tags?: string[];             // Categorization tags
  dependencies?: string[];     // Required system dependencies
  compatibility?: {            // System compatibility info
    minVersion?: string;
    maxVersion?: string;
    features?: string[];
  };
  customFields?: Record<string, any>; // Additional custom metadata
}
```

### ValidationResult

Represents the outcome of content pack validation.

```typescript
interface ValidationResult {
  isValid: boolean;             // Overall validation result
  errors: ValidationError[];    // List of validation errors
  warnings: ValidationWarning[]; // List of validation warnings
  validatedAt: Date;           // When validation was performed
  validatedBy: string;         // System/user that performed validation
  schemaVersion: string;       // Schema version used for validation
  validationTimeMs: number;    // Time taken for validation
}

interface ValidationError {
  path: string;                // JSON path to the error
  message: string;             // Human-readable error message
  code: string;                // Error code for programmatic handling
  severity: 'error' | 'warning'; // Error severity
}

interface ValidationWarning {
  path: string;                // JSON path to the warning
  message: string;             // Human-readable warning message
  code: string;                // Warning code
  suggestion?: string;         // Optional suggestion for resolution
}
```

### LoadEvent

Represents the logging event sent to PostHog when content pack is successfully loaded.

```typescript
interface LoadEvent {
  event: 'content_pack_loaded';
  properties: {
    contentPackId: string;      // ID of the loaded content pack
    version: string;            // Content pack version
    schemaVersion: string;      // Schema version used
    fileSize: number;           // Original file size
    uploadDurationMs: number;   // Time from upload to activation
    validationDurationMs: number; // Time spent validating
    activatedBy: string;        // User who activated it
    previousPackId?: string;    // ID of previously active pack
    timestamp: Date;           // When the event occurred
  };
}
```

### UploadQueue

Represents the queue management system for handling concurrent content pack uploads.

```typescript
interface UploadQueue {
  id: string;                  // Queue instance ID
  currentUpload?: UploadItem;  // Currently processing upload
  pendingUploads: UploadItem[]; // Queue of pending uploads
  completedUploads: UploadItem[]; // Recently completed uploads
  maxConcurrentUploads: number; // Maximum concurrent uploads (always 1)
  createdAt: Date;            // Queue creation time
  updatedAt: Date;            // Last queue update
}

interface UploadItem {
  id: string;                  // Upload item ID
  userId: string;              // User who initiated upload
  fileName: string;            // Original file name
  fileSize: number;            // File size in bytes
  status: UploadStatus;        // Current upload status
  progress: number;            // Upload progress (0-100)
  startedAt: Date;            // When upload started
  completedAt?: Date;          // When upload completed
  error?: string;              // Error message if failed
  contentPackId?: string;      // Associated content pack ID
}

enum UploadStatus {
  QUEUED = 'queued',           // Waiting in queue
  UPLOADING = 'uploading',     // Currently uploading
  VALIDATING = 'validating',   // Currently validating
  COMPLETED = 'completed',     // Successfully completed
  FAILED = 'failed'            // Upload or validation failed
}
```

### ContentPackSchema

Represents the Zod schema definition for content pack structure validation.

```typescript
interface ContentPackSchema {
  version: string;             // Schema version
  name: string;               // Schema name
  description?: string;       // Schema description
  schema: z.ZodSchema<any>;   // The actual Zod schema
  createdAt: Date;           // When schema was created
  isActive: boolean;         // Whether this schema is currently active
  supportedVersions: string[]; // Content pack versions this schema supports
}

// Example schema structure (version 1.0.0)
const ContentPackSchemaV1 = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  content: z.object({
    evaluations: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      criteria: z.array(z.object({
        id: z.string(),
        name: z.string(),
        weight: z.number().min(0).max(1),
        description: z.string()
      })),
      questions: z.array(z.object({
        id: z.string(),
        text: z.string(),
        type: z.enum(['multiple-choice', 'text', 'rating']),
        options: z.array(z.string()).optional()
      }))
    })),
    categories: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string()
    }))
  }),
  metadata: z.object({
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),
    dependencies: z.array(z.string()).optional(),
    compatibility: z.object({
      minVersion: z.string().optional(),
      maxVersion: z.string().optional(),
      features: z.array(z.string()).optional()
    }).optional()
  })
});
```

## Database Schema (Supabase)

### content_packs table

```sql
CREATE TABLE content_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  schema_version VARCHAR(50) NOT NULL,
  content JSONB NOT NULL,
  metadata JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'uploaded',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activated_at TIMESTAMP WITH TIME ZONE,
  activated_by UUID REFERENCES auth.users(id),
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  file_size BIGINT NOT NULL,
  checksum VARCHAR(64) NOT NULL,

  -- Indexes
  CONSTRAINT content_packs_status_check CHECK (status IN ('uploaded', 'validating', 'valid', 'invalid', 'activated', 'archived')),
  CONSTRAINT content_packs_version_check CHECK (version ~ '^\d+\.\d+\.\d+$')
);

-- Indexes
CREATE INDEX idx_content_packs_status ON content_packs(status);
CREATE INDEX idx_content_packs_activated_at ON content_packs(activated_at);
CREATE INDEX idx_content_packs_uploaded_by ON content_packs(uploaded_by);
CREATE INDEX idx_content_packs_content_gin ON content_packs USING GIN(content);
CREATE UNIQUE INDEX idx_content_packs_active ON content_packs(status) WHERE status = 'activated';
```

### validation_results table

```sql
CREATE TABLE validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_pack_id UUID REFERENCES content_packs(id) ON DELETE CASCADE,
  is_valid BOOLEAN NOT NULL,
  errors JSONB,
  warnings JSONB,
  validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  validated_by VARCHAR(255) NOT NULL,
  schema_version VARCHAR(50) NOT NULL,
  validation_time_ms INTEGER NOT NULL
);

-- Indexes
CREATE INDEX idx_validation_results_content_pack_id ON validation_results(content_pack_id);
CREATE INDEX idx_validation_results_validated_at ON validation_results(validated_at);
```

### upload_queue table

```sql
CREATE TABLE upload_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  content_pack_id UUID REFERENCES content_packs(id),

  CONSTRAINT upload_queue_status_check CHECK (status IN ('queued', 'uploading', 'validating', 'completed', 'failed'))
);

-- Indexes
CREATE INDEX idx_upload_queue_user_id ON upload_queue(user_id);
CREATE INDEX idx_upload_queue_status ON upload_queue(status);
CREATE INDEX idx_upload_queue_started_at ON upload_queue(started_at);
```

## State Transitions

### ContentPack Status Flow

```
UPLOADED → VALIDATING → VALID → ACTIVATED
    ↓           ↓           ↓
  INVALID   INVALID    ARCHIVED
```

**Transition Rules**:
- `UPLOADED` → `VALIDATING`: When validation starts
- `VALIDATING` → `VALID`: When validation succeeds
- `VALIDATING` → `INVALID`: When validation fails
- `VALID` → `ACTIVATED`: When content pack is activated
- `ACTIVATED` → `ARCHIVED`: When a new content pack is activated
- `VALID` → `ARCHIVED`: When a new content pack is activated (without being activated)

### Upload Status Flow

```
QUEUED → UPLOADING → VALIDATING → COMPLETED
   ↓         ↓           ↓
 FAILED   FAILED     FAILED
```

**Transition Rules**:
- `QUEUED` → `UPLOADING`: When upload processing starts
- `UPLOADING` → `VALIDATING`: When file upload completes
- `VALIDATING` → `COMPLETED`: When validation succeeds
- Any status → `FAILED`: When an error occurs

## Validation Rules

### Content Pack Validation

1. **File Format**: Must be valid JSON
2. **File Size**: Must be ≤ 10MB
3. **Schema Compliance**: Must match current schema version
4. **Required Fields**: All required fields must be present
5. **Data Types**: All fields must match expected types
6. **Business Rules**: Custom validation rules (e.g., unique IDs, valid ranges)

### Upload Validation

1. **User Authentication**: User must be authenticated admin
2. **File Type**: Must be JSON file
3. **File Size**: Must be ≤ 10MB
4. **Rate Limiting**: Max 5 uploads per user per hour
5. **Queue Capacity**: Max 10 pending uploads per user

## Relationships

### Content Pack Relationships

- **One-to-Many**: ContentPack → ValidationResult (one pack can have multiple validation attempts)
- **One-to-Many**: User → ContentPack (one user can upload multiple packs)
- **One-to-One**: ContentPack → UploadItem (one pack per upload)
- **One-to-Many**: User → UploadItem (one user can have multiple uploads)

### System Relationships

- **One-to-One**: System → ContentPack (only one active content pack at a time)
- **One-to-Many**: ContentPack → LoadEvent (one pack can generate multiple load events)
- **One-to-One**: UploadQueue → UploadItem (one current upload per queue)
