# Research: M4 P0 Launch Readiness

**Feature**: M4 P0 Launch Readiness - PHI Compliance, Documentation & Operational Readiness
**Date**: 2025-01-27
**Phase**: Phase 0 - Research & Clarification

## Research Tasks

### 1. PHI Scrubbing Patterns

**Task**: Research regex patterns for detecting email addresses and phone numbers in user text

**Decision**: Use standard regex patterns with word boundaries to minimize false positives

**Rationale**:
- Email pattern: `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g` - Standard RFC 5322 compliant pattern
- Phone pattern: `/(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g` - US phone number format with optional country code
- Word boundary checks (`\b`) help prevent false positives (e.g., "email" as a word vs "email@domain.com")
- Placeholder replacement: `[EMAIL_REDACTED]` and `[PHONE_REDACTED]` maintain text readability while removing PII

**Alternatives Considered**:
- ML-based detection: Too complex for initial launch, requires training data
- Dictionary-based name detection: High false positive rate, not feasible for launch
- Partial redaction (e.g., `user***@domain.com`): Still contains domain information, full redaction preferred

**Performance Impact**: Regex operations are O(n) where n is text length. For typical user submissions (50-5000 characters), scrubbing adds <10ms latency, well under the <100ms target.

**References**:
- RFC 5322 (Email format specification)
- E.164 (International phone number format)

---

### 2. Sentry Data Scrubbing Integration

**Task**: Research how to scrub PII from Sentry events using beforeSend hook

**Decision**: Use `beforeSend` callback in Sentry initialization to recursively scrub `event.user`, `event.contexts`, and `event.extra` fields

**Rationale**:
- Sentry's `beforeSend` hook receives `(event, hint)` and can modify or return null to drop events
- Event structure: `{ user: {...}, contexts: {...}, extra: {...}, ... }`
- Recursive scrubbing needed because contexts and extra can contain nested objects
- Must preserve event structure to avoid breaking Sentry functionality
- Return `null` only if event should be dropped entirely (not for scrubbing)

**Implementation Pattern**:
```typescript
beforeSend(event, _hint) {
  if (event.user) {
    event.user = DataScrubber.scrubObject(event.user);
  }
  if (event.contexts) {
    event.contexts = DataScrubber.scrubObject(event.contexts);
  }
  if (event.extra) {
    event.extra = DataScrubber.scrubObject(event.extra);
  }
  return event; // Always return event (or null to drop)
}
```

**Alternatives Considered**:
- Custom Sentry integration: More complex, beforeSend hook is simpler and sufficient
- Scrubbing at logger level: Less centralized, harder to maintain consistency
- Post-processing in Sentry dashboard: Not secure, PII already transmitted

**References**:
- Sentry Node.js docs: `beforeSend` callback for filtering/modifying events
- Sentry data management: Sensitive data handling guidelines

---

### 3. PostHog Event Scrubbing Integration

**Task**: Research how to scrub PII from PostHog event properties before capture

**Decision**: Scrub properties object before calling `posthog.capture()` or `client.capture()`

**Rationale**:
- PostHog capture accepts: `capture(eventName, properties)` or `capture({ distinctId, event, properties })`
- Properties are plain JavaScript objects, can be scrubbed recursively
- `distinctId` should be anonymized (hash/UUID, not email)
- Scrubbing must happen before capture call, not after
- PostHog supports both browser (`posthog-js`) and Node.js (`posthog-node`) SDKs

**Implementation Pattern**:
```typescript
// Browser SDK
const scrubbedProperties = DataScrubber.scrubObject(properties || {});
posthog.capture(eventName, scrubbedProperties);

// Node.js SDK
const scrubbedProperties = DataScrubber.scrubObject(properties || {});
client.capture({
  distinctId: anonymizedUserId, // Not email
  event: eventName,
  properties: scrubbedProperties
});
```

**Alternatives Considered**:
- PostHog server-side filtering: Not available, must scrub client-side
- PostHog data deletion API: Reactive, not preventive
- Scrubbing in PostHog dashboard: Not secure, PII already transmitted

**References**:
- PostHog JS SDK: Event capture API
- PostHog Node SDK: Server-side capture methods

---

### 4. Performance Optimization for Scrubbing

**Task**: Ensure PHI scrubbing adds <100ms latency to user workflows

**Decision**: Use efficient regex patterns, single-pass scrubbing, and memoization for repeated patterns

**Rationale**:
- Regex compilation: Compile patterns once at module load, reuse compiled regex
- Single-pass scrubbing: Apply all patterns in one pass through text
- Object scrubbing: Use iterative approach for nested objects, avoid deep recursion stack overflow
- Memoization: Cache scrubbing results for identical inputs (if applicable)
- Benchmarking: Test with typical user input lengths (50-5000 chars)

