# Feature Specification: Audio Upload for Drill Recordings

**Feature Branch**: `009-audio-upload-drill`
**Created**: 2025-01-27
**Status**: Draft
**Input**: User description: "Implement audio upload for drill recordings with Supabase storage and MediaRecorder API, including signed URL generation, upload progress tracking, and fallback UI for microphone-blocked states"

## Overview

This feature enables users to record and upload audio responses during drill practice sessions. Audio recordings are captured client-side using the MediaRecorder API, uploaded to secure cloud storage, and can be retrieved for playback via time-limited signed URLs. The feature includes fallback mechanisms for situations where microphone access is unavailable.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Record and Upload Audio Response (Priority: P1)

A user actively practicing with drill questions needs to record their verbal response and submit it for evaluation.

**Why this priority**: This is the core functionality that enables the primary user value proposition of audio-based interview practice.

**Independent Test**: Can be fully tested by recording audio, verifying upload completion, and confirming successful storage without needing playback or evaluation features.

**Acceptance Scenarios**:

1. **Given** a user is on a drill question page with an active session, **When** they click the record button, **Then** audio recording begins and a visual indicator shows recording is active
2. **Given** recording is in progress, **When** the user speaks for any duration up to 90 seconds, **Then** the recording continues without interruption
3. **Given** recording is active, **When** 90 seconds elapse, **Then** recording automatically stops
4. **Given** a recording exists, **When** the user clicks submit, **Then** the file uploads with visible progress indication
5. **Given** upload completes successfully, **Then** the user receives confirmation and the recording ID

---

### User Story 2 - Fallback Text Input for Mic-Blocked States (Priority: P2)

A user whose browser or operating system denies microphone permissions needs an alternative way to complete the drill response.

**Why this priority**: Provides inclusive access when microphone permissions are unavailable, ensuring no user is blocked from practicing.

**Independent Test**: Can be fully tested by simulating microphone permission denial and verifying text input functionality works independently.

**Acceptance Scenarios**:

1. **Given** microphone permission is denied or unavailable, **When** user attempts to record, **Then** a fallback text input area appears automatically
2. **Given** the fallback text input is displayed, **When** user types or pastes their response, **Then** the text is accepted and can be submitted
3. **Given** both recording and text input are attempted, **When** user submits, **Then** the system uses whichever input is available/complete

---

### User Story 3 - Monitor Upload Progress with Retry (Priority: P3)

A user with unreliable network connectivity needs to see upload progress and have failed uploads automatically retry.

**Why this priority**: Enhances user experience in challenging network conditions, reducing frustration and submission failures.

**Independent Test**: Can be fully tested by simulating network failures and verifying retry behavior and progress updates work independently.

**Acceptance Scenarios**:

1. **Given** an upload is in progress, **When** network connectivity is unstable, **Then** progress indicator updates reflect actual progress
2. **Given** an upload fails due to network error, **When** retry logic triggers, **Then** upload automatically retries with exponential backoff
3. **Given** upload fails after 3 retry attempts, **Then** user receives clear error message with manual retry option
4. **Given** upload succeeds after retry, **Then** progress indicator completes and user receives success confirmation

---

### Edge Cases

- What happens when user grants microphone permission during an active session?
- How does system handle recording stop if user closes browser tab during recording?
- What happens if upload fails due to quota/storage limits?
- How does system handle extremely slow network (<50 KB/s)?
- **FR-016**: If user starts new recording while upload is in progress, System MUST cancel the existing upload and start fresh recording
- How does system handle multiple rapid start/stop actions?
- What happens if user navigates away during upload retries?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to initiate audio recording with a single user action
- **FR-002**: System MUST automatically stop audio recording at 90 seconds maximum duration
- **FR-003**: System MUST provide visual feedback during recording (active indicator, timer, or progress)
- **FR-004**: Users MUST be able to manually stop recording before 90-second limit
- **FR-005**: System MUST validate user has active subscription/permission before allowing upload
- **FR-006**: System MUST assign unique identifier (UUID) to each uploaded file
- **FR-007**: System MUST enforce automatic file deletion after 30 days from upload date
- **FR-008**: System MUST generate signed URLs expiring within 15 minutes for playback access
- **FR-009**: System MUST detect microphone permission denial and display fallback text input
- **FR-010**: Users MUST be able to manually switch between recording and text input modes
- **FR-011**: System MUST display real-time upload progress percentage
- **FR-012**: System MUST automatically retry failed uploads up to 3 times with exponential backoff (base delay: 1s, multiplier: 2x, jitter: ±25%, attempts: 1s, 2s, 4s)
- **FR-013**: System MUST log upload progress events to analytics service (start, progress every 10%, retry, completion, failure)
- **FR-014**: System MUST validate file metadata (duration, size, format) before accepting upload
- **FR-015**: Users MUST receive clear success/error messages after upload completion or failure

### Non-Functional Requirements

- **NFR-001**: Upload API p95 response time should be under 2 seconds for typical network conditions
- **NFR-002**: Signed URL generation should complete in under 500ms (p95)
- **NFR-003**: Upload progress updates should refresh at least every 1 second during active upload
- **NFR-004**: File storage must comply with PHI (Protected Health Information) retention and security policies
- **NFR-005**: Bucket access policies must limit read/write to authenticated service role only

### Key Entities *(include if feature involves data)*

- **Audio Recording**: Represents a single user-recorded audio file, includes unique identifier, timestamp, duration, file size, user ID, and storage location
- **Upload Session**: Tracks upload attempt with status, progress percentage, retry count, and associated recording
- **Signed URL**: Time-limited access credential for playback, includes recording reference, expiry timestamp, and access token

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users successfully record and upload audio responses within 90 seconds in 95% of attempts
- **SC-002**: Upload completion rate (with retries) is at least 98% under normal network conditions
- **SC-003**: Average time from record start to upload completion is under 95 seconds for typical responses
- **SC-004**: Users who encounter microphone permission issues successfully complete responses using fallback input in 100% of cases
- **SC-005**: File deletion occurs automatically within 30 days for 100% of uploaded recordings
- **SC-006**: Signed URLs for playback are valid and accessible within 15 minutes for 99.9% of generation attempts
- **SC-007**: Upload retry logic successfully recovers from transient network failures in at least 80% of cases within retry limit
- **SC-008**: Upload progress indicator updates at least every 1 second during active upload for 100% of uploads

## Assumptions

- Network connectivity is generally stable, with occasional transient failures
- Audio files are typically under 5MB in size after compression
- Users understand basic recording UI conventions (play/stop/pause indicators)
- File format compatibility (WebM, MP3, or container format) is handled transparently
- Supabase storage bucket is configured with appropriate CORS policies for direct client uploads
- Service role credentials are securely managed and rotated per security policy

## Out of Scope

- Video recording capabilities
- Audio editing/trimming functionality
- Multiple file uploads in single session
- Offline recording with deferred upload
- Audio quality enhancement or noise reduction
- Real-time transcription during recording
- WebSocket-based live progress streaming
- Advanced analytics on audio content

## Dependencies

- Supabase project with Storage enabled
- Supabase client SDK configured in application
- User authentication/session management for entitlement validation
- Analytics service (PostHog) for progress logging
- Zod library for input validation schemas
