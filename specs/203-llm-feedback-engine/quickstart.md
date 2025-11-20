# Quickstart: LLM Feedback Engine

**Feature**: 003-llm-feedback-engine
**Date**: 2025-01-27
**Purpose**: Get up and running with the LLM feedback service quickly

## Overview

The LLM Feedback Engine provides AI-powered evaluation of interview submissions using OpenAI's Whisper for speech-to-text and GPT-4 for content analysis. It's designed as a framework-agnostic service that can be integrated into any application.

## Prerequisites

- Node.js 18+ with TypeScript support
- OpenAI API key with access to Whisper and GPT-4
- PostHog account for analytics
- Sentry account for error tracking

## Installation

```bash
# Install dependencies
pnpm add openai zod posthog sentry

# Install dev dependencies
pnpm add -D @types/node vitest
```

## Basic Usage

### 1. Initialize the Service

```typescript
import { LLMFeedbackService } from './lib/llm/application/services/LLMFeedbackService';
import { OpenAISpeechAdapter } from './lib/llm/infrastructure/openai/OpenAISpeechAdapter';
import { OpenAITextAdapter } from './lib/llm/infrastructure/openai/OpenAITextAdapter';

// Initialize adapters
const speechAdapter = new OpenAISpeechAdapter({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'whisper-1'
});

const textAdapter = new OpenAITextAdapter({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4'
});

// Initialize service
const feedbackService = new LLMFeedbackService({
  speechAdapter,
  textAdapter,
  retryConfig: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000
  }
});
```

### 2. Evaluate a Text Submission

```typescript
import { EvaluationRequest } from './lib/llm/types/EvaluationRequest';

const request: EvaluationRequest = {
  content: "I believe my strongest technical skill is problem-solving. I enjoy breaking down complex issues into manageable parts and finding creative solutions.",
  questionId: "q_001",
  metadata: {
    difficulty: "medium",
    category: "technical"
  }
};

try {
  const result = await feedbackService.evaluateSubmission(request);
  console.log('Score:', result.feedback.score);
  console.log('Feedback:', result.feedback.feedback);
  console.log('Strengths:', result.feedback.strengths);
  console.log('Improvements:', result.feedback.improvements);
} catch (error) {
  console.error('Evaluation failed:', error.message);
}
```

### 3. Evaluate an Audio Submission

```typescript
const audioRequest: EvaluationRequest = {
  content: "", // Will be populated from audio transcription
  audioUrl: "https://storage.example.com/audio/submission.wav",
  questionId: "q_001",
  metadata: {
    difficulty: "medium",
    category: "technical"
  }
};

try {
  const result = await feedbackService.evaluateSubmission(audioRequest);
  console.log('Transcribed content:', result.submission.content);
  console.log('Score:', result.feedback.score);
} catch (error) {
  console.error('Audio evaluation failed:', error.message);
}
```

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...
POSTHOG_API_KEY=phc_...
SENTRY_DSN=https://...

# Optional
OPENAI_WHISPER_MODEL=whisper-1
OPENAI_TEXT_MODEL=gpt-4
MAX_RETRY_ATTEMPTS=3
RETRY_BASE_DELAY=1000
CIRCUIT_BREAKER_THRESHOLD=5
```

### Service Configuration

```typescript
interface LLMFeedbackConfig {
  speechAdapter: SpeechAdapter;
  textAdapter: TextAdapter;
  retryConfig: {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    jitter: boolean;
  };
  circuitBreakerConfig: {
    threshold: number;
    timeout: number;
  };
  fallbackConfig: {
    enabled: boolean;
    defaultScore: number;
    defaultFeedback: string;
  };
}
```

## Error Handling

The service provides comprehensive error handling with different error types:

```typescript
import {
  LLMServiceError,
  ValidationError,
  RetryExhaustedError,
  CircuitBreakerError
} from './lib/llm/domain/errors';

