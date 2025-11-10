# API Reference

## Base URL

All API endpoints are prefixed with `/api/evaluate`

## Authentication

The API uses session-based authentication. Users must be logged in to access evaluation endpoints.

## Endpoints

### POST /api/evaluate

Submit content for AI-powered evaluation.

#### Request Body

```typescript
interface EvaluationRequest {
  // Content to evaluate (text or audio)
  content?: string;           // Text content for evaluation
  audioUrl?: string;          // URL to audio file for evaluation
  
  // Context information
  question: string;           // The interview question being answered
  context?: {
    role?: string;            // Job role being interviewed for
    company?: string;         // Company name
    level?: string;           // Seniority level (junior, mid, senior)
    [key: string]: unknown;   // Additional context
  };
  
  // Optional parameters
  submissionId?: string;      // Custom submission ID
  metadata?: Record<string, unknown>; // Additional metadata
}
```

#### Response

```typescript
interface EvaluationResponse {
  submissionId: string;       // Unique submission identifier
  status: 'completed' | 'processing' | 'failed';
  feedback: {
    score: number;            // Overall score (0-100)
    strengths: string[];      // Identified strengths
    improvements: string[];   // Areas for improvement
    detailedAnalysis: string; // Comprehensive analysis
    suggestions: string[];    // Specific recommendations
  };
  metadata: {
    processingTime: number;   // Time taken in milliseconds
    model: string;            // AI model used
    timestamp: string;        // ISO timestamp
  };
}
```

#### Example Request

```bash
curl -X POST /api/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I have 5 years of experience in full-stack development...",
    "question": "Tell me about your experience",
    "context": {
      "role": "Senior Software Engineer",
      "company": "TechCorp",
      "level": "senior"
    }
  }'
```

#### Example Response

```json
{
  "submissionId": "sub_123456789",
  "status": "completed",
  "feedback": {
    "score": 85,
    "strengths": [
      "Clear articulation of technical experience",
      "Good use of specific examples",
      "Demonstrates growth mindset"
    ],
    "improvements": [
      "Could provide more quantifiable achievements",
      "Consider mentioning leadership experience"
    ],
    "detailedAnalysis": "The candidate demonstrates strong technical knowledge...",
    "suggestions": [
      "Include specific metrics in your examples",
      "Highlight any team leadership or mentoring experience"
    ]
  },
  "metadata": {
    "processingTime": 2340,
    "model": "gpt-4o",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### GET /api/evaluate/{submissionId}/status

Get the current status of an evaluation request.

#### Path Parameters

- `submissionId` (string): The unique submission identifier

#### Response

```typescript
interface StatusResponse {
  submissionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: {
    current: number;          // Current step (0-100)
    total: number;           // Total steps
    message: string;         // Status message
  };
  result?: EvaluationResponse; // Available when status is 'completed'
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  estimatedCompletion?: string; // ISO timestamp
}
```

#### Example Response

```json
{
  "submissionId": "sub_123456789",
  "status": "processing",
  "progress": {
    "current": 60,
    "total": 100,
    "message": "Analyzing response content..."
  },
  "estimatedCompletion": "2024-01-15T10:32:00Z"
}
```

## Error Responses

All endpoints return consistent error responses:

```typescript
interface ErrorResponse {
  error: {
    code: string;            // Error code
    message: string;         // Human-readable message
    details?: Record<string, unknown>; // Additional context
  };
  timestamp: string;         // ISO timestamp
  requestId: string;         // Unique request identifier
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Invalid request data
- `AUTHENTICATION_REQUIRED`: User not authenticated
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `OPENAI_API_ERROR`: OpenAI API failure
- `AUDIO_PROCESSING_ERROR`: Audio transcription failure
- `EVALUATION_TIMEOUT`: Request timed out
- `INTERNAL_SERVER_ERROR`: Unexpected server error

### Example Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Content or audioUrl is required",
    "details": {
      "field": "content",
      "expected": "string"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_987654321"
}
```

## Rate Limiting

- **Text Evaluations**: 10 requests per minute per user
- **Audio Evaluations**: 5 requests per minute per user
- **Status Checks**: 30 requests per minute per user

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1642248600
```

## Webhooks (Future)

Webhook support for real-time notifications:

```typescript
interface WebhookPayload {
  event: 'evaluation.completed' | 'evaluation.failed';
  submissionId: string;
  data: EvaluationResponse | ErrorResponse;
  timestamp: string;
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { LLMFeedbackClient } from '@/features/scheduling/llm/client';

const client = new LLMFeedbackClient();

// Submit text for evaluation
const result = await client.evaluate({
  content: "My experience includes...",
  question: "Tell me about yourself",
  context: { role: "Developer" }
});

// Check status
const status = await client.getStatus(result.submissionId);
```

### Python

```python
import requests

# Submit evaluation
response = requests.post('/api/evaluate', json={
    'content': 'My experience includes...',
    'question': 'Tell me about yourself',
    'context': {'role': 'Developer'}
})

result = response.json()
```

## Testing

Use the test endpoints for development:

- `POST /api/evaluate/test` - Test evaluation with mock data
- `GET /api/evaluate/health` - Service health check

## Changelog

### v1.0.0
- Initial release with text evaluation
- Basic feedback structure
- Status tracking

### v1.1.0
- Audio evaluation support
- Enhanced error handling
- Performance improvements

### v1.2.0
- Real-time status updates
- Circuit breaker implementation
- Advanced analytics

