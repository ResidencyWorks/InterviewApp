# Research: Stripe Checkout → Entitlements Cache

**Date**: 2025-01-27
**Feature**: Stripe Checkout → Entitlements Cache
**Branch**: `011-stripe-checkout-entitlements`

## Research Decisions

### 1. Idempotency Key Strategy

**Decision**: Use Stripe event ID (`event.id`) as the idempotency key for webhook processing.

**Rationale**:
- Stripe guarantees unique event IDs across all webhook deliveries
- Event IDs are immutable and reliable identifiers
- Simplifies idempotency checking without requiring custom key generation
- Aligns with Stripe's recommended best practices for webhook idempotency

**Alternatives considered**:
- Composite key (event ID + event type): Unnecessary complexity since event IDs are already unique
- Webhook signature as key: Signatures can vary between retries, making them unreliable
- Custom key (session ID + user ID): Requires additional logic and doesn't handle edge cases as well

**Implementation**: Store processed event IDs in a persistent store (Redis or database) with TTL to prevent duplicate processing.

---

### 2. Database vs Cache Write Strategy

**Decision**: Database write is primary; cache write is secondary with async retry on failure.

**Rationale**:
- Database is the source of truth for entitlements
- Cache failures should not block entitlement grants
- Async retry ensures eventual cache consistency
- Prevents user-facing errors when cache is temporarily unavailable

**Alternatives considered**:
- Strict atomicity (rollback both on failure): Too strict, would cause failures when cache has temporary issues
- Cache-first approach: Cache is not reliable enough to be primary source
- Best-effort cache (no retry): Would lead to cache inconsistency and poor performance

**Implementation**: Write to database first, then attempt cache write. If cache write fails, log error and retry asynchronously. Return success if database write succeeds.

---

### 3. Cache Fallback Strategy

**Decision**: Fall back to database lookup when Redis cache is unavailable.

**Rationale**:
- Ensures system continues operating during cache outages
- Database is always available and contains authoritative data
- Performance degradation is acceptable during cache outages
- Prevents user-facing errors

**Alternatives considered**:
- Return error when cache unavailable: Would break user experience
- Queue requests until cache available: Adds complexity and delays
- Return default "locked" level: Incorrect behavior, denies valid access

**Implementation**: Try cache lookup first. On cache error, fall back to database query. Update cache on successful database lookup.

---

### 4. Entitlement Level Determination

**Decision**: Entitlement level is specified explicitly as a parameter in the checkout session request.

**Rationale**:
- Clear and explicit contract between frontend and backend
- Allows flexibility for different entitlement tiers
- Simplifies validation and error handling
- Makes intent clear in API design

**Alternatives considered**:
- Derive from Stripe price/product ID: Couples implementation to Stripe product structure
- Fixed entitlement level: Not flexible for future tiers
- User's current level + upgrade path: Adds complexity and business logic to checkout

**Implementation**: Accept `entitlementLevel` parameter in POST /api/checkout/session request body. Include in Stripe checkout session metadata.

---

### 5. Cache Invalidation on Expiration

**Decision**: Invalidate cache when entitlements expire based on expiration timestamp in entitlement data.

**Rationale**:
- Entitlements have business-defined expiration times
- Cache should reflect actual entitlement status
- Stripe event expiration is not relevant to entitlement lifecycle
- TTL-based expiration is automatic but explicit invalidation ensures accuracy

**Alternatives considered**:
- Invalidate on Stripe event expiration: Events don't control entitlement lifecycle
- TTL-only (no explicit invalidation): May serve stale data briefly
- Invalidate on both: Unnecessary complexity

**Implementation**: Check entitlement expiration timestamp when reading from cache. If expired, invalidate cache entry and refresh from database. Also handle expiration in webhook processing when entitlements are revoked.

---

### 6. Idempotency Store Persistence

**Decision**: Use Redis for idempotency key storage (replacing in-memory store).

**Rationale**:
- In-memory store doesn't work in serverless/distributed environments
- Redis provides fast lookups with TTL support
- Aligns with existing Redis infrastructure
- Ensures idempotency across multiple server instances

**Alternatives considered**:
- Database storage: Slower lookups, adds database load
- In-memory with shared state: Doesn't work in serverless
- Stripe's idempotency: Only works for API calls, not webhooks

**Implementation**: Create `StripeIdempotencyStore` using Redis. Store event IDs with TTL (e.g., 24 hours) to prevent duplicate processing.

---

## Technology Patterns

### Stripe Checkout Session Creation

- Use Stripe SDK `stripe.checkout.sessions.create()`
- Include `client_reference_id` with user ID
- Include `metadata` with entitlement level
- Use test mode keys for development
- Return session URL for redirect

### Webhook Signature Verification

- Use `stripe.webhooks.constructEvent()` for signature verification
- Parse raw request body (not JSON) for signature verification
- Verify webhook secret from environment variables
- Reject requests with invalid signatures immediately

### Redis Caching Pattern

- Key format: `entitlements:{userId}`
- TTL: 3600 seconds (1 hour)
- Store entitlement level as string value
- Use existing `UserEntitlementCache` class
- Handle cache misses gracefully with database fallback

### Database Schema

- Use existing `user_entitlements` table
- Fields: `user_id`, `entitlement_level`, `expires_at`, `created_at`, `updated_at`
- Write idempotently using event ID tracking (separate table or Redis)

---

## References

- [Stripe Webhooks Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Stripe Checkout Session API](https://stripe.com/docs/api/checkout/sessions)
- [Stripe Webhook Idempotency](https://stripe.com/docs/webhooks/idempotency)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)
