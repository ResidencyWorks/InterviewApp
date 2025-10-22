# LLM Feedback Engine Documentation

## Overview

The LLM Feedback Engine is a comprehensive system that provides AI-powered interview feedback using OpenAI's GPT models. It supports text and audio submissions, real-time status tracking, and structured feedback generation.

## Features

- **AI-Powered Feedback**: Uses OpenAI GPT models to analyze interview responses
- **Multi-Modal Support**: Handles both text and audio submissions (via Whisper)
- **Real-Time Status Tracking**: Provides progress updates for long-running evaluations
- **Structured Feedback**: Returns detailed scores, strengths, and improvement suggestions
- **Error Handling**: Comprehensive retry logic and circuit breaker patterns
- **Analytics Integration**: PostHog tracking and Sentry error monitoring

## Architecture

The system follows Onion Architecture principles with clear separation of concerns:

```
src/lib/llm/
├── domain/           # Core business logic
│   ├── entities/     # Domain models
│   ├── interfaces/   # Contracts and abstractions
│   └── services/     # Business services
├── application/      # Use cases and application services
│   ├── use-cases/    # Business use cases
│   └── services/     # Application services
├── infrastructure/   # External dependencies
│   ├── openai/       # OpenAI API adapters
│   ├── analytics/    # PostHog integration
│   ├── monitoring/   # Sentry integration
│   └── retry/        # Retry and fallback logic
└── types/           # TypeScript type definitions
```

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- OpenAI API key
- PostHog project key (optional)
- Sentry DSN (optional)

### Environment Setup

```bash
# Copy environment template
cp env.example .env.local

# Set required environment variables
OPENAI_API_KEY=your_openai_api_key
POSTHOG_KEY=your_posthog_key
SENTRY_DSN=your_sentry_dsn
```

### API Usage

#### Text Evaluation

```typescript
POST /api/evaluate
Content-Type: application/json

{
  "content": "Your interview response text here",
  "question": "Tell me about yourself",
  "context": {
    "role": "Software Engineer",
    "company": "Tech Corp"
  }
}
```

#### Audio Evaluation

```typescript
POST /api/evaluate
Content-Type: application/json

{
  "audioUrl": "https://example.com/audio.mp3",
  "question": "Describe your biggest challenge",
  "context": {
    "role": "Product Manager"
  }
}
```

#### Status Tracking

```typescript
GET /api/evaluate/{submissionId}/status
```

## Documentation Structure

- [API Reference](./api-reference.md) - Complete API documentation
- [Architecture Guide](./architecture.md) - System design and patterns
- [Development Guide](./development.md) - Setup and development workflow
- [Testing Guide](./testing.md) - Testing strategies and examples
- [Deployment Guide](./deployment.md) - Production deployment
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions

## User Stories

### US1: AI-Powered Interview Feedback (MVP)
- Submit text content and receive structured feedback
- Get scores, strengths, and improvement suggestions
- Support for various interview question types

### US2: Speech-to-Text Integration
- Submit audio files for evaluation
- Automatic transcription using OpenAI Whisper
- Same feedback quality as text submissions

### US3: Evaluation Status Tracking
- Real-time progress updates for long evaluations
- Timeout handling for failed requests
- Status persistence across service restarts

## Performance Considerations

- **Rate Limiting**: Built-in OpenAI API rate limit handling
- **Caching**: Response caching for repeated evaluations
- **Retry Logic**: Exponential backoff for transient failures
- **Circuit Breaker**: Automatic fallback for API failures
- **Timeout Management**: Configurable timeouts for different operations

## Security

- **API Key Management**: Secure environment variable handling
- **Input Validation**: Comprehensive Zod schema validation
- **Error Sanitization**: No sensitive data in error responses
- **Rate Limiting**: Protection against abuse
- **Audit Logging**: Complete request/response logging

## Monitoring and Analytics

- **PostHog Integration**: User behavior and feature usage tracking
- **Sentry Integration**: Error tracking and performance monitoring
- **Custom Metrics**: Evaluation success rates and response times
- **Health Checks**: Service availability monitoring

## Contributing

See [Development Guide](./development.md) for setup instructions and coding standards.

## License

This project is part of the InterviewApp and follows the same licensing terms.