try {
  const result = await feedbackService.evaluateSubmission(request);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid input:', error.details);
  } else if (error instanceof RetryExhaustedError) {
    console.error('All retry attempts failed:', error.attempts);
  } else if (error instanceof CircuitBreakerError) {
    console.error('Service temporarily unavailable:', error.retryAfter);
  } else if (error instanceof LLMServiceError) {
    console.error('LLM API error:', error.apiError);
  }
}
```

## Testing

### Unit Tests with Mocks

```typescript
import { describe, it, expect, vi } from 'vitest';
import { LLMFeedbackService } from './LLMFeedbackService';
import { MockSpeechAdapter, MockTextAdapter } from './test/mocks';

describe('LLMFeedbackService', () => {
  it('should evaluate text submission', async () => {
    const mockSpeechAdapter = new MockSpeechAdapter();
    const mockTextAdapter = new MockTextAdapter();

    const service = new LLMFeedbackService({
      speechAdapter: mockSpeechAdapter,
      textAdapter: mockTextAdapter,
      retryConfig: { maxAttempts: 1, baseDelay: 100, maxDelay: 1000 }
    });

    const request = {
      content: "Test submission",
      questionId: "q_001"
    };

    const result = await service.evaluateSubmission(request);

    expect(result.feedback.score).toBe(85);
    expect(result.feedback.feedback).toContain("Good response");
  });
});
```

### Integration Tests

```typescript
import { describe, it, expect } from 'vitest';
import { LLMFeedbackService } from './LLMFeedbackService';

describe('LLMFeedbackService Integration', () => {
  it('should work with real OpenAI API', async () => {
    // Use test API key for integration tests
    const service = new LLMFeedbackService({
      // ... real adapters with test API key
    });

    const request = {
      content: "This is a test submission for integration testing.",
      questionId: "q_test"
    };

    const result = await service.evaluateSubmission(request);

    expect(result.feedback.score).toBeGreaterThan(0);
    expect(result.feedback.score).toBeLessThanOrEqual(100);
    expect(result.feedback.feedback).toBeTruthy();
  });
});
```

## Monitoring and Analytics

### PostHog Events

The service automatically tracks these events:

- `llm_request_started` - When evaluation begins
- `llm_request_completed` - When evaluation succeeds
- `llm_request_failed` - When evaluation fails
- `llm_retry_attempted` - When retry is attempted
- `llm_circuit_breaker_opened` - When circuit breaker opens

### Sentry Error Tracking

Errors are automatically captured with context:

- User ID and submission ID
- Retry count and attempt number
- API response codes and error messages
- Processing time and model used

## Performance Considerations

- **Rate Limiting**: Respects OpenAI API rate limits
- **Caching**: Results can be cached to avoid re-processing
- **Batch Processing**: Multiple submissions can be processed in parallel
- **Memory Management**: Large audio files are streamed, not loaded entirely

## Next Steps

1. **Customize Feedback Prompts**: Modify the prompts used for GPT-4 evaluation
2. **Add Custom Metrics**: Track additional business metrics in PostHog
3. **Implement Caching**: Add Redis caching for frequently evaluated content
4. **Add Webhooks**: Implement webhook notifications for completed evaluations
5. **Scale Testing**: Test with high-volume concurrent requests

## Troubleshooting

### Common Issues

1. **OpenAI API Key Invalid**: Check your API key and permissions
2. **Rate Limit Exceeded**: Implement exponential backoff or reduce request frequency
3. **Audio Processing Fails**: Ensure audio file is in supported format (WAV, MP3, etc.)
4. **Memory Issues**: Use streaming for large audio files
5. **Circuit Breaker Open**: Wait for timeout period or check service health

### Debug Mode

Enable debug logging:

```typescript
const service = new LLMFeedbackService({
  // ... config
  debug: true
});
```

This will log detailed information about API calls, retries, and processing steps.
