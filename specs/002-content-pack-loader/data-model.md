# Data Model: Content Pack Loader

**Feature**: 002-content-pack-loader
**Date**: 2025-01-27
**Purpose**: Define core entities and their relationships for the content pack management system

## Core Entities

### ContentPack

**Purpose**: Represents a JSON content pack containing evaluation criteria, questions, and metadata

**Attributes**:

- `id: string` - Unique identifier for the content pack
- `version: string` - Semantic version (e.g., "1.0.0")
- `metadata: ContentPackMetadata` - Metadata about the content pack
- `questions: Question[]` - Array of interview questions
- `evaluationCriteria: EvaluationCriteria[]` - Array of evaluation criteria
- `settings: ContentPackSettings` - Optional settings and configuration
- `isActive: boolean` - Whether this pack is currently active
- `uploadedAt: Date` - Timestamp when pack was uploaded
- `activatedAt?: Date` - Timestamp when pack was activated
- `fileSize: number` - Size of the original JSON file in bytes
- `checksum: string` - SHA-256 checksum of the file content

**Validation Rules**:

- `version` must follow semantic versioning (x.y.z format)
- `questions` array must have at least 1 question
- `evaluationCriteria` array must have at least 1 criterion
- `fileSize` must be positive and ≤ 10MB
- `checksum` must be valid SHA-256 hash

**State Transitions**:

- `uploaded` → `validated` → `activated` | `rejected`

### ContentPackMetadata

**Purpose**: Metadata about the content pack for tracking and organization

**Attributes**:

- `name: string` - Human-readable name of the content pack
- `description?: string` - Optional description of the content pack
- `author: string` - Author of the content pack
- `createdAt: string` - ISO datetime when pack was created
- `tags?: string[]` - Optional tags for categorization
- `category?: string` - Optional category (e.g., "technical", "behavioral")

**Validation Rules**:

- `name` must be non-empty string
- `author` must be non-empty string
- `createdAt` must be valid ISO datetime string
- `tags` array must have max 10 items if provided

### Question

**Purpose**: Represents an interview question within a content pack

**Attributes**:

- `id: string` - Unique identifier for the question
- `text: string` - The question text
- `type: QuestionType` - Type of question (open-ended, multiple-choice, etc.)
- `difficulty: DifficultyLevel` - Difficulty level of the question
- `category: string` - Category of the question
- `timeLimit?: number` - Optional time limit in seconds
- `expectedAnswer?: string` - Optional expected answer or guidance
- `keywords?: string[]` - Optional keywords for evaluation

**Validation Rules**:

- `text` must be between 10 and 1000 characters
- `type` must be valid QuestionType enum value
- `difficulty` must be valid DifficultyLevel enum value
- `timeLimit` must be positive if provided
- `keywords` array must have max 20 items if provided

### EvaluationCriteria

**Purpose**: Represents criteria for evaluating responses to questions

**Attributes**:

- `id: string` - Unique identifier for the criterion
- `name: string` - Name of the evaluation criterion
- `description: string` - Description of what this criterion measures
- `weight: number` - Weight of this criterion in overall scoring (0-1)
- `rubric: RubricLevel[]` - Rubric levels for scoring
- `isRequired: boolean` - Whether this criterion is required for evaluation

**Validation Rules**:

- `name` must be non-empty string
- `description` must be between 10 and 500 characters
- `weight` must be between 0 and 1
- `rubric` array must have at least 2 levels
- `isRequired` must be boolean

### RubricLevel

**Purpose**: Represents a level in the evaluation rubric

**Attributes**:

- `level: number` - Numeric level (e.g., 1-5)
- `name: string` - Name of the level (e.g., "Poor", "Good", "Excellent")
- `description: string` - Description of performance at this level
- `score: number` - Score associated with this level (0-100)

**Validation Rules**:

- `level` must be positive integer
- `name` must be non-empty string
- `description` must be between 5 and 200 characters
- `score` must be between 0 and 100

### ValidationResult

**Purpose**: Represents the outcome of content pack validation

**Attributes**:

- `isValid: boolean` - Whether validation passed
- `errors: ValidationError[]` - Array of validation errors
- `warnings: ValidationWarning[]` - Array of validation warnings
- `validatedAt: Date` - Timestamp when validation was performed
- `validationDuration: number` - Time taken for validation in milliseconds
- `schemaVersion: string` - Version of the schema used for validation

**Validation Rules**:

- `isValid` must be boolean
- `errors` array must be empty if `isValid` is true
- `validatedAt` must be valid Date
- `validationDuration` must be positive number
- `schemaVersion` must be valid semantic version

