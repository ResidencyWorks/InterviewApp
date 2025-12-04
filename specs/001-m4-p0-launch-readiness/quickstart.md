# Quickstart: M4 P0 Launch Readiness Implementation

**Feature**: M4 P0 Launch Readiness - PHI Compliance, Documentation & Operational Readiness
**Date**: 2025-01-27
**Phase**: Phase 1 - Design & Contracts

## Overview

This guide provides step-by-step instructions for implementing PHI scrubbing, data redaction, documentation, and operational readiness features for launch.

## Prerequisites

- TypeScript 5.x with strict mode
- Next.js 16 App Router
- Existing analytics (PostHog) and error tracking (Sentry) infrastructure
- Access to Supabase database
- Redis/BullMQ queue infrastructure

## Implementation Steps

### Step 1: Create PHI Scrubber Utility

**File**: `src/shared/security/phi-scrubber.ts`

```typescript
/**
 * PHI scrubbing utility for removing personally identifiable information
 * from user-submitted text before storage.
 */
export class PhiScrubber {
  // Email pattern: RFC 5322 compliant
  private static readonly EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  // Phone pattern: US format with optional country code
  private static readonly PHONE_PATTERN = /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;

  /**
   * Scrub user input text, removing email addresses and phone numbers
   * @param text - User-submitted text that may contain PHI
   * @returns Scrubbed text with PHI replaced by placeholders
   */
  static scrubUserInput(text: string): string {
    let scrubbed = text;

    // Replace email addresses
    scrubbed = scrubbed.replace(this.EMAIL_PATTERN, '[EMAIL_REDACTED]');

    // Replace phone numbers
    scrubbed = scrubbed.replace(this.PHONE_PATTERN, '[PHONE_REDACTED]');

    return scrubbed;
  }

  /**
   * Check if text contains PHI
   * @param text - Text to check
   * @returns True if PHI detected
   */
  static isPhiPresent(text: string): boolean {
    return this.EMAIL_PATTERN.test(text) || this.PHONE_PATTERN.test(text);
  }
}
```

**Testing**:
```typescript
// Unit test
describe('PhiScrubber', () => {
  it('should scrub email addresses', () => {
    const input = 'Contact me at user@example.com';
    const result = PhiScrubber.scrubUserInput(input);
    expect(result).toBe('Contact me at [EMAIL_REDACTED]');
    expect(result).not.toContain('@');
  });

  it('should scrub phone numbers', () => {
    const input = 'Call me at 555-123-4567';
    const result = PhiScrubber.scrubUserInput(input);
    expect(result).toBe('Call me at [PHONE_REDACTED]');
  });
});
```

---

### Step 2: Create Data Scrubber Utility

**File**: `src/shared/security/data-scrubber.ts`

```typescript
/**
 * Data scrubbing utility for removing PII from objects before
 * transmission to analytics and error tracking services.
 */
export class DataScrubber {
  private static readonly PHI_FIELDS = [
    'email', 'emailAddress', 'userEmail',
    'name', 'fullName', 'full_name', 'userName',
    'phone', 'phoneNumber', 'phone_number',
    'address', 'street', 'zip', 'postalCode',
  ];

  /**
   * Recursively scrub object, removing PII fields
   * @param obj - Object that may contain PII
   * @returns Scrubbed object with PII fields redacted
   */
  static scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
    const scrubbed = { ...obj };

    for (const key of Object.keys(scrubbed)) {
      const lowerKey = key.toLowerCase();

      // Check if field name indicates PII
      if (this.PHI_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
        scrubbed[key] = '[REDACTED]';
      }
      // Recursively scrub nested objects
      else if (typeof scrubbed[key] === 'object' && scrubbed[key] !== null && !Array.isArray(scrubbed[key])) {
        scrubbed[key] = this.scrubObject(scrubbed[key] as Record<string, unknown>);
      }
      // Recursively scrub arrays of objects
      else if (Array.isArray(scrubbed[key])) {
        scrubbed[key] = (scrubbed[key] as unknown[]).map(item =>
          typeof item === 'object' && item !== null
            ? this.scrubObject(item as Record<string, unknown>)
            : item
        );
      }
    }

    return scrubbed;
  }
}
```

**Testing**:
```typescript
describe('DataScrubber', () => {
  it('should scrub email fields', () => {
    const input = { userEmail: 'test@example.com', userId: '123' };
    const result = DataScrubber.scrubObject(input);
    expect(result.userEmail).toBe('[REDACTED]');
    expect(result.userId).toBe('123');
  });

  it('should scrub nested objects', () => {
    const input = { user: { email: 'test@example.com', name: 'John' } };
    const result = DataScrubber.scrubObject(input);
    expect(result.user.email).toBe('[REDACTED]');
    expect(result.user.name).toBe('[REDACTED]');
  });
});
```

---

### Step 3: Integrate PHI Scrubber into API Routes

**File**: `src/app/api/evaluations/route.ts`

```typescript
import { PhiScrubber } from '@/shared/security/phi-scrubber';

export async function POST(request: NextRequest) {
  // ... existing validation code ...

  const payload = parsed.data;

  // Scrub response_text before saving
  const scrubbedResponseText = PhiScrubber.scrubUserInput(payload.response_text);

  const insertPayload = {
    // ... other fields ...
    response_text: scrubbedResponseText, // Use scrubbed text
  };

  // ... rest of implementation ...
}
```

**Repeat for**:
- `src/app/api/submit-text/route.ts`
- `src/app/api/text-submit/route.ts`

---

### Step 4: Integrate Data Scrubber into Sentry

