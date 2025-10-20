# Research: Content Pack Loader

**Feature**: 002-content-pack-loader
**Date**: 2025-01-27
**Purpose**: Resolve technical unknowns and establish implementation patterns

## Research Tasks

### 1. File Upload and Validation Patterns

**Task**: Research file upload patterns for Next.js with drag-and-drop UI and Zod validation

**Decision**: Use Next.js API routes with multer for file handling, react-dropzone for drag-and-drop UI, and Zod for schema validation

**Rationale**:

- Next.js API routes provide server-side file handling with proper security
- multer handles multipart form data efficiently
- react-dropzone provides excellent UX for drag-and-drop functionality
- Zod provides runtime validation with TypeScript integration

**Alternatives considered**:

- Client-side only validation: Insufficient security, can be bypassed
- Third-party file upload services: Additional cost and complexity
- Custom file upload implementation: More development time and maintenance

**Implementation details**:

- Use `multer` for file upload handling in API routes
- Use `react-dropzone` for drag-and-drop UI component
- Implement Zod schemas for content pack validation
- Add file size limits (10MB) and type validation (JSON only)
- Implement progress indicators for large file uploads

### 2. Hot-Swap Content Management

**Task**: Research patterns for hot-swapping content in memory without application restart

**Decision**: Use in-memory singleton service with atomic content replacement and event-driven updates

**Rationale**:

- Singleton pattern ensures single source of truth for active content
- Atomic replacement prevents partial state during updates
- Event-driven updates notify dependent services of content changes
- Memory-based approach provides fastest access times

**Alternatives considered**:

- Database-based content storage: Slower access, requires DB queries
- File system watching: Complex setup, platform-dependent
- External content service: Additional infrastructure complexity

**Implementation details**:

- Create `ContentPackManager` singleton service
- Implement atomic content replacement with rollback capability
- Use EventEmitter for content change notifications
- Add content versioning and metadata tracking
- Implement graceful degradation when content is unavailable

### 3. Role-Based Access Control with Supabase

**Task**: Research Supabase role-based access control patterns for admin-only features

**Decision**: Use Supabase RLS (Row Level Security) with custom admin roles and JWT-based authentication

**Rationale**:

- Supabase RLS provides database-level security
- JWT tokens enable stateless authentication
- Custom roles allow fine-grained permission control
- Integrates well with existing Supabase auth system

**Alternatives considered**:

- Custom auth system: More development time and security concerns
- Third-party auth providers: Additional cost and complexity
- Simple API key authentication: Less secure, no user management

**Implementation details**:

- Create `admin` and `developer` roles in Supabase
- Implement RLS policies for content pack management
- Use Supabase client for role verification in API routes
- Add middleware for admin route protection
- Implement role-based UI component rendering

### 4. PostHog Analytics Integration

**Task**: Research PostHog event tracking patterns for content pack operations

**Decision**: Use PostHog client-side and server-side tracking with structured event schemas

**Rationale**:

- PostHog provides comprehensive analytics and event tracking
- Both client and server tracking ensure complete coverage
- Structured event schemas enable better data analysis
- Integrates with existing project monitoring setup

**Alternatives considered**:

- Custom analytics solution: More development time and maintenance
- Google Analytics: Less detailed event tracking capabilities
- No analytics: Poor visibility into feature usage

**Implementation details**:

- Track events: `content_pack_uploaded`, `content_pack_validated`, `content_pack_activated`, `content_pack_failed`
- Include metadata: version, timestamp, file size, validation duration
- Implement error tracking for failed operations
- Add user identification for admin actions
- Use PostHog's feature flags for gradual rollout

### 5. Error Handling and Monitoring

**Task**: Research error handling patterns for file operations with Sentry integration

**Decision**: Use structured error types with Sentry context and graceful degradation

**Rationale**:

- Structured errors provide better debugging information
- Sentry context helps trace issues across file operations
- Graceful degradation maintains system stability
- Integrates with existing error tracking setup

**Alternatives considered**:

- Generic error handling: Insufficient context for debugging
- No error tracking: Poor observability and debugging experience
- Custom error reporting: More development time and maintenance

**Implementation details**:

- Custom error types: `ValidationError`, `UploadError`, `ActivationError`, `PermissionError`
- Sentry context: user ID, file name, file size, operation type
- Implement retry logic for transient failures
- Add error boundaries for UI error handling
- Log detailed error information for debugging

### 6. Devcontainer Integration

**Task**: Research devcontainer integration patterns for content pack loader setup

**Decision**: Use devcontainer with custom setup scripts and environment configuration

**Rationale**:

- Devcontainer ensures consistent development environment
- Setup scripts automate configuration and dependencies
- Environment configuration enables easy customization
- Integrates with existing devcontainer setup

**Alternatives considered**:

- Manual setup instructions: Error-prone and time-consuming
- Docker Compose: More complex for development workflow
- No containerization: Environment inconsistencies

**Implementation details**:

- Add content pack loader setup script to devcontainer
- Configure file upload limits and validation settings
- Set up test content packs for development
- Add environment variables for configuration
- Include development tools and debugging utilities

### 7. Content Pack Schema Design

**Task**: Research JSON schema design patterns for content pack validation

**Decision**: Use Zod schemas with versioned content pack structure and comprehensive validation

**Rationale**:

- Zod provides TypeScript-first schema validation
- Versioned structure enables backward compatibility
- Comprehensive validation prevents runtime errors
- Clear error messages aid debugging

**Alternatives considered**:

- JSON Schema: More verbose and less TypeScript integration
- Manual validation: Error-prone and maintenance heavy
- No validation: Runtime errors and poor developer experience

**Implementation details**:

```typescript
const ContentPackSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  metadata: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    author: z.string().min(1),
    createdAt: z.string().datetime(),
    tags: z.array(z.string()).optional()
  }),
  questions: z.array(QuestionSchema).min(1),
  evaluationCriteria: z.array(CriteriaSchema).min(1),
  settings: z.object({
    timeLimit: z.number().positive().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional()
  }).optional()
});
```

## Research Summary

All technical unknowns have been resolved with concrete implementation decisions. The Content Pack Loader will use:

1. **File Upload**: Next.js API routes with multer and react-dropzone
2. **Hot-Swap**: In-memory singleton service with atomic replacement
3. **Access Control**: Supabase RLS with custom admin roles
4. **Analytics**: PostHog with structured event tracking
5. **Error Handling**: Structured errors with Sentry integration
6. **Devcontainer**: Custom setup scripts and environment configuration
7. **Validation**: Zod schemas with versioned content pack structure

These decisions align with the project constitution and provide a robust, secure, and maintainable content pack management system.

## Clarifications Resolved

Based on the research, the following clarifications from the spec have been resolved:

1. **Content Pack Persistence**: Content packs will be stored in memory for hot-swapping. A database table will track metadata and versions for audit purposes, but the active content remains in memory for performance.

2. **Access Control**: Admin-only access will be implemented using Supabase roles. Only users with `admin` or `developer` roles can access the content pack loader interface and API endpoints.