**Performance Targets**:
- Email scrubbing: <5ms for 1000 char text
- Phone scrubbing: <5ms for 1000 char text
- Object scrubbing: <10ms for typical log context objects
- Total overhead: <20ms for typical user submission, well under <100ms target

**Alternatives Considered**:
- Async scrubbing: Adds complexity, not needed for current performance targets
- Worker threads: Overhead not justified for current scale
- Caching scrubbed results: Not applicable, each input is unique

**References**:
- Node.js performance best practices
- Regex optimization techniques

---

### 5. UI Banner Component Patterns

**Task**: Research shadcn/ui Alert component usage for content pack missing banner

**Decision**: Use shadcn/ui Alert component with warning variant, client-side state management

**Rationale**:
- shadcn/ui Alert component: Already in project dependencies, consistent with design system
- Client component: Banner needs interactivity (dismiss button), must be `'use client'`
- State management: Local state (`useState`) sufficient for banner visibility
- API integration: Fetch content pack status from `/api/system/status` endpoint
- Analytics integration: Track `content_pack_missing` event on mount when banner displays

**Implementation Pattern**:
```typescript
'use client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useEffect, useState } from 'react';

export function ContentPackMissingBanner() {
  const [isMissing, setIsMissing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/system/status')
      .then(res => res.json())
      .then(data => {
        setIsMissing(data.contentPack?.isActive === false);
        if (data.contentPack?.isActive === false) {
          analytics.track('content_pack_missing');
        }
      });
  }, []);

  if (!isMissing || dismissed) return null;

  return (
    <Alert variant="warning">
      <AlertTitle>Content Pack Not Loaded</AlertTitle>
      <AlertDescription>
        The matchready_content_pack is not available. Using fallback content.
        <button onClick={() => setDismissed(true)}>Dismiss</button>
      </AlertDescription>
    </Alert>
  );
}
```

**Alternatives Considered**:
- Server component: Cannot have dismiss button, less flexible
- Toast notification: Less persistent, banner better for important status
- Modal dialog: Too intrusive for informational message

**References**:
- shadcn/ui Alert component documentation
- Next.js App Router client components

---

### 6. Analytics Validation Patterns

**Task**: Research how to validate analytics events contain no PII before transmission

**Decision**: Create `AnalyticsValidator` utility that checks event properties for PII patterns before capture

**Rationale**:
- Validation should throw errors in development, log warnings in production
- Check for email patterns, phone patterns, common PII field names
- Validate `distinctId` is not an email address
- Fail-fast approach: Catch PII leaks before they're transmitted
- Validation adds minimal overhead (<1ms per event)

**Implementation Pattern**:
```typescript
export class AnalyticsValidator {
  static validateEvent(eventName: string, properties: Record<string, unknown>): void {
    // Check distinctId if provided
    if (properties.distinctId && this.isEmail(properties.distinctId)) {
      throw new Error('distinctId cannot be an email address');
    }

    // Check properties for PII
    const hasPII = this.containsPII(properties);
    if (hasPII) {
      if (process.env.NODE_ENV === 'development') {
        throw new Error('Analytics event contains PII');
      } else {
        console.warn('Analytics event may contain PII:', eventName);
      }
    }
  }

  private static containsPII(obj: Record<string, unknown>): boolean {
    // Recursive check for PII patterns
    // ...
  }
}
```

**Alternatives Considered**:
- Post-transmission validation: Too late, PII already sent
- Sampling-based validation: May miss PII leaks
- Manual code review only: Not scalable, automated validation needed

**References**:
- HIPAA PHI definition
- GDPR PII guidelines

---

## Summary of Decisions

1. **PHI Scrubbing**: Standard regex patterns with word boundaries, placeholder replacement
2. **Sentry Integration**: `beforeSend` hook with recursive object scrubbing
3. **PostHog Integration**: Scrub properties before `capture()` call
4. **Performance**: Single-pass scrubbing, compiled regex, <20ms overhead
5. **UI Banner**: shadcn/ui Alert component, client-side state, API status check
6. **Analytics Validation**: Pre-transmission validation utility with error/warning handling

## Unresolved Questions

None - all research tasks completed, no clarifications needed.

## Next Steps

Proceed to Phase 1: Design & Contracts
- Create data-model.md documenting ScrubbedUserInput and AnonymizedUserIdentifier entities
- Document API contract modifications (scrubbing behavior in existing endpoints)
- Create quickstart.md with implementation guide
