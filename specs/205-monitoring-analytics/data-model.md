# Data Model: Monitoring & Analytics

**Feature**: 005-monitoring-analytics
**Date**: 2025-01-27
**Purpose**: Define core entities and their relationships for the monitoring and analytics system

## Core Entities

### AnalyticsEvent

**Purpose**: Represents a user action or system event tracked for analytics

**Attributes**:

- `id: string` - Unique identifier for the event
- `event: string` - Event name (e.g., "drill_started", "drill_submitted")
- `userId?: string` - ID of the user who triggered the event
- `sessionId: string` - Session identifier for grouping related events
- `timestamp: Date` - When the event occurred
- `properties: Record<string, any>` - Event-specific properties
- `context: EventContext` - Additional context about the event
- `metadata: EventMetadata` - Technical metadata about the event

**Validation Rules**:

- `event` must be non-empty string and match predefined event types
- `sessionId` must be non-empty string
- `timestamp` must be valid Date
- `properties` must be serializable to JSON
- `context` must contain valid context information

**State Transitions**:

- `created` → `queued` → `transmitted` | `failed` | `buffered`

### EventContext

**Purpose**: Provides additional context about the analytics event

**Attributes**:

- `browser?: string` - Browser information
- `os?: string` - Operating system information
- `device?: string` - Device type (mobile, desktop, tablet)
- `url?: string` - URL where event occurred
- `referrer?: string` - Referring URL
- `userAgent?: string` - User agent string
- `screenResolution?: string` - Screen resolution
- `timezone?: string` - User timezone

**Validation Rules**:

- All string fields must be non-empty if provided
- `url` must be valid URL if provided
- `screenResolution` must match format "WIDTHxHEIGHT" if provided

### EventMetadata

**Purpose**: Technical metadata about the analytics event

**Attributes**:

- `version: string` - Application version
- `environment: string` - Environment (development, staging, production)
- `buildId?: string` - Build identifier
- `deploymentId?: string` - Deployment identifier
- `source: string` - Source of the event (client, server, api)
- `retryCount: number` - Number of retry attempts
- `transmissionId?: string` - ID for tracking transmission

**Validation Rules**:

- `version` must be valid semantic version
- `environment` must be one of: development, staging, production
- `source` must be one of: client, server, api
- `retryCount` must be non-negative integer

### ErrorEvent

**Purpose**: Represents an error captured by the monitoring system

**Attributes**:

- `id: string` - Unique identifier for the error
- `message: string` - Error message
- `stack?: string` - Stack trace
- `severity: ErrorSeverity` - Severity level of the error
- `category: ErrorCategory` - Category of the error
- `userId?: string` - ID of the user who encountered the error
- `sessionId?: string` - Session identifier
- `timestamp: Date` - When the error occurred
- `context: ErrorContext` - Additional context about the error
- `tags: Record<string, string>` - Tags for error classification
- `fingerprint?: string` - Error fingerprint for grouping

**Validation Rules**:

- `message` must be non-empty string
- `severity` must be valid ErrorSeverity enum value
- `category` must be valid ErrorCategory enum value
- `timestamp` must be valid Date
- `tags` must contain only string values

**State Transitions**:

- `captured` → `processed` → `transmitted` | `failed` | `ignored`

### ErrorContext

**Purpose**: Provides additional context about the error

**Attributes**:

- `url?: string` - URL where error occurred
- `userAgent?: string` - User agent string
- `browser?: string` - Browser information
- `os?: string` - Operating system information
- `device?: string` - Device type
- `userId?: string` - User ID (if available)
- `sessionId?: string` - Session ID
- `requestId?: string` - Request ID for API errors
- `component?: string` - React component name (for client errors)
- `action?: string` - User action that triggered error

**Validation Rules**:

- All string fields must be non-empty if provided
- `url` must be valid URL if provided

### MonitoringConfig

**Purpose**: Represents the configuration for monitoring services

**Attributes**:

- `posthog: PostHogConfig` - PostHog configuration
- `sentry: SentryConfig` - Sentry configuration
- `environment: string` - Current environment
- `debug: boolean` - Debug mode flag
- `retention: RetentionConfig` - Data retention configuration
- `performance: PerformanceConfig` - Performance monitoring configuration

**Validation Rules**:

- `environment` must be valid environment name
- `debug` must be boolean
- All nested config objects must be valid

### PostHogConfig

**Purpose**: PostHog-specific configuration

**Attributes**:

- `apiKey: string` - PostHog API key
- `host?: string` - PostHog host URL
- `personProfiles: boolean` - Enable person profiles
- `capturePageView: boolean` - Enable automatic page view capture
- `capturePageLeave: boolean` - Enable page leave capture
- `disableSessionRecording: boolean` - Disable session recording
- `batchSize: number` - Event batch size
- `flushInterval: number` - Flush interval in milliseconds

**Validation Rules**:

- `apiKey` must be non-empty string
- `host` must be valid URL if provided
- `batchSize` must be positive integer
- `flushInterval` must be positive integer

### SentryConfig

**Purpose**: Sentry-specific configuration

**Attributes**:

- `dsn: string` - Sentry DSN
- `environment: string` - Sentry environment
- `release?: string` - Application release version
- `sampleRate: number` - Error sampling rate (0-1)
- `tracesSampleRate: number` - Performance sampling rate (0-1)
- `beforeSend?: string` - Before send hook function name
- `beforeBreadcrumb?: string` - Before breadcrumb hook function name
- `integrations: string[]` - Enabled integrations

