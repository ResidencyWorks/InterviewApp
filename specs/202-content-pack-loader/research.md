# Research: Content Pack Loader

**Feature**: Content Pack Loader
**Date**: 2025-01-27
**Branch**: `002-content-pack-loader`

## Technology Decisions

### Content Pack Validation

**Decision**: Use Zod for comprehensive schema validation with versioning support

**Rationale**:
- Zod provides TypeScript-first schema validation with excellent type inference
- Built-in support for schema versioning and backward compatibility
- Integrates seamlessly with Next.js and provides clear error messages
- Supports complex validation rules and custom validators
- Performance is excellent for files up to 10MB

**Alternatives considered**:
- JSON Schema: More verbose, less TypeScript integration
- Joi: JavaScript-focused, less type safety
- Custom validation: Would require significant development effort

### Content Pack Persistence

**Decision**: Store in Supabase PostgreSQL with file system fallback

**Rationale**:
- Supabase provides managed PostgreSQL with built-in auth integration
- File system fallback ensures system resilience when database is unavailable
- PostgreSQL JSONB support is perfect for content pack storage
- Built-in real-time capabilities for future enhancements
- Follows constitution requirement for Supabase as primary database

**Alternatives considered**:
- In-memory only: Would lose data on restart
- File system only: Less queryable, no concurrent access control
- External object storage: Adds complexity without clear benefits

### Upload Queue Management

**Decision**: Implement queue-based processing with single active upload

**Rationale**:
- Prevents conflicts and race conditions during concurrent uploads
- Provides clear feedback to admin users about upload status
- Simplifies error handling and rollback scenarios
- Ensures consistent system state during content pack transitions
- Can be implemented with in-memory queue initially, database-backed later

**Alternatives considered**:
- Multiple concurrent uploads: Complex conflict resolution needed
- Last upload wins: Could lose important content packs
- Reject new uploads: Poor user experience

### Error Handling Strategy

**Decision**: Graceful degradation with retry mechanism for PostHog failures

**Rationale**:
- Content pack loading should not be blocked by analytics failures
- Exponential backoff prevents overwhelming PostHog during outages
- Maintains system functionality while preserving observability
- Follows resilience best practices for external service dependencies
- Can implement circuit breaker pattern for future enhancement

**Alternatives considered**:
- Fail on PostHog errors: Would block critical functionality
- Skip logging entirely: Would lose important analytics data
- File system logging: Adds complexity without clear benefits

### Admin Access Control

**Decision**: Admin users only via UI with authentication and auth-only route protection

**Rationale**:
- Content packs affect evaluation system behavior - requires admin privileges
- UI-based access provides better user experience than CLI
- Integrates with existing Supabase auth system with role-based access control
- Provides audit trail and user management capabilities
- Follows principle of least privilege for system modifications
- Auth-only routes ensure secure access to admin functionality

**Alternatives considered**:
- Developer access: Too broad for production systems
- Any authenticated user: Security risk for system configuration
- No access control: Major security vulnerability

## Integration Patterns

### Supabase Integration

**Pattern**: Repository pattern with interface abstraction

**Implementation**:
- Create `IContentPackRepository` interface in domain layer
- Implement `SupabaseContentPackRepository` in infrastructure layer
- Use dependency injection to provide repository to services
- Handle connection failures gracefully with fallback to file system

### PostHog Integration

**Pattern**: Event-driven logging with retry mechanism

**Implementation**:
- Create `IAnalyticsService` interface in domain layer
- Implement `PostHogAnalyticsService` in infrastructure layer
- Use exponential backoff for retry logic
- Implement circuit breaker pattern for repeated failures
- Log events asynchronously to avoid blocking main flow

### Devcontainer Integration

**Pattern**: Development environment setup with content pack loader tools

**Implementation**:
- Include content pack validation tools in devcontainer
- Pre-configure Supabase and PostHog connections for development
- Include sample content packs for testing
- Set up hot-reload for content pack changes during development
- Include debugging tools for content pack validation

### Sentry Error Integration

**Pattern**: Comprehensive error tracking with context

**Implementation**:
- Integrate Sentry SDK for client and server-side error tracking
- Capture content pack validation errors with full context
- Track upload failures with file metadata (excluding sensitive content)
- Monitor PostHog logging failures and retry attempts
- Set up alerts for critical content pack loader errors
- Include user context and content pack metadata in error reports

### File Upload Handling

**Pattern**: Stream-based processing with validation

**Implementation**:
- Use Next.js API routes with multipart form handling
- Stream file uploads to avoid memory issues with large files
- Validate file type and size before processing
- Implement progress tracking for user feedback
- Use temporary storage during validation, permanent storage after activation

## Performance Considerations

### Content Pack Validation

**Target**: ≤1 second for files up to 10MB

**Strategy**:
- Use Zod's streaming validation for large files
- Implement validation caching for repeated schema checks
- Use Web Workers for validation to avoid blocking UI
- Implement progressive validation (basic structure first, then detailed validation)

### Hot-Swap Performance

**Target**: No application redeploy required

**Strategy**:
- Load new content pack into memory before activation
- Use atomic swap to replace old content pack
- Implement rollback mechanism if activation fails
- Use event-driven architecture to notify evaluation system of changes

### Database Performance

**Target**: ≤50ms for content pack lookups

**Strategy**:
- Use PostgreSQL JSONB indexing for content pack queries
- Implement connection pooling for Supabase
- Use read replicas for content pack retrieval
- Cache frequently accessed content packs in memory

## Security Considerations

### File Upload Security

**Measures**:
- Validate file type and size before processing
- Scan uploaded files for malicious content
- Use temporary storage with automatic cleanup
- Implement rate limiting for upload endpoints
- Validate JSON structure before schema validation

### Access Control

**Measures**:
- Require admin authentication for all content pack operations
- Implement role-based access control (RBAC)
- Log all content pack operations for audit trail
- Use HTTPS for all file uploads
- Implement CSRF protection for admin endpoints

### Data Protection

**Measures**:
- Encrypt content packs at rest in Supabase
- Use secure file system permissions for fallback storage
- Implement data retention policies for old content packs
- Use secure random IDs for content pack identification
- Implement backup and recovery procedures

## Monitoring and Observability

### Metrics to Track

**Performance Metrics**:
- Content pack validation time
- Upload processing time
- Hot-swap activation time
- Database query performance
- PostHog logging success rate

**Business Metrics**:
- Number of content packs uploaded per day
- Content pack activation success rate
- Admin user activity
- Fallback usage frequency
- Error rates by operation type

### Logging Strategy

**Structured Logging**:
- Use consistent log format across all services
- Include correlation IDs for request tracing
- Log all content pack operations with user context
- Implement log aggregation with Sentry integration
- Use different log levels for different environments

### Alerting

**Critical Alerts**:
- Content pack validation failures
- Database connection failures
- PostHog logging failures (after retry exhaustion)
- File system fallback activation
- Admin authentication failures

**Warning Alerts**:
- Slow content pack validation (>5 seconds)
- High error rates (>5% in 5 minutes)
- Queue backup (multiple pending uploads)
- Database performance degradation
- PostHog retry attempts
