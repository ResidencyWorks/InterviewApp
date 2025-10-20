# Feature Specification: M0 Core Loop – Interview Drills

**Feature Branch**: `001-m0-core-loop`
**Created**: 2025-01-27
**Status**: Draft
**Input**: User description: "M0 Core Loop – Interview Drills"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Login and Access Gated Routes (Priority: P1)

Users can log in via email magic link and access protected drill pages after checkout.

**Why this priority**: Authentication is the foundation for all other features. Without secure access control, users cannot access the core evaluation functionality, making this the most critical user journey.

**Independent Test**: Can be fully tested by verifying magic link authentication flow and route protection without requiring any other features to be implemented.

**Acceptance Scenarios**:

1. **Given** a user visits a protected route, **When** they are not authenticated, **Then** they are redirected to login
2. **Given** a user requests a magic link, **When** they provide a valid email, **Then** they receive a magic link email
3. **Given** a user clicks a valid magic link, **When** they complete the login flow, **Then** they are authenticated and can access protected routes
4. **Given** a user completes Stripe checkout, **When** the webhook is processed, **Then** their entitlements are cached in Redis and they can immediately access drills

---

### User Story 2 - Submit a Transcript for Evaluation (Priority: P1)

User submits a written or spoken response and receives AI-powered feedback.

**Why this priority**: This is the core value proposition of the application. Users need to be able to submit responses and receive meaningful feedback to practice interview skills.

**Independent Test**: Can be fully tested by submitting a response and verifying the evaluation API returns the expected structured feedback without requiring other user stories.

**Acceptance Scenarios**:

1. **Given** a user is on the drill page, **When** they paste or record a response, **Then** they can submit it for evaluation
2. **Given** a user submits a response, **When** the evaluation is processed, **Then** they receive a structured result with duration, word count, WPM, categories, feedback, and score
3. **Given** a user receives evaluation results, **When** the results are displayed, **Then** they see score chips with detailed feedback in popovers
4. **Given** a user submits an invalid response, **When** validation fails, **Then** they receive appropriate error messages

---

### User Story 3 - Load Content Pack (Priority: P1)

Admin/dev can load and swap a content pack (JSON file) at runtime.

**Why this priority**: Content packs are essential for the evaluation system to function. Without content packs, the evaluation API cannot provide meaningful feedback, making this critical for the core functionality.

**Independent Test**: Can be fully tested by uploading a valid JSON content pack and verifying it loads successfully without requiring user authentication or evaluation features.

**Acceptance Scenarios**:

1. **Given** an admin accesses the loader, **When** they upload a valid JSON content pack, **Then** the system performs dry-run validation
2. **Given** dry-run validation passes, **When** the admin confirms the upload, **Then** the content pack is hot-swapped without app redeploy
3. **Given** a content pack is loaded, **When** the system logs the event, **Then** PostHog receives the content_pack_loaded event with version and timestamp
4. **Given** an admin uploads an invalid content pack, **When** validation fails, **Then** the system rejects the upload with clear error messages

### Edge Cases

- What happens when a user's magic link expires before they click it?
- How does the system handle network failures during evaluation API calls?
- What happens when Redis is unavailable for entitlement checks?
- How does the system handle malformed or corrupted content pack files?
- What happens when the evaluation API returns an error or timeout?
- How does the system handle concurrent content pack uploads?
- What happens when a user submits an empty or extremely long response?
- How does the system handle Stripe webhook failures or duplicate events?

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST authenticate users via Supabase magic link (email only)
- **FR-002**: System MUST gate access to protected routes based on authentication status
- **FR-003**: System MUST cache user entitlements in Redis with 1-hour TTL
- **FR-004**: System MUST update entitlements instantly after Stripe webhook processing
- **FR-005**: System MUST provide `/api/evaluate` endpoint that accepts written or spoken responses
- **FR-006**: System MUST return structured evaluation results with duration, word count, WPM, categories, feedback, and overall score
- **FR-007**: System MUST use OpenAI Whisper for speech-to-text and GPT for evaluation
- **FR-008**: System MUST validate all evaluation inputs and outputs using Zod schemas
- **FR-009**: System MUST log `score_returned` event to PostHog on successful evaluation
- **FR-010**: System MUST support dry-run validation of content pack uploads
- **FR-011**: System MUST enable hot-swap of valid content packs without app redeploy
- **FR-012**: System MUST log `content_pack_loaded` event to PostHog with version and timestamp
- **FR-013**: System MUST reject invalid or malformed content pack files
- **FR-014**: System MUST display evaluation results using chip UI with detailed popovers
- **FR-015**: System MUST handle evaluation API errors gracefully with user-friendly messages

### Key Entities *(include if feature involves data)*

- **User**: Represents authenticated users with unique identifier, email address, and Stripe customer relationship
- **Entitlement**: Represents user access permissions with status levels (FREE, TRIAL, PRO) and caching metadata
- **EvaluationResult**: Represents the structured output from the evaluation API with metrics and feedback
- **ContentPack**: Represents the JSON configuration file containing evaluation criteria and content

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: Users can complete login and access drill pages within 10 seconds
- **SC-002**: Evaluation API returns structured results within 250ms in development environment
- **SC-003**: Redis entitlement cache expires after 1 hour and refreshes only on Stripe webhook events
- **SC-004**: Content pack hot-swap completes successfully without application redeployment
- **SC-005**: Evaluation results render with score chips and feedback within 500ms after response submission
- **SC-006**: 95% of valid evaluation requests return successful results without errors
- **SC-007**: Content pack validation rejects 100% of malformed or invalid JSON files
- **SC-008**: Magic link authentication succeeds for 99% of valid email addresses

## Assumptions

- Users will primarily access the application through web browsers
- Content packs will be provided in JSON format with a standardized schema
- Stripe webhook events will be processed reliably and in a timely manner
- Redis will be available for entitlement caching with minimal downtime
- OpenAI API services will be available and responsive for evaluation processing
- Users will have stable internet connections for real-time evaluation
- Magic link emails will be delivered successfully to user inboxes

## [RESOLVED CLARIFICATIONS]

1. **Rate Limiting for Evaluation API**: `/api/evaluate` will implement exponential backoff retry (max 3 attempts) with 1-second debouncing per user session. Rate limiting: 10 requests per minute per authenticated user, 3 requests per minute for unauthenticated users.

2. **Content Pack Fallback**: If no content pack is loaded, the system will display a maintenance message and disable evaluation functionality. If content pack loading fails, the system will retain the previous valid content pack and log the error for admin review.

3. **PostHog Tracking Scope**: PostHog will track both authenticated and unauthenticated users. Unauthenticated users will be tracked with anonymous IDs for basic usage analytics. Authenticated users will have enhanced tracking with user context for personalized analytics.