**Validation Rules**:

- `dsn` must be valid Sentry DSN
- `environment` must be non-empty string
- `sampleRate` must be between 0 and 1
- `tracesSampleRate` must be between 0 and 1

### RetentionConfig

**Purpose**: Data retention configuration

**Attributes**:

- `errorLogsDays: number` - Error log retention in days
- `analyticsDataDays: number` - Analytics data retention in days
- `userDataAnonymizationDays: number` - User data anonymization after days
- `performanceDataDays: number` - Performance data retention in days

**Validation Rules**:

- All day values must be positive integers
- `userDataAnonymizationDays` must be less than `analyticsDataDays`

### PerformanceConfig

**Purpose**: Performance monitoring configuration

**Attributes**:

- `maxApiLatencyMs: number` - Maximum API latency threshold
- `maxPageLoadMs: number` - Maximum page load threshold
- `enablePerformanceMonitoring: boolean` - Enable performance monitoring
- `enableWebVitals: boolean` - Enable Web Vitals tracking
- `enableTransactionTracing: boolean` - Enable transaction tracing

**Validation Rules**:

- Latency values must be positive integers
- Boolean values must be valid booleans

## Enums

### ErrorSeverity

- `CRITICAL` - Critical errors that cause system failure
- `ERROR` - Errors that affect functionality
- `WARNING` - Warnings that don't affect functionality
- `INFO` - Informational messages
- `DEBUG` - Debug information

### ErrorCategory

- `CLIENT_ERROR` - Client-side JavaScript errors
- `SERVER_ERROR` - Server-side errors
- `NETWORK_ERROR` - Network-related errors
- `VALIDATION_ERROR` - Data validation errors
- `AUTHENTICATION_ERROR` - Authentication errors
- `AUTHORIZATION_ERROR` - Authorization errors
- `RATE_LIMIT_ERROR` - Rate limiting errors
- `EXTERNAL_SERVICE_ERROR` - External service errors

## Relationships

### AnalyticsEvent → EventContext (1:1)

- Each analytics event has exactly one context
- Context provides additional information about the event
- Context is created when event is created

### AnalyticsEvent → EventMetadata (1:1)

- Each analytics event has exactly one metadata
- Metadata provides technical information about the event
- Metadata is created when event is created

### ErrorEvent → ErrorContext (1:1)

- Each error event has exactly one context
- Context provides additional information about the error
- Context is created when error is captured

### MonitoringConfig → PostHogConfig (1:1)

- Each monitoring config has exactly one PostHog config
- PostHog config is required for analytics functionality
- Config is loaded from environment variables

### MonitoringConfig → SentryConfig (1:1)

- Each monitoring config has exactly one Sentry config
- Sentry config is required for error tracking
- Config is loaded from environment variables

## Data Flow

1. **Event Creation**: User action triggers analytics event creation
2. **Context Gathering**: System gathers additional context and metadata
3. **Validation**: Event is validated against schema
4. **Queuing**: Event is queued for transmission
5. **Transmission**: Event is transmitted to PostHog
6. **Confirmation**: Transmission success/failure is recorded

## Validation Schemas

### AnalyticsEvent Schema

```typescript
const AnalyticsEventSchema = z.object({
  id: z.uuid(),
  event: z.enum(['drill_started', 'drill_submitted', 'score_returned', 'content_pack_loaded']),
  userId: z.uuid().optional(),
  sessionId: z.string().min(1),
  timestamp: z.date(),
  properties: z.record(z.any()).optional(),
  context: EventContextSchema,
  metadata: EventMetadataSchema
});
```

### ErrorEvent Schema

```typescript
const ErrorEventSchema = z.object({
  id: z.uuid(),
  message: z.string().min(1),
  stack: z.string().optional(),
  severity: z.enum(['CRITICAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG']),
  category: z.enum(['CLIENT_ERROR', 'SERVER_ERROR', 'NETWORK_ERROR', 'VALIDATION_ERROR', 'AUTHENTICATION_ERROR', 'AUTHORIZATION_ERROR', 'RATE_LIMIT_ERROR', 'EXTERNAL_SERVICE_ERROR']),
  userId: z.uuid().optional(),
  sessionId: z.string().optional(),
  timestamp: z.date(),
  context: ErrorContextSchema,
  tags: z.record(z.string()),
  fingerprint: z.string().optional()
});
```

### MonitoringConfig Schema

```typescript
const MonitoringConfigSchema = z.object({
  posthog: PostHogConfigSchema,
  sentry: SentryConfigSchema,
  environment: z.enum(['development', 'staging', 'production']),
  debug: z.boolean(),
  retention: RetentionConfigSchema,
  performance: PerformanceConfigSchema
});
```

## Error Handling

### Event Validation Errors

- Invalid event structure
- Missing required fields
- Invalid data types
- Schema validation failures

### Transmission Errors

- Network connectivity issues
- Service unavailability
- Rate limiting
- Authentication failures

### Configuration Errors

- Missing environment variables
- Invalid configuration values
- Service initialization failures
- Permission issues

## Performance Considerations

- **Event Batching**: Events are batched for efficient transmission
- **Async Processing**: Event transmission is asynchronous to prevent blocking
- **Circuit Breakers**: Prevent cascading failures during service outages
- **Local Buffering**: Events are buffered locally when services are unavailable
- **Retry Logic**: Failed transmissions are retried with exponential backoff
- **Performance Monitoring**: Monitoring overhead is tracked and optimized
