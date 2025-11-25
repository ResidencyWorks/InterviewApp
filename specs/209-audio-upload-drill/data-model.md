# Data Model: Audio Upload for Drill Recordings

**Feature**: 009-audio-upload-drill
**Date**: 2025-01-27
**Status**: Complete

## Overview

This document defines the core data structures and domain models for the audio upload feature, including recording metadata, upload session tracking, and signed URL management.

---

## Entities

### 1. Recording (Domain Entity)

**Purpose**: Represents a single audio recording created by a user during a drill practice session.

**Attributes**:

```typescript
interface Recording {
  id: string;                    // UUID v4
  userId: string;                // Foreign key to auth.users
  sessionId: string;             // Drill session identifier
  questionId: string;            // Question being answered

  // File metadata
  fileName: string;              // Stored filename in bucket (UUID.webm)
  mimeType: string;              // e.g., "audio/webm;codecs=opus"
  fileSize: number;              // Bytes
  duration: number;              // Seconds (actual recording length)
  storagePath: string;           // Full path in bucket (e.g., "user-123/rec-abc.webm")

  // Timestamps
  recordedAt: Date;              // When recording was completed
  uploadedAt: Date;              // When upload completed
  expiresAt: Date;               // 30 days from uploadedAt

  // Status
  status: "recording" | "uploading" | "completed" | "failed" | "expired";
  errorMessage?: string;         // Error details if status is "failed"

  // Analytics
  uploadAttempts: number;        // Number of upload retries
  uploadDuration: number;        // Milliseconds from start to completion
}
```

**Validation Rules**:
- `duration` must be ≤ 90 seconds (FR-002)
- `fileSize` must be < 10MB (safety limit)
- `mimeType` must be valid audio format (audio/webm, audio/ogg, audio/mp4)
- `recordedAt` must be before or equal to `uploadedAt`
- `expiresAt` must be exactly 30 days after `uploadedAt` (FR-007)

**State Transitions**:
```
recording → uploading → completed
recording → uploading → failed (retry) → completed
uploading → failed (max retries) → failed
completed → expired (after 30 days)
```

---

### 2. UploadSession (Application Model)

**Purpose**: Tracks the lifecycle of a file upload attempt, including progress and retry state.

**Attributes**:

```typescript
interface UploadSession {
  id: string;                    // UUID v4
  recordingId: string;           // Foreign key to Recording

  // Progress tracking
  bytesUploaded: number;         // Bytes uploaded so far
  totalBytes: number;            // Total file size
  progress: number;              // Percentage (0-100)

  // Retry state
  attempt: number;               // Current attempt (1-3)
  maxAttempts: number;           // Always 3 (FR-012)
  nextRetryAt?: Date;            // Timestamp for next retry (exponential backoff)

  // Status
  status: "pending" | "uploading" | "completed" | "failed" | "cancelled";
  errorCode?: string;            // e.g., "NETWORK_ERROR", "QUOTA_EXCEEDED"
  errorMessage?: string;

  // Timestamps
  startedAt: Date;
  completedAt?: Date;
  lastProgressUpdate: Date;      // For progress staleness detection
}
```

**Validation Rules**:
- `progress` must be between 0 and 100
- `attempt` must be ≤ `maxAttempts`
- `bytesUploaded` must be ≤ `totalBytes`
- `nextRetryAt` must be in the future if status is "pending"

**Behavior**:
- Auto-retry with exponential backoff on transient failures
- Cancel upload if new recording starts while upload in progress
- Progress updates logged to analytics every 1 second during upload

---

### 3. SignedUrl (Infrastructure Model)

**Purpose**: Represents a time-limited access credential for audio playback.

**Attributes**:

```typescript
interface SignedUrl {
  recordingId: string;           // Foreign key to Recording
  url: string;                   // Full signed URL (CDN endpoint)
  expiresAt: Date;               // Must be ≤ 15 minutes from generation (FR-008)

  // Metadata
  generatedAt: Date;
  accessCount: number;           // Track usage for analytics
  lastAccessedAt?: Date;
}
```

**Validation Rules**:
- `expiresAt` must be ≤ 15 minutes from `generatedAt` (FR-008)
- `expiresAt` must be in the future
- `url` must be valid HTTPS URL

