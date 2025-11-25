# Data Model: LLM Feedback Engine

**Feature**: 003-llm-feedback-engine
**Date**: 2025-01-27
**Purpose**: Define core entities and their relationships for the LLM feedback service

## Core Entities

### Submission

**Purpose**: Represents a user's interview submission that needs evaluation

**Attributes**:

- `id: string` - Unique identifier for the submission
- `userId: string` - ID of the user who submitted
- `content: string` - Text content of the submission
- `audioUrl?: string` - Optional audio file URL for speech-to-text
- `questionId: string` - ID of the interview question being answered
- `submittedAt: Date` - Timestamp when submission was created
- `metadata: Record<string, any>` - Additional context data

**Validation Rules**:

- `content` must be non-empty string (min 10 characters)
- `audioUrl` must be valid URL if provided
- `questionId` must be non-empty string
- `submittedAt` must be valid Date

**State Transitions**:

- `created` → `processing` → `completed` | `failed`

### Feedback

**Purpose**: Represents the AI-generated feedback for a submission

**Attributes**:

- `id: string` - Unique identifier for the feedback
- `submissionId: string` - ID of the submission this feedback relates to
- `score: number` - Numerical score (0-100)
- `feedback: string` - Detailed feedback text
- `strengths: string[]` - Array of identified strengths
- `improvements: string[]` - Array of suggested improvements
- `generatedAt: Date` - Timestamp when feedback was generated
- `model: string` - LLM model used (e.g., "gpt-4", "gpt-3.5-turbo")
- `processingTimeMs: number` - Time taken to generate feedback

**Validation Rules**:

- `score` must be between 0 and 100 (inclusive)
- `feedback` must be between 10 and 1000 characters
- `strengths` and `improvements` arrays must have max 5 items each
- `generatedAt` must be valid Date
- `processingTimeMs` must be positive number

**State Transitions**:

- `generating` → `completed` | `failed`

### EvaluationRequest

**Purpose**: Represents a request to evaluate a submission

**Attributes**:

- `id: string` - Unique identifier for the request
- `submissionId: string` - ID of the submission to evaluate
- `requestedAt: Date` - Timestamp when evaluation was requested
- `retryCount: number` - Number of retry attempts made
- `status: EvaluationStatus` - Current status of the evaluation
- `errorMessage?: string` - Error message if evaluation failed

**Validation Rules**:

- `submissionId` must be non-empty string
- `requestedAt` must be valid Date
- `retryCount` must be non-negative integer
- `status` must be valid EvaluationStatus enum value

**State Transitions**:

- `pending` → `processing` → `completed` | `failed` | `retrying`

### EvaluationStatus (Enum)

**Values**:

- `pending` - Request created, waiting to be processed
- `processing` - Currently being processed by LLM service
- `completed` - Successfully completed with feedback
- `failed` - Failed after all retry attempts
- `retrying` - Failed but will be retried

## Relationships

### Submission → Feedback (1:1)

- Each submission can have exactly one feedback
- Feedback is created after successful evaluation
- If evaluation fails, no feedback is created

### Submission → EvaluationRequest (1:1)

- Each submission can have exactly one evaluation request
- Request is created when evaluation is initiated
- Request tracks the evaluation lifecycle

### User → Submission (1:Many)

- Each user can have multiple submissions
- Submissions are scoped to the user who created them

## Data Flow

1. **Submission Creation**: User creates submission with content and optional audio
2. **Evaluation Request**: System creates evaluation request for the submission
3. **LLM Processing**: Service processes submission through Whisper (if audio) and GPT-4
4. **Feedback Generation**: System creates feedback entity with AI-generated content
5. **Completion**: Evaluation request marked as completed, feedback linked to submission

## Validation Schemas

### Submission Schema

```typescript
const SubmissionSchema = z.object({
  id: z.uuid(),
  userId: z.string().min(1),
  content: z.string().min(10),
  audioUrl: z.url().optional(),
  questionId: z.string().min(1),
  submittedAt: z.date(),
  metadata: z.record(z.any()).optional()
});
```

### Feedback Schema

```typescript
const FeedbackSchema = z.object({
  id: z.uuid(),
  submissionId: z.uuid(),
  score: z.number().min(0).max(100),
  feedback: z.string().min(10).max(1000),
  strengths: z.array(z.string()).max(5),
  improvements: z.array(z.string()).max(5),
  generatedAt: z.date(),
  model: z.string().min(1),
  processingTimeMs: z.number().positive()
});
```

### EvaluationRequest Schema

```typescript
const EvaluationRequestSchema = z.object({
  id: z.uuid(),
  submissionId: z.uuid(),
  requestedAt: z.date(),
  retryCount: z.number().int().min(0),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'retrying']),
  errorMessage: z.string().optional()
});
```

## Error Handling

### Validation Errors

- Invalid data types or formats
- Missing required fields
- Values outside allowed ranges
- Invalid relationships

### Business Logic Errors

- Submission not found
- Evaluation already in progress
- Retry limit exceeded
- LLM service unavailable

### Technical Errors

- OpenAI API failures
- Network timeouts
- Rate limiting
- Authentication failures

## Performance Considerations

- **Caching**: Feedback results can be cached to avoid re-processing identical submissions
- **Batch Processing**: Multiple submissions can be processed in parallel
- **Rate Limiting**: Respect OpenAI API rate limits with exponential backoff
- **Memory Management**: Large audio files should be streamed, not loaded entirely into memory
