# Research Findings: ResidencyWorks M0 Trial Implementation

**Date**: 2025-01-27
**Branch**: `006-mobile-performance-transcript-response`
**Purpose**: Resolve technical unknowns for 3-day trial delivery

## Technology Decisions

### 1. Authentication & Authorization

**Decision**: Use Supabase Email Magic Link authentication with Redis entitlement caching

**Rationale**:
- Supabase provides built-in magic link authentication that's secure and user-friendly
- Redis caching with 1-hour TTL provides fast entitlement lookups (≤50ms target)
- Existing codebase already has Supabase integration configured
- Magic links eliminate password management complexity for trial

**Alternatives considered**:
- Custom JWT implementation: Rejected due to complexity and security concerns
- Session-based auth: Rejected due to scalability and mobile compatibility issues
- OAuth providers: Rejected due to additional setup complexity for trial

**Implementation approach**:
- Use `@supabase/ssr` for server-side auth handling
- Implement Redis cache layer with Upstash for entitlement lookups
- Route protection proxy for gated content

### 2. Fake ASR Implementation

**Decision**: Implement mock speech-to-text service that returns predefined responses

**Rationale**:
- M0 trial focuses on architecture validation, not actual speech recognition
- Fake ASR allows testing of complete data flow without OpenAI API costs
- Can simulate various response scenarios (success, failure, timeout)
- Easy to replace with real Whisper API in production

**Alternatives considered**:
- Real Whisper API: Rejected due to cost and complexity for trial
- Web Speech API: Rejected due to browser compatibility and accuracy issues
- Third-party STT services: Rejected due to additional API dependencies

**Implementation approach**:
- Create mock adapter that implements same interface as real Whisper adapter
- Return realistic transcript responses based on input audio metadata
- Include configurable delay to simulate real API response times

### 3. Content Pack System

**Decision**: JSON-based content packs with hot-swap capability and versioning

**Rationale**:
- JSON format is human-readable and easy to validate
- Hot-swap allows content updates without redeployment
- Versioning enables rollback and change tracking
- Existing codebase has content pack infrastructure

**Alternatives considered**:
- Database-stored content: Rejected due to complexity and deployment overhead
- File-based without hot-swap: Rejected due to deployment friction
- YAML format: Rejected due to parsing complexity and less widespread support

**Implementation approach**:
- Zod schema validation for content pack structure
- Filesystem and Supabase dual storage for reliability
- PostHog event tracking for content pack loading
- Dry-run validation before activation

### 4. Analytics & Monitoring

**Decision**: PostHog for analytics, Sentry for error tracking

**Rationale**:
- PostHog provides comprehensive event tracking with user context
- Sentry offers detailed error monitoring and alerting
- Both services integrate well with Next.js and Vercel
- Existing codebase has both services configured

**Alternatives considered**:
- Google Analytics: Rejected due to privacy concerns and complexity
- Custom analytics: Rejected due to development overhead
- Single monitoring solution: Rejected due to different use cases

**Implementation approach**:
- PostHog events: `drill_started`, `drill_submitted`, `score_returned`, `content_pack_loaded`
- Sentry integration for client and server error capture
- User ID and session tracking for all events

### 5. Payment Integration

**Decision**: Stripe with webhook-based entitlement management

**Rationale**:
- Stripe provides reliable payment processing and webhook system
- Webhook-based approach ensures immediate entitlement activation
- Idempotent webhook handling prevents duplicate processing
- Existing codebase has Stripe integration

**Alternatives considered**:
- PayPal: Rejected due to webhook reliability concerns
- Manual entitlement management: Rejected due to operational overhead
- Database polling: Rejected due to latency and reliability issues

**Implementation approach**:
- Stripe test mode for trial environment
- Webhook endpoint with idempotency protection
- Immediate Redis cache update on successful payment
- Route gating based on entitlement level

### 6. API Response Schema

**Decision**: Zod-validated JSON responses with specific structure

**Rationale**:
- Zod provides runtime type safety and validation
- Structured responses enable consistent frontend handling
- Validation ensures data integrity and prevents runtime errors
- Existing codebase uses Zod for validation

**Alternatives considered**:
- Manual validation: Rejected due to error-prone nature
- TypeScript-only validation: Rejected due to runtime safety concerns
- JSON Schema: Rejected due to additional complexity

**Implementation approach**:
```typescript
const EvaluateResponseSchema = z.object({
  duration_s: z.number(),
  words: z.number(),
  wpm: z.number(),
  categories: z.array(z.object({
    name: z.string(),
    passFlag: z.enum(["PASS", "FLAG"]),
    note: z.string()
  })).length(7),
  what_changed: z.array(z.string()).max(3),
  practice_rule: z.string(),
  overall_score: z.number().min(0).max(100)
});
```

### 7. Mobile Performance Optimization

**Decision**: Tailwind CSS with responsive design and Next.js optimization

**Rationale**:
- Tailwind provides utility-first CSS with built-in responsive design
- Next.js App Router offers automatic code splitting and optimization
- Existing codebase uses Tailwind and shadcn/ui components
- Mobile-first approach ensures good performance on all devices

**Alternatives considered**:
- CSS-in-JS: Rejected due to runtime overhead and bundle size
- Custom CSS: Rejected due to maintenance overhead
- Other CSS frameworks: Rejected due to existing codebase consistency

**Implementation approach**:
- Responsive grid layouts with `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- Mobile navigation with `hidden md:flex` patterns
- Optimized loading states and error boundaries
- Core Web Vitals monitoring

## Performance Targets

- **Core loop**: ≤250ms for `/api/evaluate` endpoint
- **Redis lookups**: ≤50ms for entitlement checks
- **Content validation**: ≤1s for content pack loading
- **Transcript response**: <10s for complete processing
- **Mobile load**: <3s on 3G networks
- **Layout shift**: CLS <0.1

## Security Considerations

- All API keys stored in Vercel environment variables
- Server-side only OpenAI API calls
- Supabase RLS policies for data protection
- Webhook signature verification for Stripe
- Input validation and sanitization on all endpoints

## Deployment Strategy

- Vercel for hosting with automatic deployments
- Preview deployments for all PRs
- Environment variable management through Vercel dashboard
- Staging URL: `m0residencyworks.vercel.app`
- Production deployment after trial approval