**File**: `instrumentation-client.ts`

```typescript
import { DataScrubber } from '@/shared/security/data-scrubber';

Sentry.init({
  // ... existing config ...

  beforeSend(event, _hint) {
    // Scrub user data
    if (event.user) {
      event.user = DataScrubber.scrubObject(event.user as Record<string, unknown>) as SentryUser;
    }

    // Scrub contexts
    if (event.contexts) {
      event.contexts = DataScrubber.scrubObject(event.contexts as Record<string, unknown>) as Record<string, unknown>;
    }

    // Scrub extra data
    if (event.extra) {
      event.extra = DataScrubber.scrubObject(event.extra as Record<string, unknown>) as Record<string, unknown>;
    }

    return event;
  },
});
```

---

### Step 5: Integrate Data Scrubber into PostHog

**File**: `src/features/notifications/infrastructure/posthog/AnalyticsService.ts`

```typescript
import { DataScrubber } from '@/shared/security/data-scrubber';

async track(
  eventName: string,
  properties?: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  // Scrub properties
  const scrubbedProperties = properties
    ? DataScrubber.scrubObject(properties)
    : {};

  // Anonymize distinctId (ensure not email)
  const distinctId = userId && !userId.includes('@')
    ? userId
    : `anon_${crypto.randomUUID()}`;

  this.posthog.capture({
    distinctId,
    event: eventName,
    properties: scrubbedProperties,
  });
}
```

---

### Step 6: Create Content Pack Missing Banner

**File**: `src/components/content/ContentPackMissingBanner.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { analytics } from '@/features/notifications/application/analytics';

export function ContentPackMissingBanner() {
  const [isMissing, setIsMissing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/system/status')
      .then(res => res.json())
      .then(data => {
        const missing = data.contentPack?.isActive === false;
        setIsMissing(missing);

        if (missing) {
          analytics.track('content_pack_missing', {
            timestamp: new Date().toISOString(),
          });
        }
      })
      .catch(() => {
        // Silently fail - don't break UI if status check fails
      });
  }, []);

  if (!isMissing || dismissed) return null;

  return (
    <Alert variant="warning" className="mb-4">
      <AlertTitle>Content Pack Not Loaded</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>The matchready_content_pack is not available. Using fallback content.</span>
        <button
          onClick={() => setDismissed(true)}
          className="ml-4 text-sm underline"
        >
          Dismiss
        </button>
      </AlertDescription>
    </Alert>
  );
}
```

**Integrate into Layout**: `src/app/(dashboard)/layout.tsx`

```typescript
import { ContentPackMissingBanner } from '@/components/content/ContentPackMissingBanner';

export default function DashboardLayout({ children }) {
  return (
    <>
      <ContentPackMissingBanner />
      {children}
    </>
  );
}
```

---

### Step 7: Create Documentation Files

**File**: `docs/performance/latency-budget.md`

```markdown
# Latency Budget

Target: p95 < 10 seconds for evaluation requests

**Component Breakdown:**
- Transcription: ~2-3s (Whisper API)
- LLM Evaluation: ~3-5s (GPT-4)
- Database write: <500ms
- Queue overhead: <500ms
- PHI scrubbing: <100ms

**Monitoring**: Health endpoint tracks p95 latency
**Alerting**: Exceeds 10s triggers performance alert
```

**File**: `docs/operations/cost-control.md`

```markdown
# Cost Control Mechanisms

**Model Selection**: GPT-4 for quality, consider GPT-3.5-turbo for cost reduction

**Batching**: Queue processes one job at a time (concurrency=1) to prevent cost spikes

**Redis TTL**: 1-hour TTL for active content pack cache, 2-hour for content packs

**Idempotency**: Prevents duplicate LLM calls via request ID check

**Rate Limiting**: 60 RPM per API key (configurable via RATE_LIMIT_RPM)

**Caching**: Evaluation results cached to avoid re-processing
```

**File**: `docs/operations/failover-rollback-runbook.md`

[See full runbook content in specification document]

**File**: `README.md` (add SLA section)

```markdown
## Support & SLA

### Critical Bug Response SLA

During the initial 30-day launch window, critical bugs will be addressed within 72 hours of report.

**Critical Bug Definition:**
- Application unavailable or major functionality broken
- Data loss or corruption
- Security vulnerabilities
- Performance degradation (>50% slower than baseline)

**Response Timeline:**
- Acknowledgment: Within 4 hours
- Initial assessment: Within 24 hours
- Resolution or workaround: Within 72 hours
```

---

## Testing Checklist

- [ ] Unit tests for `PhiScrubber` (email, phone patterns)
- [ ] Unit tests for `DataScrubber` (nested objects, arrays)
- [ ] Integration test: Submit evaluation with PHI, verify scrubbed in database
- [ ] Integration test: Analytics event with PII, verify scrubbed in PostHog
- [ ] Integration test: Error log with PII, verify scrubbed in Sentry
- [ ] E2E test: Content pack missing banner displays correctly
- [ ] Performance test: Scrubbing adds <100ms latency

## Verification

1. **PHI Scrubbing**: Submit text with email/phone, check database contains placeholders
2. **Analytics**: Check PostHog events contain no email addresses in properties
3. **Error Tracking**: Check Sentry events contain no PII in user/context fields
4. **Content Pack Banner**: Disable content pack, verify banner appears
5. **Documentation**: Verify all documentation files created and accessible

## Next Steps

After implementation:
1. Run full test suite
2. Perform manual testing of all user flows
3. Review Sentry/PostHog dashboards to verify scrubbing
4. Update QA checklist with test results
5. Create proof attachments document
