# Development Guide

## Prerequisites

- Node.js 18+ and pnpm
- Git with lefthook configured
- OpenAI API key
- PostHog project key (optional)
- Sentry DSN (optional)

## Project Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd InterviewApp
pnpm install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp env.example .env.local

# Set required variables
OPENAI_API_KEY=your_openai_api_key
POSTHOG_KEY=your_posthog_key
SENTRY_DSN=your_sentry_dsn
```

### 3. Development Tools Setup

```bash
# Install git hooks
pnpm lefthook install

# Verify setup
pnpm fix:all
```

## Project Structure

```
src/lib/llm/
├── domain/                 # Business logic
│   ├── entities/          # Domain models
│   ├── interfaces/        # Contracts
│   └── services/          # Business services
├── application/           # Use cases
│   ├── use-cases/         # Business use cases
│   └── services/          # Application services
├── infrastructure/        # External dependencies
│   ├── openai/           # OpenAI adapters
│   ├── analytics/        # PostHog integration
│   ├── monitoring/       # Sentry integration
│   └── retry/            # Retry logic
└── types/                # TypeScript types
```

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/llm-feedback-enhancement

# Make changes
# ... implement feature ...

# Run tests
pnpm test

# Fix linting issues
pnpm fix:all

# Commit changes
git add .
git commit -m "feat(llm): add new feedback feature"
```

### 2. Code Quality Checks

```bash
# Run all quality checks
pnpm fix:all

# Individual checks
pnpm lint          # ESLint/Biome
pnpm type-check    # TypeScript
pnpm test          # Vitest
pnpm build         # Build verification
```

### 3. Testing Strategy

#### Unit Tests

```typescript
// tests/unit/llm/FeedbackService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { FeedbackService } from '@/features/scheduling/llm/domain/services/FeedbackService';

describe('FeedbackService', () => {
  it('should generate feedback for valid input', async () => {
    const service = new FeedbackService();
    const result = await service.generateFeedback({
      content: 'Test content',
      question: 'Test question'
    });

    expect(result.score).toBeGreaterThan(0);
    expect(result.strengths).toBeDefined();
  });
});
```

#### Integration Tests

```typescript
// tests/integration/llm/evaluation.test.ts
import { describe, it, expect } from 'vitest';
import { EvaluateSubmissionUseCase } from '@/features/scheduling/llm/application/use-cases/EvaluateSubmissionUseCase';

describe('Evaluation Integration', () => {
  it('should complete full evaluation flow', async () => {
    const useCase = new EvaluateSubmissionUseCase(/* dependencies */);
    const result = await useCase.execute({
      content: 'Test response',
      question: 'Tell me about yourself'
    });

    expect(result.status).toBe('completed');
    expect(result.feedback).toBeDefined();
  });
});
```

#### API Tests

```typescript
// tests/api/evaluate.test.ts
import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/evaluate/route';

describe('/api/evaluate', () => {
  it('should evaluate text submission', async () => {
    const request = new Request('http://localhost/api/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Test content',
        question: 'Test question'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.submissionId).toBeDefined();
  });
});
```

## Coding Standards

### 1. TypeScript Guidelines

```typescript
// Use strict typing
interface EvaluationRequest {
  content: string;
  question: string;
  context?: {
    role?: string;
    company?: string;
  };
}

// Prefer interfaces over types for objects
interface ILLMAdapter {
  generateFeedback(request: EvaluationRequest): Promise<Feedback>;
}

// Use enums for constants
enum EvaluationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
```

### 2. Error Handling

```typescript
// Custom error classes
class EvaluationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'EvaluationError';
  }
}

// Proper error handling
try {
  const result = await useCase.execute(request);
  return result;
} catch (error) {
  if (error instanceof EvaluationError) {
    throw error; // Re-throw domain errors
  }

  // Log and wrap infrastructure errors
  logger.error('Unexpected error in evaluation', { error });
  throw new EvaluationError(
    'Evaluation failed',
    'INTERNAL_ERROR',
    500
  );
}
```

### 3. Async/Await Patterns

```typescript
// Prefer async/await over Promises
async function processEvaluation(request: EvaluationRequest): Promise<Feedback> {
  try {
    const transcription = await transcribeAudio(request.audioUrl);
    const feedback = await generateFeedback(transcription);
    await trackAnalytics('evaluation_completed', { requestId: request.id });
    return feedback;
  } catch (error) {
    await trackAnalytics('evaluation_failed', { error: error.message });
    throw error;
  }
}
```

### 4. Validation Patterns

```typescript
// Use Zod for validation
import { z } from 'zod';

const EvaluationRequestSchema = z.object({
  content: z.string().optional(),
  audioUrl: z.url().optional(),
  question: z.string().min(1).max(1000),
  context: z.object({
    role: z.string().optional(),
    company: z.string().optional(),
  }).optional(),
}).refine(
  (data) => data.content || data.audioUrl,
  { message: "Either content or audioUrl must be provided" }
);

// Validate in API routes
export async function POST(request: NextRequest) {
  const body = await request.json();
  const validation = EvaluationRequestSchema.safeParse(body);

  if (!validation.success) {
    return createErrorResponse(
      'Invalid request data',
      'VALIDATION_ERROR',
      400,
      validation.error.issues
    );
  }

  // Process validated data
}
```

