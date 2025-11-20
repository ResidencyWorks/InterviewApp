# API Contract: Upload Audio Recording

**Endpoint**: `POST /api/upload`
**Feature**: 009-audio-upload-drill
**Date**: 2025-01-27

## Overview

Uploads an audio recording file to Supabase storage with metadata, validates user entitlements, and returns the recording ID and initial status.

---

## Request

### Endpoint
```
POST /api/upload
```

### Headers
```
Authorization: Bearer {session_token}
Content-Type: multipart/form-data
```

### Body (Form Data)
```
file: File (audio file, max 10MB)
sessionId: string (drill session identifier)
questionId: string (question being answered)
duration: number (recording duration in seconds, 1-90)
```

### Validation
- `file`: Required, audio file (audio/webm, audio/ogg, audio/mp4)
- `file.size`: Must be < 10MB
- `file.type`: Must match valid MIME type
- `sessionId`: Required, non-empty string
- `questionId`: Required, non-empty string
- `duration`: Required, integer between 1 and 90

---

## Response

### Success (200 OK)

```json
{
  "success": true,
  "data": {
    "recordingId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "fileSize": 1024000,
    "duration": 45,
    "uploadDuration": 1234,
    "uploadAttempts": 1
  }
}
```

**Fields**:
- `recordingId` (string, UUID): Unique identifier for the recording
- `status` (string): Recording status ("recording" | "uploading" | "completed" | "failed")
- `fileSize` (number): File size in bytes
- `duration` (number): Recording duration in seconds
- `uploadDuration` (number): Upload duration in milliseconds
- `uploadAttempts` (number): Number of upload attempts (1 if successful on first try)

### Error Responses

#### 400 Bad Request - Validation Error
```json
{
  "error": "VALIDATION_ERROR",
  "message": "File size exceeds 10MB limit",
  "code": "FILE_TOO_LARGE"
}
```

#### 401 Unauthorized - Authentication Required
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

#### 403 Forbidden - Insufficient Permissions
```json
{
  "error": "FORBIDDEN",
  "message": "Active subscription required",
  "code": "SUBSCRIPTION_REQUIRED"
}
```

#### 413 Payload Too Large
```json
{
  "error": "PAYLOAD_TOO_LARGE",
  "message": "File size exceeds 10MB limit",
  "code": "FILE_TOO_LARGE"
}
```

#### 500 Internal Server Error
```json
{
  "error": "INTERNAL_ERROR",
  "message": "Upload failed. Please try again.",
  "code": "UPLOAD_FAILED"
}
```

---

## Business Logic

### Pre-Upload Validation
1. Verify user authentication via session token
2. Check user has active subscription (FR-005)
3. Validate file size, type, and duration
4. Generate unique UUID for recording

### Upload Process
1. Create recording record in database with status "uploading"
2. Upload file to Supabase Storage at path: `{userId}/{recordingId}.{ext}`
3. Update recording status to "completed" on success
4. Log analytics event: `upload.completed`

### Error Handling
1. On transient failure (network, timeout):
   - Retry with exponential backoff (max 3 attempts)
   - Log analytics event: `upload.retry`
2. On permanent failure (quota, validation):
   - Update status to "failed"
   - Log analytics event: `upload.failed`
   - Return appropriate error code

### Post-Upload
1. Set expiry date to 30 days from upload (FR-007)
2. Store metadata in `recordings` table
3. Return success response with recording ID

---

## Rate Limiting

- 10 uploads per user per minute
- 50 uploads per user per hour
- Returns 429 Too Many Requests if exceeded

---

## Analytics Events

Events logged to PostHog (FR-013):

```typescript
// On upload start
{
  event: "upload.started",
  properties: {
    recordingId: string,
    fileSize: number,
    duration: number
  }
}

// On upload progress (every 10% increment)
{
  event: "upload.progress",
  properties: {
    recordingId: string,
    progress: number
  }
}

// On retry
{
  event: "upload.retry",
  properties: {
    recordingId: string,
    attempt: number,
    errorCode: string
  }
}

// On completion
{
  event: "upload.completed",
  properties: {
    recordingId: string,
    uploadDuration: number,
    uploadAttempts: number
  }
}

// On failure
{
  event: "upload.failed",
  properties: {
    recordingId: string,
    errorCode: string,
    attempt: number
  }
}
```

---

## Zod Schema

```typescript
import { z } from "zod";

export const UploadRequestSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => file.size <= 10_000_000,
    "File size must be less than 10MB"
  ).refine(
    (file) => file.type.startsWith("audio/"),
    "File must be an audio file"
  ),
  sessionId: z.string().min(1),
  questionId: z.string().min(1),
  duration: z.number().int().min(1).max(90),
});

export const UploadResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    recordingId: z.uuid(),
    status: z.enum(["recording", "uploading", "completed", "failed"]),
    fileSize: z.number().int().positive(),
    duration: z.number().int().min(1).max(90),
    uploadDuration: z.number().int().nonnegative(),
    uploadAttempts: z.number().int().positive(),
  }),
});
```

---

## Example Usage

```typescript
// Client-side upload
const formData = new FormData();
formData.append("file", audioBlob, "recording.webm");
formData.append("sessionId", sessionId);
formData.append("questionId", questionId);
formData.append("duration", duration.toString());

const response = await fetch("/api/upload", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${sessionToken}`,
  },
  body: formData,
});

const result = await response.json();

if (result.success) {
  console.log("Recording uploaded:", result.data.recordingId);
} else {
  console.error("Upload failed:", result.error);
}
```
