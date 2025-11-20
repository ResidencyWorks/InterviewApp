# API Contract: Generate Signed URL for Playback

**Endpoint**: `POST /api/recordings/{recordingId}/signed-url`
**Feature**: 009-audio-upload-drill
**Date**: 2025-01-27

## Overview

Generates a time-limited signed URL for accessing an audio recording file stored in Supabase Storage. The URL expires after 15 minutes for security.

---

## Request

### Endpoint
```
POST /api/recordings/{recordingId}/signed-url
```

### Path Parameters
- `recordingId` (string, UUID): Unique identifier for the recording

### Headers
```
Authorization: Bearer {session_token}
```

### Body
None (all data in path parameter)

### Validation
- `recordingId`: Required, must be valid UUID
- User must own the recording or have appropriate permissions

---

## Response

### Success (200 OK)

```json
{
  "success": true,
  "data": {
    "url": "https://storage.supabase.co/object/sign/...",
    "expiresAt": "2025-01-27T12:45:00Z"
  }
}
```

**Fields**:
- `url` (string): Full signed URL with embedded access token
- `expiresAt` (string, ISO 8601): URL expiry timestamp (always 15 minutes from generation)

### Error Responses

#### 400 Bad Request - Invalid ID
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid recording ID format",
  "code": "INVALID_UUID"
}
```

#### 401 Unauthorized
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

#### 403 Forbidden - Access Denied
```json
{
  "error": "FORBIDDEN",
  "message": "You do not have permission to access this recording",
  "code": "ACCESS_DENIED"
}
```

#### 404 Not Found
```json
{
  "error": "NOT_FOUND",
  "message": "Recording not found or has been deleted",
  "code": "RECORDING_NOT_FOUND"
}
```

#### 410 Gone - Expired
```json
{
  "error": "GONE",
  "message": "Recording has expired and been deleted",
  "code": "RECORDING_EXPIRED"
}
```

#### 500 Internal Server Error
```json
{
  "error": "INTERNAL_ERROR",
  "message": "Failed to generate signed URL",
  "code": "SIGNED_URL_FAILED"
}
```

---

## Business Logic

### Pre-Generation Validation
1. Verify user authentication via session token
2. Validate `recordingId` is valid UUID
3. Check recording exists in database
4. Verify recording has not expired (30-day limit)
5. Verify user owns the recording or has admin access

### URL Generation
1. Retrieve file path from database for the recording
2. Call Supabase `storage.createSignedUrl()` with:
   - Bucket: `drill-recordings`
   - Path: `{userId}/{recordingId}.{ext}`
   - Expires in: 900 seconds (15 minutes) (FR-008)
3. Return signed URL with expiry timestamp

### Error Handling
1. If recording not found: return 404
2. If recording expired: return 410
3. If user lacks permission: return 403
4. If Supabase fails: return 500

### Post-Generation
1. Log analytics event: `signed_url.generated`
2. Track URL generation for usage analytics
3. Return response with URL and expiry

---

## Constraints

### Expiry Time
- **Fixed**: Always 15 minutes (900 seconds) from generation time (FR-008)
- Cannot be customized or extended
- Must regenerate URL for continued access

### Rate Limiting
- 20 signed URL generations per user per minute
- 100 signed URL generations per user per hour
- Returns 429 Too Many Requests if exceeded

### Security
- URLs contain embedded HMAC signature
- Tokens are single-use (regeneration invalidates previous)
- Expiry enforced at storage layer (Supabase CDN)
- Cannot be accessed after expiry without regeneration

---

## Analytics Events

Events logged to PostHog:

```typescript
{
  event: "signed_url.generated",
  properties: {
    recordingId: string,
    userId: string,
    expiresAt: string
  }
}
```

---

## Zod Schema

```typescript
import { z } from "zod";

export const SignedUrlRequestParamsSchema = z.object({
  recordingId: z.uuid(),
});

export const SignedUrlResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    url: z.url(),
    expiresAt: z.string().datetime(),
  }),
});
```

---

## Example Usage

```typescript
// Generate signed URL for playback
const recordingId = "550e8400-e29b-41d4-a716-446655440000";

const response = await fetch(
  `/api/recordings/${recordingId}/signed-url`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  }
);

const result = await response.json();

if (result.success) {
  // Use URL immediately
  const audio = new Audio(result.data.url);
  audio.play();

  // Note: URL expires at result.data.expiresAt
  console.log("URL expires at:", result.data.expiresAt);
} else {
  console.error("Failed to generate URL:", result.error);
}
```

### Handling Expired URLs

```typescript
async function playRecordingWithRetry(recordingId: string) {
  try {
    const result = await generateSignedUrl(recordingId);
    const audio = new Audio(result.data.url);

    audio.addEventListener("error", async (e) => {
      if (e.message.includes("expired") || e.message.includes("403")) {
        // Regenerate URL and retry
        const newResult = await generateSignedUrl(recordingId);
        audio.src = newResult.data.url;
        audio.play();
      }
    });

    audio.play();
  } catch (error) {
    console.error("Playback failed:", error);
  }
}
```

---

## Notes

- Signed URLs can be embedded in `<audio>`, `<video>`, or used with `fetch()`
- URLs work with CORS-enabled CDN endpoints
- Regenerating a URL for the same recording creates a new URL with a fresh 15-minute expiry
- Previous URLs remain valid until their individual expiry times
- Failed URL generation should be retried (may be transient Supabase issues)
