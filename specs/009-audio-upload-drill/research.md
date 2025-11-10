# Research: Audio Upload for Drill Recordings

**Feature**: 009-audio-upload-drill
**Date**: 2025-01-27
**Status**: Complete

## Summary

This document captures research decisions for implementing client-side audio recording, secure cloud storage upload, and signed URL generation for drill practice recordings.

---

## MediaRecorder API for Audio Capture

**Decision**: Use native MediaRecorder Web API for client-side audio recording.

**Rationale**:
- Native browser API with broad support (Chrome 47+, Firefox 25+, Safari 14.1+)
- No external dependencies required
- Built-in format handling (WebM/OGG auto-selection based on browser)
- Direct access to audio streams with minimal latency
- Automatic encoding/compression handled by browser

**Alternatives Considered**:
- **Web Audio API**: More complex, requires manual buffer management and encoding
- **Third-party libraries (wavesurfer.js, RecordRTC)**: Additional bundle size without significant benefit
- **Server-side recording**: Increased latency, bandwidth cost, and infrastructure complexity

**Implementation Notes**:
- Use `MediaRecorder.isTypeSupported()` to detect format support
- Prefer `audio/webm;codecs=opus` for best quality/size ratio
- Handle `ondataavailable` events to collect audio chunks
- Enforce 90-second maximum via `setTimeout` rather than relying on memory limits
- Trigger automatic stop on duration limit to prevent UI inconsistencies

---

## Supabase Storage for File Persistence

**Decision**: Use Supabase Storage with dedicated `drill-recordings` bucket.

**Rationale**:
- Native integration with existing Supabase auth/session management
- Built-in access control via Row Level Security (RLS) policies
- Automatic CDN distribution for signed URLs
- Lifecycle policies for automatic cleanup (30-day retention)
- Service role access for secure backend operations
- Cost-effective storage with predictable pricing

**Alternatives Considered**:
- **AWS S3**: Requires additional auth setup, CDN configuration, and lifecycle policies
- **Google Cloud Storage**: Similar complexity to S3 with no existing integration
- **Local file storage**: Not suitable for distributed deployment
- **Temporary storage**: Doesn't meet 30-day retention requirement

**Implementation Notes**:
- Create bucket as private (no public access)
- Configure RLS policies to restrict access to service role only
- Use UUID for file names to prevent collisions and enumeration
- Store metadata (user_id, timestamp, duration) in separate PostgreSQL table
- Configure bucket lifecycle policy for automatic deletion after 30 days

---

## Signed URL Generation for Playback

**Decision**: Generate time-limited signed URLs (15 minutes) using Supabase client libraries.

**Rationale**:
- Supabase provides native `createSignedUrl()` method with built-in expiry
- No manual token generation or cryptographic implementation needed
- Automatic URL signing with HMAC for security
- CDN-backed URL provides fast global access
- Expiry enforcement handled by storage layer

**Alternatives Considered**:
- **JWT-based URLs**: Requires custom signing logic and token validation
- **Public URLs with time-based auth parameters**: Less secure, requires custom proxy
- **Long-lived URLs**: Security risk if URLs are leaked or intercepted
- **Pre-signed URLs (S3-style)**: Supabase doesn't support this pattern natively

**Implementation Notes**:
- Use `storage.createSignedUrl(bucket, path, expiresIn)` method
- Set `expiresIn` to 15 minutes (900 seconds)
- Generate URLs server-side to protect service role credentials
- Store signing configuration in environment variables
- Implement client-side URL expiry handling with fallback messaging

---

## Exponential Backoff Retry Strategy

**Decision**: Implement exponential backoff with jitter for upload retries (max 3 attempts).

**Rationale**:
- Proven pattern for handling transient network failures
- Prevents thundering herd with jitter randomization
- Exponential delay (1s, 2s, 4s) balances user experience with server load
- 3 attempts provide reasonable success probability while limiting wait time
- Industry standard approach used by major APIs (AWS, Google Cloud)