**Lifecycle**:
- Generated server-side via Supabase `createSignedUrl()` (NEVER expose service role client-side)
- Single-use or short-lived (15 minutes max)
- Automatically invalidated after expiry
- Can be regenerated on-demand for same recording

---

## Relationships

```
User (1) ────< (N) Recording
Recording (1) ────< (N) UploadSession
Recording (1) ────< (N) SignedUrl
```

**Notes**:
- One user can create multiple recordings (one per drill question)
- One recording may have multiple upload sessions (if retries occur)
- Multiple signed URLs can be generated for the same recording (for different playback sessions)
- Upload sessions are cleaned up after completion (not persisted long-term)
- Signed URLs are not stored (generated on-demand)

---

## Storage Strategy

### Supabase Storage (Files)

**Bucket**: `drill-recordings`
**Structure**:
```
drill-recordings/
├── {userId}/
│   ├── {recordingId}.webm
│   ├── {recordingId}.ogg
│   └── {recordingId}.m4a
```

**Policies**:
- Private bucket (no public access)
- RLS: Only service role can read/write
- Lifecycle: Delete files after 30 days automatically

### PostgreSQL (Metadata)

**Table**: `recordings` (metadata only, not file data)

```sql
CREATE TABLE recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  question_id TEXT NOT NULL,

  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  duration INT NOT NULL CHECK (duration <= 90),
  storage_path TEXT NOT NULL,

  recorded_at TIMESTAMPTZ NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  status TEXT NOT NULL CHECK (status IN ('recording', 'uploading', 'completed', 'failed', 'expired')),
  error_message TEXT,

  upload_attempts INT NOT NULL DEFAULT 0,
  upload_duration_ms INT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recordings_user_id ON recordings(user_id);
CREATE INDEX idx_recordings_expires_at ON recordings(expires_at) WHERE status = 'completed';
CREATE INDEX idx_recordings_status ON recordings(status);
```

**Cleanup**:
- Automatically delete expired recordings via scheduled job (runs daily)
- Or rely on storage bucket lifecycle policy to delete files (metadata cleanup is separate)

---

## Domain Rules

1. **One recording per session**: A user cannot have multiple active recordings for the same question session
2. **90-second maximum**: Recording must stop automatically at 90 seconds (FR-002)
3. **30-day retention**: All recordings expire 30 days after upload (FR-007)
4. **15-minute URL expiry**: Signed URLs expire within 15 minutes (FR-008)
5. **3 retry attempts**: Failed uploads retry up to 3 times with exponential backoff (FR-012)
6. **Permission validation**: Upload requires active subscription check (FR-005)

---

## Schema Validation (Zod)

```typescript
import { z } from "zod";

export const RecordingSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  sessionId: z.string().min(1),
  questionId: z.string().min(1),

  fileName: z.string().min(1),
  mimeType: z.string().regex(/^audio\/(webm|ogg|mp4)$/),
  fileSize: z.number().int().positive().max(10_000_000), // 10MB max
  duration: z.number().int().positive().max(90), // 90 seconds max
  storagePath: z.string().min(1),

  recordedAt: z.date(),
  uploadedAt: z.date(),
  expiresAt: z.date(),

  status: z.enum(["recording", "uploading", "completed", "failed", "expired"]),
  errorMessage: z.string().optional(),

  uploadAttempts: z.number().int().nonnegative(),
  uploadDuration: z.number().int().nonnegative(),
});
```

---

## Migrations

**Initial Setup**:
1. Create `drill-recordings` bucket in Supabase Storage (private)
2. Configure RLS policies (service role only)
3. Set lifecycle policy (delete after 30 days)
4. Create `recordings` table in PostgreSQL
5. Add indexes for performance
6. Set up cleanup job (optional, if not using bucket lifecycle)

---

## Analytics Events

Events logged to PostHog (FR-013):

```typescript
type RecordingEvent =
  | { type: "recording.started", recordingId: string }
  | { type: "recording.stopped", recordingId: string, duration: number }
  | { type: "upload.started", recordingId: string, fileSize: number }
  | { type: "upload.progress", recordingId: string, progress: number }
  | { type: "upload.retry", recordingId: string, attempt: number }
  | { type: "upload.completed", recordingId: string, uploadDuration: number }
  | { type: "upload.failed", recordingId: string, errorCode: string, attempt: number };
```
