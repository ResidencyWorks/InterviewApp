# M4 – P0 UX + Documentation + SLA Proof - Developer Specification

**Objective:** Finalize front-end UX, PHI scrub, documentation, and operational runbooks for launch readiness.

**Owner:** Development Team
**Date:** January 2025
**Status:** Specification

---

## Table of Contents

1. [PHI Scrub Implementation](#1-phi-scrub-implementation)
2. [Data Redaction in Logs and Analytics](#2-data-redaction-in-logs-and-analytics)
3. [Latency Budget + Cost-Control Documentation](#3-latency-budget--cost-control-documentation)
4. [Failover + Rollback Runbook](#4-failover--rollback-runbook)
5. [Critical Bug Response SLA](#5-critical-bug-response-sla)
6. [Content Pack Missing Fallback Banner](#6-content-pack-missing-fallback-banner)
7. [ClickUp Checklist Proof](#7-clickup-checklist-proof)
8. [Final Proof Attachments](#8-final-proof-attachments)

---

## 1. PHI Scrub Implementation

### Objective
Sanitize all user input before saving. Strip names, emails, or identifiable info. Validate that analytics events contain anonymized IDs only.

### Current State Analysis

**Files to Review:**
- ```1:111:src/app/api/text-submit/route.ts``` - Text submission endpoint
- ```14:142:src/app/api/submit-text/route.ts``` - Alternative text submission endpoint
- ```24:105:src/app/api/evaluations/route.ts``` - Evaluation save endpoint
- ```82:470:src/app/(dashboard)/drill/[id]/page.tsx``` - Drill interface with user input
- ```7:50:src/types/user.ts``` - User profile types containing email, full_name, phone
- ```419:456:src/types/database.ts``` - Database schema with user PII fields

**Current PHI Exposure Points:**
1. User input in `response_text` field (```65:65:src/app/api/evaluations/route.ts```)
2. User profile data (email, full_name, phone) stored in database
3. Analytics events may include user identifiers
4. Logs may contain user email/names from error contexts

### Implementation Tasks

#### Task 1.1: Create PHI Scrubber Utility

**File:** `src/shared/security/phi-scrubber.ts` (NEW)

**Specification:**
- Create utility class `PhiScrubber` with static methods:
  - `scrubText(text: string): string` - Remove names, emails, phone numbers, addresses
  - `scrubEmail(email: string): string` - Convert to anonymized format (e.g., `user_abc123@domain.com` → `user_***@domain.com`)
  - `scrubPhone(phone: string): string` - Remove phone numbers
  - `scrubUserInput(input: string): string` - Main method for user-submitted text
  - `isPhiPresent(text: string): boolean` - Detection method

**Patterns to Scrub:**
- Email addresses: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`
- Phone numbers: `(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}`
- Names: Common patterns (requires dictionary or ML-based detection)
- Addresses: Street addresses, ZIP codes

**Reference Implementation:**
```typescript
export class PhiScrubber {
  static scrubText(text: string): string {
    // Remove emails
    text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
    // Remove phone numbers
    text = text.replace(/(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g, '[PHONE_REDACTED]');
    // Additional patterns...
    return text;
  }

  static scrubEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${local.substring(0, 3)}***@${domain}`;
  }
}
```

#### Task 1.2: Apply PHI Scrub Before Database Save

**Files to Modify:**

1. **`src/app/api/evaluations/route.ts`**
   - Import `PhiScrubber` from `@/shared/security/phi-scrubber`
   - Scrub `response_text` before inserting (line 65)
   - Scrub any user-provided text fields

2. **`src/app/api/submit-text/route.ts`**
   - Scrub `textContent` before database insert (line 92)
   - Ensure no PII in `text_content` field

3. **`src/app/api/text-submit/route.ts`**
   - Scrub `text` field before processing (line 20)

**Implementation Pattern:**
```typescript
import { PhiScrubber } from '@/shared/security/phi-scrubber';

const insertPayload = {
  // ... other fields
  response_text: PhiScrubber.scrubUserInput(payload.response_text),
};
```

#### Task 1.3: Validate Analytics Events Contain Only Anonymized IDs

**Files to Review:**
- ```56:98:src/features/notifications/infrastructure/posthog/AnalyticsService.ts``` - PostHog service
- ```48:87:src/features/notifications/application/analytics/transcript-analytics.ts``` - Transcript analytics
- ```27:390:src/features/notifications/application/analytics.ts``` - Main analytics service

**Validation Points:**
1. Ensure `userId` is anonymized (use hash or UUID, not email)
2. Remove any email/name from event properties
3. Add validation function to check event payloads before sending

**File:** `src/shared/security/analytics-validator.ts` (NEW)

**Specification:**
- Create `AnalyticsValidator` class
- Method: `validateEvent(eventName: string, properties: Record<string, unknown>): void`
- Throw error if PII detected in properties
- Ensure `distinctId` is anonymized (not email)

**Modify Analytics Services:**
- Add validation before `posthog.capture()` calls
- Ensure all user identifiers are hashed/anonymized

### Acceptance Criteria
- [ ] All user input scrubbed before database save
- [ ] No email addresses in saved `response_text` fields
- [ ] No phone numbers in saved text
- [ ] Analytics events validated to contain only anonymized IDs
- [ ] Unit tests for PHI scrubber covering all patterns
- [ ] Integration tests verify scrubbed data in database

---

## 2. Data Redaction in Logs and Analytics

### Objective
Implement `data-scrubber.ts` for Sentry and PostHog payloads. Ensure compliance with PHI rules.

### Current State Analysis

**Files to Review:**
- ```10:156:src/infrastructure/logging/logger.ts``` - Logger with Sentry integration
- ```35:182:src/features/scheduling/infrastructure/monitoring/error-monitoring.ts``` - Error monitoring
- ```21:390:src/features/scheduling/llm/infrastructure/monitoring/SentryMonitoring.ts``` - Sentry monitoring
- ```31:91:instrumentation-client.ts``` - Sentry client configuration
- ```56:98:src/features/notifications/infrastructure/posthog/AnalyticsService.ts``` - PostHog service

**Current Logging Points:**
1. Sentry error capture (```46:54:src/infrastructure/logging/logger.ts```)
2. Sentry exception capture with context (```66:76:src/features/scheduling/infrastructure/monitoring/error-monitoring.ts```)
3. PostHog event tracking (```82:86:src/features/notifications/infrastructure/posthog/AnalyticsService.ts```)
4. Console logging in development (```127:133:src/infrastructure/logging/logger.ts```)

### Implementation Tasks

#### Task 2.1: Create Data Scrubber Utility

**File:** `src/shared/security/data-scrubber.ts` (NEW)

**Specification:**
- Create `DataScrubber` class with methods:
  - `scrubObject(obj: Record<string, unknown>): Record<string, unknown>` - Recursively scrub object
  - `scrubSentryEvent(event: SentryEvent): SentryEvent` - Scrub Sentry payload
  - `scrubPostHogEvent(event: PostHogEvent): PostHogEvent` - Scrub PostHog payload
  - `scrubLogContext(context: LogContext): LogContext` - Scrub log context

**Fields to Redact:**
- `email`, `emailAddress`, `userEmail`
- `name`, `fullName`, `full_name`, `userName`
- `phone`, `phoneNumber`, `phone_number`
- `address`, `street`, `zip`, `postalCode`
- `userId` (if contains email format)
- `sessionId` (if contains PII)

**Implementation Pattern:**
```typescript
export class DataScrubber {
  private static readonly PHI_FIELDS = [
    'email', 'emailAddress', 'userEmail',
    'name', 'fullName', 'full_name', 'userName',
    'phone', 'phoneNumber', 'phone_number',
    'address', 'street', 'zip', 'postalCode',
  ];

  static scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
    const scrubbed = { ...obj };
    for (const key of Object.keys(scrubbed)) {
      if (this.PHI_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        scrubbed[key] = '[REDACTED]';
      } else if (typeof scrubbed[key] === 'object' && scrubbed[key] !== null) {
        scrubbed[key] = this.scrubObject(scrubbed[key] as Record<string, unknown>);
      }
    }
    return scrubbed;
  }
}
```

#### Task 2.2: Integrate Scrubber into Sentry Configuration

**Files to Modify:**

1. **`instrumentation-client.ts`**
   - Modify `beforeSend` hook (line 31) to scrub event data
   - Import `DataScrubber`
   - Scrub `event.user`, `event.contexts`, `event.extra`

2. **`src/infrastructure/logging/logger.ts`**
   - Scrub context metadata before Sentry capture (line 47)
   - Ensure no PII in `extra` field

3. **`src/features/scheduling/infrastructure/monitoring/error-monitoring.ts`**
   - Scrub context metadata before capture (line 62)
   - Scrub user context (line 45-49)

4. **`src/features/scheduling/llm/infrastructure/monitoring/SentryMonitoring.ts`**
   - Scrub submission context (line 79-85)
   - Scrub user context (line 117-120)

**Implementation Pattern:**
```typescript
import { DataScrubber } from '@/shared/security/data-scrubber';

beforeSend(event, _hint) {
  // Scrub user data
  if (event.user) {
    event.user = DataScrubber.scrubObject(event.user as Record<string, unknown>);
  }
  // Scrub contexts
  if (event.contexts) {
    event.contexts = DataScrubber.scrubObject(event.contexts as Record<string, unknown>);
  }
  return event;
}
```

#### Task 2.3: Integrate Scrubber into PostHog

**Files to Modify:**

1. **`src/features/notifications/infrastructure/posthog/AnalyticsService.ts`**
   - Scrub properties before capture (line 77-80)
   - Ensure `distinctId` is anonymized (line 76)

2. **`src/features/notifications/application/analytics/transcript-analytics.ts`**
   - Scrub event payload (line 61-75)
   - Ensure no PII in properties

3. **`src/infrastructure/posthog/client.ts`**
   - Scrub properties in `trackEvent` method (line 114-132)

**Implementation Pattern:**
```typescript
import { DataScrubber } from '@/shared/security/data-scrubber';

const eventProperties: AnalyticsEventProperties = {
  ...DataScrubber.scrubObject(properties || {}),
  timestamp: new Date().toISOString(),
};
```

### Acceptance Criteria
- [ ] Data scrubber utility created with comprehensive PHI field detection
- [ ] Sentry events scrubbed before transmission
- [ ] PostHog events scrubbed before transmission
- [ ] Log contexts scrubbed before Sentry capture
- [ ] Unit tests verify scrubbing of all PHI fields
- [ ] Integration tests verify no PII in Sentry/PostHog payloads

---

## 3. Latency Budget + Cost-Control Documentation

### Objective
Document ≤150-word explanations for latency budget (target <10s p95) and cost-control mechanisms (model choice, batching, Redis TTL).

### Current State Analysis

**Files to Review:**
- ```73:212:src/infrastructure/bullmq/worker.ts``` - Worker processing evaluation jobs
- ```40:51:src/infrastructure/bullmq/queue.ts``` - Queue configuration
- ```72:79:src/infrastructure/redis/index.ts``` - Redis TTL configuration
- ```91:594:src/features/scheduling/infrastructure/scaling/performance-optimizer.ts``` - Performance optimization
- ```1:19:src/app/api/health/route.ts``` - Health endpoint

**Current Performance Metrics:**
- Worker concurrency: 1 (```210:210:src/infrastructure/bullmq/worker.ts```)
- Redis TTL: 3600s for active content pack, 7200s for content packs (```72:79:src/infrastructure/redis/index.ts```)
- Evaluation timeout: 30s (from env `SYNC_TIMEOUT_MS`)

### Implementation Tasks

#### Task 3.1: Create Latency Budget Documentation

**File:** `docs/performance/latency-budget.md` (NEW)

**Content (≤150 words):**
- Target: p95 < 10 seconds for evaluation requests
- Breakdown:
  - Transcription: ~2-3s (Whisper API)
  - LLM Evaluation: ~3-5s (GPT-4)
  - Database write: <500ms
  - Queue overhead: <500ms
- Monitoring: Health endpoint tracks p95 latency
- Alerting: Exceeds 10s triggers performance alert

**File References:**
- Worker processing: ```73:212:src/infrastructure/bullmq/worker.ts```
- Health monitoring: ```1:19:src/app/api/health/route.ts```

#### Task 3.2: Create Cost-Control Documentation

**File:** `docs/operations/cost-control.md` (NEW)

**Content (≤150 words):**
- Model Selection: GPT-4 for quality, consider GPT-3.5-turbo for cost reduction
- Batching: Queue processes one job at a time (concurrency=1) to prevent cost spikes
- Redis TTL: 1-hour TTL for active content pack cache, 2-hour for content packs
- Idempotency: Prevents duplicate LLM calls via request ID check
- Rate Limiting: 60 RPM per API key (configurable via `RATE_LIMIT_RPM`)
- Caching: Evaluation results cached to avoid re-processing

**File References:**
- Queue config: ```40:51:src/infrastructure/bullmq/queue.ts```
- Redis TTL: ```72:79:src/infrastructure/redis/index.ts```
- Idempotency: ```82:105:src/infrastructure/bullmq/worker.ts```

### Acceptance Criteria
- [ ] Latency budget document created (≤150 words)
- [ ] Cost-control document created (≤150 words)
- [ ] Documents reference actual code locations
- [ ] Documents include monitoring/alerting details

---

## 4. Failover + Rollback Runbook

### Objective
Add documentation describing recovery for: stuck BullMQ queue, Redis outage, or deploy rollback. Include CLI commands for each.

### Current State Analysis

**Files to Review:**
- ```73:212:src/infrastructure/bullmq/worker.ts``` - BullMQ worker
- ```40:51:src/infrastructure/bullmq/queue.ts``` - Queue configuration
- ```1:516:src/infrastructure/redis/index.ts``` - Redis client and cache
- ```1:138:docs/owner-runbook.md``` - Existing runbook

### Implementation Tasks

#### Task 4.1: Create Operational Runbook

**File:** `docs/operations/failover-rollback-runbook.md` (NEW)

**Sections:**

1. **Stuck BullMQ Queue Recovery**
   - Symptoms: Jobs stuck in "active" state, worker not processing
   - Diagnosis commands:
     ```bash
     # Check queue status (requires Redis CLI access)
     redis-cli -h <redis-host> -p 6379 -a <password> LLEN bull:evaluationQueue:active

     # List stuck jobs
     redis-cli -h <redis-host> -p 6379 -a <password> LRANGE bull:evaluationQueue:active 0 -1
     ```
   - Recovery steps:
     - Restart worker: `pm2 restart evaluation-worker` (if using PM2)
     - Clear stuck jobs: Move from active to failed queue
     - Check worker logs: `tail -f logs/worker.log`
   - File references:
     - Queue: ```40:51:src/infrastructure/bullmq/queue.ts```
     - Worker: ```73:212:src/infrastructure/bullmq/worker.ts```

2. **Redis Outage Recovery**
   - Symptoms: Cache misses, queue failures, health check failures
   - Diagnosis:
     ```bash
     # Test Redis connectivity
     redis-cli -h <redis-host> -p 6379 -a <password> PING

     # Check health endpoint
     curl https://your-app.com/api/health
     ```
   - Recovery steps:
     - Verify Redis credentials in `.env`
     - Check Upstash dashboard for service status
     - Application falls back to in-memory cache (```8:52:src/infrastructure/redis/index.ts```)
     - Restart application to clear in-memory state
   - File references:
     - Redis client: ```1:516:src/infrastructure/redis/index.ts```
     - Fallback: ```8:52:src/infrastructure/redis/index.ts```

3. **Deploy Rollback**
   - Prerequisites: Previous deployment tag/commit hash
   - Rollback steps:
     ```bash
     # Vercel rollback
     vercel rollback <deployment-url>

     # Git-based rollback
     git checkout <previous-commit-hash>
     git push origin main --force

     # Database migration rollback (if needed)
     # Supabase dashboard → Migrations → Rollback
     ```
   - Post-rollback verification:
     - Check health: `curl https://your-app.com/api/health`
     - Verify queue processing: Monitor worker logs
     - Test evaluation endpoint: Submit test request

### Acceptance Criteria
- [ ] Runbook created with all three scenarios
- [ ] CLI commands provided for each scenario
- [ ] File references included for code locations
- [ ] Steps are executable and tested

---

## 5. Critical Bug Response SLA

### Objective
Add explicit support clause: critical bugs addressed within 72 hours during 30-day window.

### Current State Analysis

**Files to Review:**
- ```1:292:README.md``` - Main README file

### Implementation Tasks

#### Task 5.1: Add SLA Section to README

**File:** `README.md`

**Location:** Add after "Contact & Support" section (line 285)

**Content:**
```markdown
## Support & SLA

### Critical Bug Response SLA

During the initial 30-day launch window, critical bugs will be addressed within 72 hours of report.

**Critical Bug Definition:**
- Application unavailable or major functionality broken
- Data loss or corruption
- Security vulnerabilities
- Performance degradation (>50% slower than baseline)

**Reporting:**
- Email: [support-email]
- Include: Bug description, steps to reproduce, error logs, affected users

**Response Timeline:**
- Acknowledgment: Within 4 hours
- Initial assessment: Within 24 hours
- Resolution or workaround: Within 72 hours

**Non-Critical Issues:**
- Feature requests and minor bugs: Best effort basis
- Documentation updates: Included in regular releases
```

### Acceptance Criteria
- [ ] SLA section added to README
- [ ] 72-hour response time clearly stated
- [ ] 30-day window specified
- [ ] Critical bug definition included

---

## 6. Content Pack Missing Fallback Banner

### Objective
Add conditional UI banner if `matchready_content_pack` not loaded. Include PostHog event `content_pack_missing`.

### Current State Analysis

**Files to Review:**
- ```10:262:src/features/booking/infrastructure/startup/ContentPackLoader.ts``` - Content pack loader
- ```1:19:src/app/api/health/route.ts``` - Health endpoint
- Sample content pack: `sample-data/matchready_content_pack_v1.0.0.json`

**Current Fallback Logic:**
- Fallback service exists (```18:32:src/features/booking/infrastructure/startup/ContentPackLoader.ts```)
- `isUsingFallback()` method available (```123:125:src/features/booking/infrastructure/startup/ContentPackLoader.ts```)
- No UI banner currently displayed

### Implementation Tasks

#### Task 6.1: Create Content Pack Missing Banner Component

**File:** `src/components/content/ContentPackMissingBanner.tsx` (NEW)

**Specification:**
- Display banner when content pack not loaded
- Show warning message: "Content pack not loaded. Using fallback content."
- Include dismiss button
- Track PostHog event `content_pack_missing` on mount
- Styled as warning/alert banner

**Implementation:**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { analytics } from '@/features/notifications/application/analytics';

export function ContentPackMissingBanner() {
  const [isMissing, setIsMissing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check content pack status
    fetch('/api/system/status')
      .then(res => res.json())
      .then(data => {
        const missing = data.contentPack?.isActive === false;
        setIsMissing(missing);

        if (missing) {
          // Track event
          analytics.track('content_pack_missing', {
            timestamp: new Date().toISOString(),
          });
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

#### Task 6.2: Integrate Banner into Layout

**Files to Modify:**

1. **`src/app/(dashboard)/layout.tsx`** (or main layout file)
   - Import `ContentPackMissingBanner`
   - Add component at top of layout

2. **Check content pack status endpoint**
   - Verify `/api/system/status` returns content pack status (```49:142:src/app/api/system/status/route.ts```)
   - Ensure `contentPack.isActive` field is accurate

#### Task 6.3: Add PostHog Event Tracking

**Files to Modify:**

1. **`src/features/notifications/application/analytics.ts`**
   - Ensure `track` method supports `content_pack_missing` event
   - Verify event includes required fields (timestamp, user_id if available)

### Acceptance Criteria
- [ ] Banner component created and styled
- [ ] Banner displays when content pack missing
- [ ] PostHog event `content_pack_missing` fires on banner display
- [ ] Banner can be dismissed
- [ ] Banner integrates into main layout
- [ ] Unit tests for banner component

---

## 7. ClickUp Checklist Proof

### Objective
Use checklists for dual-mode UX (record + type), PHI scrub, chips, practice rule, reminders, analytics.

### Implementation Tasks

#### Task 7.1: Create P0 UX Confirmation Checklist

**File:** `docs/qa/p0-ux-checklist.md` (NEW)

**Checklist Items:**

**Dual-Mode UX (Record + Type)**
- [ ] Audio recording mode functional
- [ ] Text input mode functional
- [ ] Mode switching works without errors
- [ ] Both modes submit successfully
- [ ] File references:
  - ```82:470:src/app/(dashboard)/drill/[id]/page.tsx``` - Drill interface
  - ```16:111:src/app/api/text-submit/route.ts``` - Text submission

**PHI Scrub**
- [ ] User input scrubbed before save
- [ ] No email addresses in saved data
- [ ] No phone numbers in saved data
- [ ] Analytics events contain only anonymized IDs
- [ ] File references:
  - `src/shared/security/phi-scrubber.ts` (NEW)
  - ```65:65:src/app/api/evaluations/route.ts``` - Save endpoint

**Category Chips**
- [ ] 7 category chips display correctly
- [ ] Each chip shows PASS/FLAG status
- [ ] Chip feedback text displays
- [ ] Chips styled appropriately
- [ ] File references:
  - Evaluation results schema (check for chips structure)

**Practice Rule**
- [ ] Practice rule displays in results
- [ ] Practice rule text is relevant
- [ ] Practice rule formatted correctly
- [ ] File references:
  - Evaluation response schema

**Reminders**
- [ ] Reminder system functional (if implemented)
- [ ] Reminders display at appropriate times
- [ ] Reminder dismissal works
- [ ] File references:
  - Check for reminder components/services

**Analytics**
- [ ] `drill_started` event fires
- [ ] `drill_submitted` event fires
- [ ] `score_returned` event fires
- [ ] `content_pack_missing` event fires when applicable
- [ ] Events contain anonymized user IDs only
- [ ] File references:
  - ```27:390:src/features/notifications/application/analytics.ts```
  - ```56:98:src/features/notifications/infrastructure/posthog/AnalyticsService.ts```

### Acceptance Criteria
- [ ] Checklist document created
- [ ] All P0 UX items included
- [ ] File references for each item
- [ ] Checklist format suitable for ClickUp import

---

## 8. Final Proof Attachments

### Objective
Include linked screenshots or Notion doc showing SLA and cost documentation.

### Implementation Tasks

#### Task 8.1: Create Proof Documentation Index

**File:** `docs/m4-p0-proof-attachments.md` (NEW)

**Content:**
- Links to SLA documentation (README section)
- Links to cost-control documentation
- Links to latency budget documentation
- Links to runbook documentation
- Instructions for generating screenshots

**Sections:**

1. **SLA Documentation Proof**
   - Location: `README.md` → "Support & SLA" section
   - Screenshot: README showing SLA clause
   - Link: `https://github.com/[repo]/blob/main/README.md#support--sla`

2. **Cost-Control Documentation Proof**
   - Location: `docs/operations/cost-control.md`
   - Screenshot: Cost-control document
   - Link: `docs/operations/cost-control.md`

3. **Latency Budget Documentation Proof**
   - Location: `docs/performance/latency-budget.md`
   - Screenshot: Latency budget document
   - Link: `docs/performance/latency-budget.md`

4. **Runbook Documentation Proof**
   - Location: `docs/operations/failover-rollback-runbook.md`
   - Screenshot: Runbook sections
   - Link: `docs/operations/failover-rollback-runbook.md`

### Acceptance Criteria
- [ ] Proof attachments document created
- [ ] All documentation links included
- [ ] Screenshot instructions provided
- [ ] Document serves as index for all M4 P0 deliverables

---

## Implementation Summary

### New Files to Create

1. `src/shared/security/phi-scrubber.ts` - PHI scrubbing utility
2. `src/shared/security/data-scrubber.ts` - Data redaction utility
3. `src/shared/security/analytics-validator.ts` - Analytics validation
4. `src/components/content/ContentPackMissingBanner.tsx` - Missing content pack banner
5. `docs/performance/latency-budget.md` - Latency budget documentation
6. `docs/operations/cost-control.md` - Cost-control documentation
7. `docs/operations/failover-rollback-runbook.md` - Operational runbook
8. `docs/qa/p0-ux-checklist.md` - P0 UX checklist
9. `docs/m4-p0-proof-attachments.md` - Proof attachments index

### Files to Modify

1. `src/app/api/evaluations/route.ts` - Add PHI scrub before save
2. `src/app/api/submit-text/route.ts` - Add PHI scrub
3. `src/app/api/text-submit/route.ts` - Add PHI scrub
4. `instrumentation-client.ts` - Add Sentry data scrubbing
5. `src/infrastructure/logging/logger.ts` - Add log scrubbing
6. `src/features/scheduling/infrastructure/monitoring/error-monitoring.ts` - Add context scrubbing
7. `src/features/scheduling/llm/infrastructure/monitoring/SentryMonitoring.ts` - Add Sentry scrubbing
8. `src/features/notifications/infrastructure/posthog/AnalyticsService.ts` - Add PostHog scrubbing
9. `src/features/notifications/application/analytics/transcript-analytics.ts` - Add scrubbing
10. `src/infrastructure/posthog/client.ts` - Add scrubbing
11. `README.md` - Add SLA section
12. `src/app/(dashboard)/layout.tsx` - Add content pack banner

### Testing Requirements

1. Unit tests for PHI scrubber (all patterns)
2. Unit tests for data scrubber (Sentry/PostHog)
3. Integration tests for scrubbed database saves
4. Integration tests for scrubbed analytics events
5. E2E tests for content pack missing banner
6. Manual testing of runbook procedures

---

## Timeline Estimate

- **Task 1 (PHI Scrub):** 2-3 days
- **Task 2 (Data Redaction):** 1-2 days
- **Task 3 (Documentation):** 0.5 days
- **Task 4 (Runbook):** 1 day
- **Task 5 (SLA):** 0.5 days
- **Task 6 (Banner):** 1 day
- **Task 7 (Checklist):** 0.5 days
- **Task 8 (Proof):** 0.5 days

**Total Estimate:** ~7-9 developer days

---

## Dependencies

- PostHog analytics service configured
- Sentry error tracking configured
- Redis/BullMQ infrastructure operational
- Content pack loading system functional

---

## Risk Mitigation

1. **PHI Scrub Performance:** Ensure scrubbing doesn't add significant latency (<100ms)
2. **False Positives:** PHI detection should not break legitimate user input
3. **Analytics Impact:** Scrubbing should not break analytics tracking
4. **Runbook Accuracy:** All CLI commands must be tested in staging environment

---

**Document Version:** 1.0
**Last Updated:** January 2025
**Next Review:** After M4 P0 implementation completion
