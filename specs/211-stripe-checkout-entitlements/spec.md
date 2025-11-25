# Feature Specification: Stripe Checkout → Entitlements Cache

**Feature Branch**: `011-stripe-checkout-entitlements`
**Created**: 2025-01-27
**Status**: Draft
**Input**: User description: "M2 – Stripe Checkout → Entitlements Cache

Objective: Implement secure, idempotent Stripe integration with DB + Redis caching for entitlements.

Task	Specification Description

1. Implement POST /api/checkout/session	Build API route for checkout creation using Stripe SDK. Include entitlement metadata in session creation. Use test mode keys for development.

2. Implement Stripe webhook handler with idempotency check	Create a webhook route with raw body parsing. Verify signatures. Implement idempotent write to Supabase (entitlements table) and Upstash Redis (entitlements:{userId}) with TTL.

3. Add entitlement caching in Redis (1-hour TTL)	Cache entitlements for quick validation. TTL = 3600 seconds. Add logic to invalidate cache on Stripe event expiration.

4. Validate DB + Redis write via replay test	Add integration test simulating double webhook delivery to confirm second delivery is skipped. Acceptance proof: logs showing "skipped replay."

5. Write unit + integration tests for webhook flow	Cover success, replay, and invalid signature scenarios. Validate both DB and cache persistence."

## Clarifications

### Session 2025-01-27

- Q: If database write succeeds but cache write fails during webhook processing, what should happen? → A: Database write is primary; if DB succeeds, return success and retry cache write asynchronously
- Q: What identifier should be used to detect duplicate webhook events for idempotency? → A: Use Stripe event ID (event.id) as the idempotency key
- Q: How should the system behave when Redis cache is unavailable during entitlement validation? → A: Fall back to database lookup; continue operating without cache
- Q: How should the entitlement level being purchased be determined when creating a checkout session? → A: Entitlement level is specified in the checkout session request (explicit parameter)
- Q: When should cached entitlements be invalidated on expiration? → A: Invalidate cache when entitlements expire (based on expiration timestamp in entitlement data)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Initiate Secure Checkout for Entitlements (Priority: P1)

A user wants to purchase access to premium features. They request a checkout session, which redirects them to a secure payment page where they can complete their purchase. The checkout session includes their user information and the entitlement level they're purchasing.

**Why this priority**: Users cannot purchase entitlements without this foundational capability. This is the entry point for the entire payment flow.

**Independent Test**: Can be fully tested by creating a checkout session request and verifying a valid payment URL is returned. The session can be tested independently without completing a purchase.

**Acceptance Scenarios**:

1. **Given** an authenticated user wants to purchase entitlements, **When** they request a checkout session, **Then** they receive a secure payment URL that includes their user information and entitlement metadata
2. **Given** a user requests a checkout session, **When** the system creates the session, **Then** the session includes metadata that links the purchase to their account
3. **Given** a user completes checkout on the payment provider's page, **When** payment succeeds, **Then** the system is notified via webhook to grant entitlements

---

### User Story 2 - Reliable Entitlement Processing Without Duplicates (Priority: P2)

When a payment is confirmed, the system must reliably grant entitlements to the user. Even if the payment provider sends duplicate notifications (which can happen during network issues or retries), the system must process the entitlement exactly once without creating duplicate records or granting duplicate access.

**Why this priority**: Duplicate processing would corrupt user data, grant unintended access, or cause billing discrepancies. This ensures data integrity and prevents financial errors.

**Independent Test**: Can be fully tested by simulating the same payment confirmation being received twice and verifying that entitlements are granted only once, with the second attempt being safely ignored.

**Acceptance Scenarios**:

1. **Given** a payment confirmation is received for a user, **When** the system processes the webhook, **Then** entitlements are written to the database, and cache is updated (with retry if cache write initially fails)
2. **Given** the same payment confirmation is received a second time, **When** the system processes the duplicate webhook, **Then** the system recognizes it as already processed and skips duplicate writes
3. **Given** a payment confirmation with an invalid signature, **When** the system receives the webhook, **Then** the system rejects it without processing entitlements

---

