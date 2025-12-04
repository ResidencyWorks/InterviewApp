# API Contract Modifications: M4 P0 Launch Readiness

**Feature**: M4 P0 Launch Readiness - PHI Compliance, Documentation & Operational Readiness
**Date**: 2025-01-27
**Phase**: Phase 1 - Design & Contracts

## Overview

This feature does not introduce new API endpoints. Instead, it modifies the behavior of existing endpoints to scrub PHI before storage. This document describes the contract modifications for affected endpoints.

## Modified Endpoints

### POST /api/evaluations

**Purpose**: Save evaluation results to database

**Modification**: `response_text` field is scrubbed of PHI before database insertion

**Request Contract** (unchanged):
```typescript
{
  id: string;
  user_id: string;
  content_pack_id?: string;
  response_text: string;  // May contain PHI in request
  response_audio_url?: string;
  response_type: "text" | "audio";
  duration_seconds?: number;
  word_count?: number;
  wpm?: number;
  categories: object;
  feedback?: object;
  score?: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
}
```

**Processing** (NEW):
1. `response_text` is scrubbed using `PhiScrubber.scrubUserInput()`
2. Email addresses are replaced with `[EMAIL_REDACTED]`
3. Phone numbers are replaced with `[PHONE_REDACTED]`
4. Scrubbed text is validated to ensure no PHI remains

**Response Contract** (unchanged):
```typescript
{
  success: boolean;
  data: {
    id: string;
    response_text: string;  // Contains scrubbed text (no PHI)
    // ... other fields
  };
}
```

**Behavior Changes**:
- `response_text` stored in database will NOT contain email addresses or phone numbers
- Placeholder text (`[EMAIL_REDACTED]`, `[PHONE_REDACTED]`) may appear in stored text
- Scrubbing is transparent to the client (no error if PHI detected, silently scrubbed)

---

### POST /api/submit-text

**Purpose**: Submit text response for evaluation

**Modification**: `textContent` field is scrubbed before database insertion

**Request Contract** (unchanged):
```typescript
{
  textContent: string;  // May contain PHI in request
  sessionId: string;
  questionId: string;
  userId: string;
}
```

**Processing** (NEW):
1. `textContent` is scrubbed using `PhiScrubber.scrubUserInput()`
2. Email addresses and phone numbers are replaced with placeholders
3. Scrubbed text is stored in `recordings.text_content` field

**Response Contract** (unchanged):
```typescript
{
  success: boolean;
  data: {
    recordingId: string;
    status: "completed";
    textLength: number;  // Length of scrubbed text
  };
}
```

**Behavior Changes**:
- `textContent` stored in database will NOT contain PHI
- `textLength` reflects length of scrubbed text (may differ from original if PHI removed)

---

### POST /api/text-submit

**Purpose**: Alternative text submission endpoint

**Modification**: `text` field is scrubbed before processing

**Request Contract** (unchanged):
```typescript
{
  text: string;  // May contain PHI in request
  sessionId: string;
  questionId: string;
  userId?: string;
}
```

**Processing** (NEW):
1. `text` is scrubbed using `PhiScrubber.scrubUserInput()`
2. Scrubbed text is used for subsequent processing

**Response Contract** (unchanged):
```typescript
{
  success: boolean;
  responseId: string;
  textLength: number;  // Length of scrubbed text
  submittedAt: string;
}
```

**Behavior Changes**:
- `text` field is scrubbed before any processing occurs
- `textLength` reflects scrubbed text length

---

## Internal API Modifications

### Analytics Service (`AnalyticsService.track()`)

**Modification**: Event properties are scrubbed before transmission to PostHog

**Method Signature** (unchanged):
```typescript
track(eventName: string, properties?: Record<string, unknown>, userId?: string): Promise<void>
```

**Processing** (NEW):
1. Properties are scrubbed using `DataScrubber.scrubObject()`
2. `userId` is anonymized if it's an email address
3. `distinctId` is set to anonymized identifier (not email)
4. Scrubbed properties are validated using `AnalyticsValidator.validateEvent()`

**Behavior Changes**:
- Properties sent to PostHog will NOT contain PII
- `distinctId` will be anonymized (hash/UUID, not email)
- Validation errors thrown in development if PII detected

---

### Error Monitoring (`ErrorMonitoringService.reportError()`)

**Modification**: Error context is scrubbed before transmission to Sentry

**Method Signature** (unchanged):
```typescript
reportError(report: ErrorReport): void
```

**Processing** (NEW):
1. Context metadata is scrubbed using `DataScrubber.scrubObject()`
2. User context is scrubbed (email, name fields removed)
3. Scrubbed context is passed to Sentry

**Behavior Changes**:
- Error contexts sent to Sentry will NOT contain PII
- User identifiers are anonymized
- Scrubbing happens before `captureException()` call

---

### Sentry Client (`instrumentation-client.ts`)

**Modification**: `beforeSend` hook scrubs event data before transmission

**Hook Signature**:
```typescript
beforeSend(event: SentryEvent, hint: EventHint): SentryEvent | null
```

**Processing** (NEW):
1. `event.user` is scrubbed using `DataScrubber.scrubObject()`
2. `event.contexts` is scrubbed recursively
3. `event.extra` is scrubbed recursively
4. Modified event is returned (or null to drop)

**Behavior Changes**:
- All Sentry events will have PII scrubbed before transmission
- Event structure is preserved (only PII fields modified)
- Events are not dropped unless explicitly returning null

---

## Contract Compliance

### Backward Compatibility

- **Request contracts**: Unchanged - clients can continue sending requests as before
- **Response contracts**: Unchanged - response structure remains the same
- **Behavior**: Scrubbing is transparent - no breaking changes to API behavior
- **Error handling**: No new error codes or error responses

### Validation

- **Input validation**: Existing validation rules remain unchanged
- **PHI detection**: Silent scrubbing - no errors returned to client if PHI detected
- **Scrubbing validation**: Internal validation ensures scrubbed data contains no PHI

### Performance

- **Latency impact**: <100ms overhead for scrubbing operations (SC-010)
- **Throughput**: No impact on request throughput
- **Error rate**: No increase in error rates expected

## Testing Contracts

### Unit Tests

- Test `PhiScrubber.scrubUserInput()` with various PHI patterns
- Test `DataScrubber.scrubObject()` with nested objects
- Test `AnalyticsValidator.validateEvent()` with PII-containing properties

### Integration Tests

- Test `/api/evaluations` endpoint stores scrubbed text
- Test analytics events contain no PII
- Test error logs contain no PII

### E2E Tests

- Submit evaluation with email/phone in text, verify scrubbed in database
- Trigger error with PII in context, verify scrubbed in Sentry
- Track analytics event with PII, verify scrubbed in PostHog