## API Development

### 1. Route Structure

```typescript
// src/app/api/evaluate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { EvaluateSubmissionUseCase } from '@/features/scheduling/llm/application/use-cases/EvaluateSubmissionUseCase';

export async function POST(request: NextRequest) {
  try {
    const useCase = new EvaluateSubmissionUseCase(/* dependencies */);
    const result = await useCase.execute(await request.json());
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
```

### 2. Proxy Integration

```typescript
// src/proxy.ts
import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  // Authentication check
  if (request.nextUrl.pathname.startsWith('/api/evaluate')) {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}
```

### 3. Error Handling

```typescript
// src/lib/api/error-handler.ts
export function handleError(error: unknown): NextResponse {
  if (error instanceof EvaluationError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message
        }
      },
      { status: error.statusCode }
    );
  }

  // Log unexpected errors
  logger.error('Unexpected API error', { error });

  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    },
    { status: 500 }
  );
}
```

## Testing Guidelines

### 1. Test Structure

```typescript
// Follow AAA pattern: Arrange, Act, Assert
describe('FeedbackService', () => {
  describe('generateFeedback', () => {
    it('should return structured feedback', async () => {
      // Arrange
      const service = new FeedbackService();
      const request = {
        content: 'Test content',
        question: 'Test question'
      };

      // Act
      const result = await service.generateFeedback(request);

      // Assert
      expect(result).toMatchObject({
        score: expect.any(Number),
        strengths: expect.any(Array),
        improvements: expect.any(Array)
      });
    });
  });
});
```

### 2. Mocking External Services

```typescript
// Mock OpenAI API
vi.mock('@/features/scheduling/llm/infrastructure/openai/OpenAITextAdapter', () => ({
  OpenAITextAdapter: vi.fn().mockImplementation(() => ({
    generateFeedback: vi.fn().mockResolvedValue({
      score: 85,
      strengths: ['Good communication'],
      improvements: ['More examples needed']
    })
  }))
}));
```

### 3. Test Data Factories

```typescript
// tests/factories/EvaluationRequestFactory.ts
export class EvaluationRequestFactory {
  static create(overrides: Partial<EvaluationRequest> = {}): EvaluationRequest {
    return {
      content: 'Test interview response',
      question: 'Tell me about yourself',
      context: {
        role: 'Software Engineer',
        company: 'Tech Corp'
      },
      ...overrides
    };
  }
}
```

## Debugging

### 1. Local Development

```bash
# Start development server with debugging
pnpm dev --inspect

# Run tests with debugging
pnpm test --inspect
```

### 2. Logging

```typescript
// Use structured logging
import { logger } from '@/infrastructure/logging/logger';

logger.info('Evaluation started', {
  submissionId,
  userId,
  questionType,
  timestamp: new Date().toISOString()
});

logger.error('Evaluation failed', {
  submissionId,
  error: error.message,
  stack: error.stack
});
```

### 3. Environment Variables

```bash
# Development debugging
DEBUG=llm:* pnpm dev

# Test debugging
DEBUG=llm:test pnpm test
```

## Performance Optimization

### 1. Caching

```typescript
// Implement caching for expensive operations
class CachedFeedbackService {
  private cache = new Map<string, Feedback>();

  async generateFeedback(request: EvaluationRequest): Promise<Feedback> {
    const cacheKey = this.generateCacheKey(request);

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const feedback = await this.llmAdapter.generateFeedback(request);
    this.cache.set(cacheKey, feedback);
    return feedback;
  }
}
```

### 2. Async Processing

```typescript
// Use background processing for long operations
export async function POST(request: NextRequest) {
  const submissionId = generateId();

  // Start background processing
  processEvaluationAsync(submissionId, requestData);

  // Return immediately with status
  return NextResponse.json({
    submissionId,
    status: 'processing'
  });
}
```

## Deployment

### 1. Environment Setup

```bash
# Production environment variables
OPENAI_API_KEY=prod_key
POSTHOG_KEY=prod_key
SENTRY_DSN=prod_dsn
NODE_ENV=production
```

### 2. Build Process

```bash
# Build for production
pnpm build

# Verify build
pnpm start
```

### 3. Health Checks

```typescript
// Implement health check endpoint
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      openai: await checkOpenAIConnection(),
      database: await checkDatabaseConnection()
    }
  };

  return NextResponse.json(health);
}
```

## Troubleshooting

### Common Issues

1. **OpenAI API Errors**
   - Check API key validity
   - Verify rate limits
   - Check network connectivity

2. **TypeScript Errors**
   - Run `pnpm type-check`
   - Check import paths
   - Verify type definitions

3. **Test Failures**
   - Check mock implementations
   - Verify test data
   - Check async/await usage

### Debug Commands

```bash
# Check TypeScript compilation
pnpm type-check

# Run specific test file
pnpm test tests/unit/llm/FeedbackService.test.ts

# Check linting issues
pnpm lint --fix

# Verify build
pnpm build
```

## Contributing

1. Follow the coding standards
2. Write comprehensive tests
3. Update documentation
4. Use conventional commits
5. Create pull requests with clear descriptions

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Vitest Testing Guide](https://vitest.dev/guide/)
- [Zod Validation](https://zod.dev/)