### User Story 3 - Fast Entitlement Validation for Access Control (Priority: P3)

When users attempt to access premium features, the system must quickly determine their access level. Entitlement checks happen frequently during normal usage, so they must be fast to avoid degrading user experience. The system caches entitlements for rapid lookups while maintaining accuracy.

**Why this priority**: Slow entitlement checks would create noticeable delays when users navigate between features. Caching enables sub-second access decisions while maintaining data consistency.

**Independent Test**: Can be fully tested by checking a user's entitlements multiple times and verifying responses are fast and consistent, with cache invalidation working correctly when entitlements expire.

**Acceptance Scenarios**:

1. **Given** a user has active entitlements, **When** the system checks their access level, **Then** the response is returned quickly from cache (or from database if cache is unavailable)
2. **Given** cached entitlements expire after the configured time period, **When** the system checks entitlements, **Then** the cache is refreshed from the database
3. **Given** a user's entitlements are updated via webhook, **When** the update completes, **Then** the cache is updated to reflect the new entitlements immediately

---

### Edge Cases

- What happens when the payment provider sends the same webhook multiple times due to network retries?
- How does the system handle webhooks received out of order (e.g., subscription update before subscription creation)?
- What happens when the database write succeeds but the cache write fails? → System returns success and retries cache write asynchronously; database is source of truth
- How does the system handle webhook signature verification failures?
- What happens when a checkout session is created but the user never completes payment?
- How does the system handle entitlements that expire while cached?
- What happens when the cache is unavailable but the database is accessible? → System falls back to database lookup; continues operating without cache degradation

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an API endpoint that creates secure checkout sessions for entitlement purchases
- **FR-002**: System MUST include user identification and entitlement metadata in checkout session creation. The entitlement level being purchased MUST be specified as an explicit parameter in the checkout session request
- **FR-003**: System MUST verify webhook signatures from the payment provider before processing any payment confirmations
- **FR-004**: System MUST process payment confirmations idempotently using Stripe event ID (event.id) as the idempotency key, ensuring duplicate webhooks do not create duplicate entitlements
- **FR-005**: System MUST write entitlements to the database when payment is confirmed
- **FR-006**: System MUST cache entitlements in Redis with a 1-hour expiration time for fast access validation. If cache is unavailable, system MUST fall back to database lookup to continue operating
- **FR-007**: System MUST write entitlements to the database as the primary operation when processing webhooks. If database write succeeds but cache write fails, the system MUST return success and retry cache write asynchronously
- **FR-008**: System MUST recognize and skip processing of duplicate webhook events that have already been processed
- **FR-009**: System MUST invalidate cached entitlements when they expire (based on expiration timestamp in entitlement data) or are revoked
- **FR-010**: System MUST handle webhook signature verification failures by rejecting invalid requests without processing
- **FR-011**: System MUST log when duplicate webhook deliveries are detected and skipped

### Key Entities *(include if feature involves data)*

- **CheckoutSession**: Represents a payment session created for a user to purchase entitlements. Contains user identification, entitlement level being purchased (specified explicitly in the request), and payment provider session identifier.

- **Entitlement**: Represents a user's access level and permissions. Contains user identifier, entitlement level, expiration timestamp, and creation/update timestamps. Stored in both database and cache.

- **WebhookEvent**: Represents a payment confirmation notification from the payment provider. Contains event identifier (Stripe event.id used for idempotency), event type, payment details, and signature for verification. Must be processed idempotently using the event identifier.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can initiate checkout and receive a payment URL within 2 seconds of request
- **SC-002**: System processes payment confirmations and grants entitlements within 5 seconds of webhook receipt
- **SC-003**: System correctly skips duplicate webhook processing 100% of the time when the same event is received multiple times
- **SC-004**: Entitlement validation checks return results in under 100 milliseconds for cached lookups
- **SC-005**: System maintains data consistency between database and cache, with cache accuracy of 99.9% or higher
- **SC-006**: All webhook signature verification failures are rejected without processing entitlements
- **SC-007**: Integration tests demonstrate idempotent processing by showing duplicate webhook deliveries are skipped with appropriate logging
