# Data Model: M4 P0 Launch Readiness

**Feature**: M4 P0 Launch Readiness - PHI Compliance, Documentation & Operational Readiness
**Date**: 2025-01-27
**Phase**: Phase 1 - Design & Contracts

## Overview

This feature does not introduce new database entities. Instead, it modifies how existing data is processed and stored, and adds utility classes for data transformation. The data model focuses on the transformation entities and validation rules.

## Entities

### ScrubbedUserInput

**Purpose**: Represents user-submitted text after PHI scrubbing has been applied

**Fields**:
- `originalText` (string): Original user input before scrubbing (not stored, used only during processing)
- `scrubbedText` (string): Text with PHI removed and replaced with placeholders
- `phiDetected` (boolean): Whether any PHI was detected in the original text
- `scrubbingTimestamp` (Date): When scrubbing was performed

**Validation Rules**:
- `scrubbedText` MUST NOT contain email addresses matching pattern `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`
- `scrubbedText` MUST NOT contain phone numbers matching pattern `(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}`
- `scrubbedText` MUST contain placeholder text `[EMAIL_REDACTED]` or `[PHONE_REDACTED]` where PHI was removed
- `scrubbedText` length MUST be <= originalText length + placeholder overhead

**Storage**: Stored in `evaluation_results.response_text` field (existing table, modified content)

**Relationships**:
- Belongs to `EvaluationResult` (via `response_text` field)
- Created during user submission workflow

---

### AnonymizedUserIdentifier

**Purpose**: Represents a user identifier that cannot be traced back to personal information

**Fields**:
- `value` (string): The anonymized identifier (hash or UUID)
- `originalType` (string): Type of original identifier ("email" | "userId" | "sessionId")
- `anonymizationMethod` (string): Method used ("hash" | "uuid" | "custom")
- `createdAt` (Date): When anonymization was performed

**Validation Rules**:
- `value` MUST NOT be an email address
- `value` MUST NOT contain personally identifiable information
- `value` MUST be a valid UUID format OR hash format (alphanumeric, 32+ characters)
- `originalType` MUST be one of the allowed values

**Storage**: Used in analytics events (`distinctId` field) and error logs (`user.id` field)

**Relationships**:
- Referenced in `AnalyticsEvent.distinctId`
- Referenced in `ErrorLog.user.id`

---

### AnalyticsEvent (Modified)

**Purpose**: Represents a user interaction event sent to analytics services (PostHog)

**Fields** (existing, modified behavior):
- `eventName` (string): Name of the event
- `properties` (Record<string, unknown>): Event properties (MUST be scrubbed)
- `distinctId` (string): User identifier (MUST be anonymized, not email)
- `timestamp` (Date): When event occurred

**Validation Rules** (NEW):
- `properties` MUST NOT contain email addresses
- `properties` MUST NOT contain phone numbers
- `properties` MUST NOT contain names or other PII
- `distinctId` MUST NOT be an email address
- `distinctId` MUST be anonymized (hash or UUID format)

**Storage**: Transmitted to PostHog, not stored in database

**Relationships**:
- Uses `AnonymizedUserIdentifier` for `distinctId`
- Properties scrubbed by `DataScrubber` before transmission

---

### ErrorLogEntry (Modified)

**Purpose**: Represents an error log entry sent to error tracking services (Sentry)

**Fields** (existing, modified behavior):
- `message` (string): Error message
- `user` (object): User context (MUST be scrubbed)
- `contexts` (object): Additional context (MUST be scrubbed)
- `extra` (object): Extra metadata (MUST be scrubbed)
- `timestamp` (Date): When error occurred

**Validation Rules** (NEW):
- `user` object MUST NOT contain email addresses
- `user` object MUST NOT contain names or other PII
- `contexts` object MUST NOT contain PII (recursively checked)
- `extra` object MUST NOT contain PII (recursively checked)
- `user.id` MUST be anonymized if present

**Storage**: Transmitted to Sentry, not stored in database

**Relationships**:
- Uses `AnonymizedUserIdentifier` for `user.id`
- Contexts scrubbed by `DataScrubber` before transmission

---

### ContentPackStatus

**Purpose**: Represents the status of content pack loading

**Fields**:
- `isActive` (boolean): Whether primary content pack is loaded and active
- `packName` (string, optional): Name of active content pack
- `packVersion` (string, optional): Version of active content pack
- `isUsingFallback` (boolean): Whether fallback content is being used
- `lastChecked` (Date): When status was last checked

**Validation Rules**:
- `isActive` and `isUsingFallback` MUST be mutually exclusive (if `isActive` is true, `isUsingFallback` is false)
- `packName` and `packVersion` MUST be present if `isActive` is true

**Storage**: Retrieved from `/api/system/status` endpoint (not stored, computed)

**Relationships**:
- Used by `ContentPackMissingBanner` component to determine visibility

---

## State Transitions

### User Input Scrubbing Flow

```
User submits text
  ↓
PhiScrubber.scrubUserInput(text)
  ↓
Detect PHI patterns (email, phone)
  ↓
Replace with placeholders
  ↓
Validate scrubbed text contains no PHI
  ↓
Store scrubbed text in database
```

### Analytics Event Flow

```
Analytics event created
  ↓
AnalyticsValidator.validateEvent(eventName, properties)
  ↓
Check for PII in properties
  ↓
Scrub properties with DataScrubber
  ↓
Anonymize distinctId if needed
  ↓
PostHog.capture(eventName, scrubbedProperties)
```

### Error Log Flow

```
Error occurs
  ↓
Error context collected
  ↓
DataScrubber.scrubObject(context)
  ↓
Sentry.beforeSend hook scrubs event
  ↓
Sentry.captureException(scrubbedEvent)
```

## Validation Rules Summary

1. **No Email Addresses**: All stored text, analytics properties, and error contexts must not contain email addresses
2. **No Phone Numbers**: All stored text must not contain phone numbers
3. **Anonymized Identifiers**: All user identifiers in analytics and error logs must be anonymized (not email addresses)
4. **Placeholder Replacement**: Removed PHI must be replaced with appropriate placeholders (`[EMAIL_REDACTED]`, `[PHONE_REDACTED]`)
5. **Recursive Scrubbing**: Nested objects in error contexts and analytics properties must be recursively scrubbed

## Data Flow Diagrams

### User Submission → Database Storage

```
User Input (may contain PHI)
  ↓
[PhiScrubber.scrubUserInput]
  ↓
Scrubbed Text (no PHI)
  ↓
[Database Insert]
  ↓
evaluation_results.response_text
```

### Analytics Event → PostHog

```
Analytics Event (may contain PII)
  ↓
[AnalyticsValidator.validateEvent]
  ↓
[DataScrubber.scrubObject]
  ↓
Scrubbed Event (no PII)
  ↓
[PostHog.capture]
  ↓
PostHog API
```

### Error Log → Sentry

```
Error Context (may contain PII)
  ↓
[Logger.error with context]
  ↓
[Sentry.beforeSend hook]
  ↓
[DataScrubber.scrubObject]
  ↓
Scrubbed Event (no PII)
  ↓
[Sentry.captureException]
  ↓
Sentry API
```