### ValidationError

**Purpose**: Represents a specific validation error

**Attributes**:

- `path: string` - JSON path to the invalid field
- `message: string` - Human-readable error message
- `code: string` - Error code for programmatic handling
- `severity: ErrorSeverity` - Severity level of the error
- `suggestion?: string` - Optional suggestion for fixing the error

**Validation Rules**:

- `path` must be valid JSON path string
- `message` must be non-empty string
- `code` must be valid error code
- `severity` must be valid ErrorSeverity enum value

### LoadEvent

**Purpose**: Represents the event logged to PostHog when content pack is loaded

**Attributes**:

- `eventName: string` - Name of the event (e.g., "content_pack_loaded")
- `userId: string` - ID of the user who loaded the pack
- `contentPackId: string` - ID of the loaded content pack
- `version: string` - Version of the content pack
- `timestamp: Date` - When the event occurred
- `metadata: Record<string, any>` - Additional event metadata
- `duration: number` - Time taken for the operation in milliseconds

**Validation Rules**:

- `eventName` must be non-empty string
- `userId` must be valid user ID
- `contentPackId` must be valid content pack ID
- `version` must be valid semantic version
- `timestamp` must be valid Date
- `duration` must be positive number

## Enums

### QuestionType

- `OPEN_ENDED` - Open-ended text response
- `MULTIPLE_CHOICE` - Multiple choice selection
- `CODING` - Coding challenge
- `SCENARIO` - Scenario-based question

### DifficultyLevel

- `EASY` - Easy difficulty
- `MEDIUM` - Medium difficulty
- `HARD` - Hard difficulty

### ErrorSeverity

- `ERROR` - Critical error that prevents activation
- `WARNING` - Warning that doesn't prevent activation
- `INFO` - Informational message

## Relationships

### ContentPack → Question (1:Many)

- Each content pack can have multiple questions
- Questions are scoped to their content pack
- Questions are deleted when content pack is deleted

### ContentPack → EvaluationCriteria (1:Many)

- Each content pack can have multiple evaluation criteria
- Criteria are scoped to their content pack
- Criteria are deleted when content pack is deleted

### ContentPack → ValidationResult (1:1)

- Each content pack has exactly one validation result
- Validation result is created when pack is validated
- Validation result is updated on re-validation

### ContentPack → LoadEvent (1:Many)

- Each content pack can have multiple load events
- Load events track activation history
- Load events are preserved for analytics

## Data Flow

1. **Upload**: User uploads JSON file via drag-and-drop interface
2. **Validation**: System validates file against Zod schema
3. **Storage**: Valid content pack is stored in memory and database
4. **Activation**: User confirms activation of validated pack
5. **Hot-Swap**: System replaces active content pack in memory
6. **Logging**: System logs activation event to PostHog
7. **Notification**: Dependent services are notified of content change

## Validation Schemas

### ContentPack Schema

```typescript
const ContentPackSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  metadata: ContentPackMetadataSchema,
  questions: z.array(QuestionSchema).min(1),
  evaluationCriteria: z.array(EvaluationCriteriaSchema).min(1),
  settings: ContentPackSettingsSchema.optional()
});
```

### Question Schema

```typescript
const QuestionSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(10).max(1000),
  type: z.enum(['OPEN_ENDED', 'MULTIPLE_CHOICE', 'CODING', 'SCENARIO']),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  category: z.string().min(1),
  timeLimit: z.number().positive().optional(),
  expectedAnswer: z.string().optional(),
  keywords: z.array(z.string()).max(20).optional()
});
```

### EvaluationCriteria Schema

```typescript
const EvaluationCriteriaSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().min(10).max(500),
  weight: z.number().min(0).max(1),
  rubric: z.array(RubricLevelSchema).min(2),
  isRequired: z.boolean()
});
```

## Error Handling

### Validation Errors

- Invalid JSON format
- Schema validation failures
- Missing required fields
- Invalid data types or values
- File size or format violations

### Upload Errors

- File too large (>10MB)
- Invalid file type (not JSON)
- Network timeout during upload
- Insufficient permissions

### Activation Errors

- Content pack not validated
- Concurrent activation attempts
- Memory allocation failures
- PostHog logging failures

## Performance Considerations

- **Memory Management**: Content packs are stored in memory for fast access
- **Validation Caching**: Validation results are cached to avoid re-validation
- **Atomic Updates**: Content pack replacement is atomic to prevent partial states
- **Event Batching**: PostHog events are batched to reduce API calls
- **File Cleanup**: Temporary upload files are cleaned up after processing
