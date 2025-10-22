# API Specification: ResidencyWorks M0 Trial

**Date**: 2025-01-27
**Branch**: `006-mobile-performance-transcript-response`
**Purpose**: Define all API endpoints, request/response schemas, and contracts

## Base URL

- **Development**: `http://localhost:3000/api`
- **Staging**: `https://m0residencyworks.vercel.app/api`
- **Production**: `https://[production-url]/api`

## Authentication

All endpoints require authentication via Supabase session token in the `Authorization` header:

```
Authorization: Bearer <supabase_session_token>
```

## Common Response Format

### Success Response

```typescript
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string; // ISO 8601 format
}
```

### Error Response

```typescript
interface ApiErrorResponse {
  success: false;
  error: string; // Error code
  message: string; // Human-readable message
  details?: Record<string, unknown>; // Additional error details
  timestamp: string; // ISO 8601 format
}
```

## Endpoints

### 1. Authentication Endpoints

#### POST /api/auth/login

**Purpose**: Initiate magic link authentication

**Request**:
```typescript
interface LoginRequest {
  email: string; // Valid email address
}
```

**Response**:
```typescript
interface LoginResponse {
  message: string; // "Magic link sent to your email"
  expires_in: number; // Seconds until link expires
}
```

**Status Codes**:
- `200`: Magic link sent successfully
- `400`: Invalid email format
- `429`: Rate limit exceeded

#### POST /api/auth/logout

**Purpose**: End user session

**Request**: None (uses session token)

**Response**:
```typescript
interface LogoutResponse {
  message: string; // "Logged out successfully"
}
```

**Status Codes**:
- `200`: Logged out successfully
- `401`: Not authenticated

### 2. Evaluation Endpoints

#### POST /api/evaluate

**Purpose**: Evaluate interview drill submission

**Request**:
```typescript
interface EvaluateRequest {
  content?: string; // Text response (min 10 chars)
  audioUrl?: string; // Audio file URL or base64 data URL
  questionId: string; // Content pack question ID
  userId: string; // User ID
  metadata?: Record<string, unknown>; // Additional metadata
}
```

**Validation Rules**:
- Either `content` or `audioUrl` must be provided
- `content` must be at least 10 characters if provided
- `audioUrl` must be valid URL or base64 data URL starting with `data:audio/`
- Supported audio formats: mp3, mp4, mpeg, mpga, m4a, wav, webm

**Response**:
```typescript
interface EvaluateResponse {
  submissionId: string; // UUID
  feedback: {
    id: string; // UUID
    score: number; // 0-100
    feedback: string; // Overall feedback text
    strengths: string[]; // Array of strengths
    improvements: string[]; // Array of improvements
    generatedAt: string; // ISO 8601 timestamp
    model: string; // AI model used
    processingTimeMs: number; // Processing time in milliseconds
  };
  evaluationRequest: {
    id: string; // UUID
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    requestedAt: string; // ISO 8601 timestamp
    retryCount: number; // Number of retries attempted
  };
  status: {
    id: string; // UUID
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    progress: number; // 0-100 percentage
    message: string; // Status message
    startedAt: string; // ISO 8601 timestamp
    updatedAt: string; // ISO 8601 timestamp
    completedAt?: string; // ISO 8601 timestamp
  };
  processingTimeMs: number; // Total processing time
}
```

**Status Codes**:
- `200`: Evaluation completed successfully
- `400`: Validation error
- `401`: Not authenticated
- `403`: Insufficient entitlement
- `413`: Payload too large (>2MB)
- `429`: Rate limit exceeded
- `500`: Internal server error

#### GET /api/evaluate

**Purpose**: Get evaluation service health status

**Request**: None

**Response**:
```typescript
interface HealthResponse {
  service: string; // "llm-feedback-engine"
  version: string; // "1.0.0"
  status: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  components: {
    circuitBreaker: {
      state: "CLOSED" | "OPEN" | "HALF_OPEN";
    };
    adapters: {
      speech: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
      text: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
    };
    analytics: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
    monitoring: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  };
  timestamp: string; // ISO 8601 timestamp
}
```

**Status Codes**:
- `200`: Health status retrieved
- `500`: Health check failed

### 3. Content Pack Endpoints

#### GET /api/content-packs

**Purpose**: List content packs with filtering and pagination

**Query Parameters**:
- `status`: Filter by status (`DRAFT`, `ACTIVE`, `ARCHIVED`)
- `limit`: Number of items per page (1-100, default: 20)
- `offset`: Number of items to skip (default: 0)
- `sortBy`: Sort field (`createdAt`, `updatedAt`, `name`, `version`)
- `sortOrder`: Sort direction (`asc`, `desc`, default: `desc`)

**Response**:
```typescript
interface ContentPacksListResponse {
  data: ContentPack[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

interface ContentPack {
  id: string; // UUID
  version: string; // Semantic version
  name: string;
  description?: string;
  schemaVersion: string;
  content: ContentPackData;
  metadata?: Record<string, unknown>;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  uploadedBy: string; // User ID
  fileSize: number; // Bytes
  checksum: string; // SHA256 hash
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
  activatedAt?: string; // ISO 8601 timestamp
}
```

**Status Codes**:
- `200`: Content packs retrieved successfully
- `400`: Invalid query parameters
- `401`: Not authenticated
- `403`: Insufficient permissions (PRO required)

#### POST /api/content-packs

**Purpose**: Upload a new content pack

**Request**: Multipart form data
- `file`: JSON file (max 10MB)
- `name`: Content pack name
- `description`: Optional description

**Response**:
```typescript
interface ContentPackUploadResponse {
  data: ContentPack;
  uploadId: string; // UUID for tracking
}
```