**Alternatives Considered**:
- **Linear backoff**: Insufficient delay for persistent network issues
- **Fixed interval**: Doesn't scale with varying failure durations
- **No retries**: Poor user experience on mobile/unstable networks
- **Unlimited retries**: Risk of resource exhaustion and poor UX

**Implementation Notes**:
- Base delay: 1 second
- Multiplier: 2x per attempt (1s, 2s, 4s)
- Jitter: ±25% randomization to prevent synchronized retries
- Max attempts: 3 (total wait time ~7s worst case)
- Only retry on retryable errors (network timeout, 5xx server errors)
- Don't retry on client errors (4xx) or auth failures (401)

---

## File Upload Progress Tracking

**Decision**: Use XMLHttpRequest or fetch with manual progress tracking via array buffer slicing.

**Rationale**:
- Native browser APIs provide progress events (`XMLHttpRequest.upload.onprogress`)
- No additional dependencies required
- Real-time progress updates (every 1 second or per chunk)
- Ability to cancel upload mid-transfer
- Works with Supabase client library

**Alternatives Considered**:
- **chunked-upload library**: Additional dependency without significant benefit for files <5MB
- **WebSocket streaming**: Over-engineered for single file upload, adds complexity
- **Server-Sent Events (SSE)**: Doesn't provide upload-side progress
- **Polling-based progress**: Inaccurate, adds server load

**Implementation Notes**:
- Use `XHR` for browsers that support it (Chrome, Firefox, Safari 12+)
- Use `fetch` with `ReadableStream` for modern browsers
- Emit progress events to UI component on every 1% change
- Calculate `(bytesSent / totalBytes) * 100` for percentage
- Store progress in React state for real-time UI updates

---

## Audio Format Compatibility

**Decision**: Let browser auto-select format, normalize on upload to standard container.

**Rationale**:
- Browsers choose optimal format automatically based on codec support
- Chrome/Firefox prefer WebM (Opus codec), Safari prefers AAC (M4A)
- Manual format enforcement adds complexity and may reduce quality
- Client-side transcoding not feasible in browser without large libraries

**Alternatives Considered**:
- **Force WebM encoding**: May fail on Safari, requires additional fallback logic
- **Force WAV/MP3**: Unsupported by MediaRecorder API natively
- **Client-side transcoding (ffmpeg.wasm)**: 2MB+ library, significant bundle size increase
- **Server-side transcoding**: Additional processing cost and latency

**Implementation Notes**:
- Accept `audio/webm`, `audio/ogg`, `audio/mp4` from different browsers
- Validate format on server-side during upload
- Store format in metadata for playback compatibility
- Future: Add server-side transcoding for unified playback format if needed

---

## Dependencies

- **@supabase/supabase-js** (^2.x): Official Supabase client library
- **zod** (^3.x): Schema validation for request/response types (already in project)
- **shadcn/ui**: Progress bar and UI components (already in project)
- No additional dependencies required for MediaRecorder (native API)

---

## Browser Compatibility Matrix

| Browser | MediaRecorder | Upload Progress | Signed URLs | Status |
|---------|---------------|-----------------|-------------|--------|
| Chrome 47+ | ✅ | ✅ | ✅ | Supported |
| Firefox 25+ | ✅ | ✅ | ✅ | Supported |
| Safari 14.1+ | ✅ | ✅ | ✅ | Supported |
| Edge 79+ | ✅ | ✅ | ✅ | Supported |
| Safari <14.1 | ❌ | ✅ | ✅ | Fallback to text input |

---

## Security Considerations

- **Service role credentials**: Never expose in client code, store in environment variables
- **Bucket access**: Private bucket with RLS policies restricting access to service role only
- **Signed URLs**: Time-limited (15 minutes) to prevent unauthorized long-term access
- **File validation**: Check size, format, duration on server-side before storage
- **User entitlement**: Validate active subscription before allowing upload (FR-005)
- **PHI compliance**: 30-day retention policy aligns with data minimization principles