**Status Codes**:
- `201`: Content pack uploaded successfully
- `400`: Validation error or invalid JSON
- `401`: Not authenticated
- `403`: Insufficient permissions (PRO required)
- `413`: File too large

#### GET /api/content-packs/active

**Purpose**: Get the currently active content pack

**Request**: None

**Response**:
```typescript
interface ActiveContentPackResponse {
  data: ContentPack | null;
}
```

**Status Codes**:
- `200`: Active content pack retrieved
- `401`: Not authenticated

#### POST /api/content-packs/[id]/activate

**Purpose**: Activate a content pack (hot-swap)

**Request**: None

**Response**:
```typescript
interface ActivateContentPackResponse {
  data: ContentPack;
  previousPack?: ContentPack; // Previously active pack
  message: string; // "Content pack activated successfully"
}
```

**Status Codes**:
- `200`: Content pack activated successfully
- `400`: Content pack validation failed
- `401`: Not authenticated
- `403`: Insufficient permissions (PRO required)
- `404`: Content pack not found

### 4. Webhook Endpoints

#### POST /api/webhooks/stripe

**Purpose**: Handle Stripe payment webhooks

**Request**: Stripe webhook payload with signature verification

**Response**:
```typescript
interface StripeWebhookResponse {
  received: boolean;
  eventId: string; // Stripe event ID
  processed: boolean;
  message: string;
}
```

**Status Codes**:
- `200`: Webhook processed successfully
- `400`: Invalid webhook signature or payload
- `500`: Webhook processing failed

**Supported Events**:
- `checkout.session.completed`: Grant BASIC entitlement
- `customer.subscription.updated`: Update entitlement level
- `customer.subscription.deleted`: Revoke entitlement

### 5. Analytics Endpoints

#### POST /api/analytics/track

**Purpose**: Track custom analytics events

**Request**:
```typescript
interface TrackEventRequest {
  event: string; // Event name
  properties?: Record<string, unknown>; // Event properties
  userId?: string; // Override user ID
}
```

**Response**:
```typescript
interface TrackEventResponse {
  tracked: boolean;
  eventId: string; // PostHog event ID
}
```

**Status Codes**:
- `200`: Event tracked successfully
- `400`: Invalid event data
- `401`: Not authenticated

**Predefined Events**:
- `drill_started`: User starts a drill session
- `drill_submitted`: User submits drill response
- `score_returned`: Evaluation result returned
- `content_pack_loaded`: Content pack activated

### 6. Health Check Endpoints

#### GET /api/health

**Purpose**: Overall system health check

**Request**: None

**Response**:
```typescript
interface SystemHealthResponse {
  status: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  version: string;
  timestamp: string; // ISO 8601 timestamp
  services: {
    database: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
    redis: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
    openai: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
    posthog: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
    sentry: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  };
  performance: {
    averageResponseTime: number; // Milliseconds
    errorRate: number; // Percentage
    uptime: number; // Seconds
  };
}
```

**Status Codes**:
- `200`: System healthy
- `503`: System unhealthy

## Error Codes

### Authentication Errors

- `UNAUTHORIZED`: Not authenticated or invalid token
- `TOKEN_EXPIRED`: Session token has expired
- `INVALID_CREDENTIALS`: Invalid authentication credentials

### Authorization Errors

- `FORBIDDEN`: Insufficient permissions
- `ENTITLEMENT_REQUIRED`: Valid entitlement required
- `ADMIN_REQUIRED`: Admin access required

### Validation Errors

- `VALIDATION_ERROR`: Request validation failed
- `INVALID_FORMAT`: Invalid data format
- `MISSING_REQUIRED_FIELD`: Required field missing
- `INVALID_RANGE`: Value outside valid range

### Resource Errors

- `NOT_FOUND`: Resource not found
- `ALREADY_EXISTS`: Resource already exists
- `CONFLICT`: Resource conflict

### System Errors

- `INTERNAL_SERVER_ERROR`: Unexpected server error
- `SERVICE_UNAVAILABLE`: External service unavailable
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `PAYLOAD_TOO_LARGE`: Request payload too large

## Rate Limiting

### Limits

- **Authentication**: 5 requests per minute per IP
- **Evaluation**: 10 requests per minute per user
- **Content Packs**: 5 requests per minute per user
- **Analytics**: 100 requests per minute per user

### Headers

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1640995200
```

## Performance Requirements

### Response Time Targets

- **Authentication**: < 500ms
- **Evaluation**: < 10s (with progress updates)
- **Content Packs**: < 1s
- **Health Checks**: < 200ms
- **Analytics**: < 100ms

### Reliability Targets

- **Uptime**: 99.5%
- **Error Rate**: < 1%
- **Data Consistency**: 100%

## Security Considerations

### Authentication

- All endpoints require valid Supabase session token
- Tokens expire after 24 hours
- Refresh tokens handled by Supabase

### Authorization

- Entitlement levels enforced at API level
- Row-level security in database
- Admin operations require PRO entitlement

### Data Protection

- All sensitive data encrypted in transit (HTTPS)
- PII encrypted at rest
- Audio files stored securely with access controls

### Input Validation

- All inputs validated with Zod schemas
- File uploads size-limited and type-checked
- SQL injection prevention via parameterized queries

## Monitoring and Observability

### Metrics

- Request/response times
- Error rates by endpoint
- User activity patterns
- System resource usage

### Logging

- Structured JSON logs
- Request/response correlation IDs
- Error stack traces
- Performance metrics

### Alerting

- Error rate thresholds
- Response time degradation
- Service availability
- Security incidents
