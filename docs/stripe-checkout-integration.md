# Stripe Checkout Integration

This document describes the Stripe checkout integration for entitlement purchases in the InterviewApp.

## Overview

The Stripe checkout integration enables users to purchase entitlements (FREE, TRIAL, PRO) through secure Stripe checkout sessions. The system processes webhooks idempotently, stores entitlements in the database, and caches them in Redis for fast access validation.

## Architecture

### Components

1. **Checkout Session Creation** (`POST /api/checkout/session`)
   - Creates Stripe checkout sessions with user and entitlement metadata
   - Returns secure payment URL for redirect

2. **Webhook Processing** (`POST /api/webhooks/stripe`)
   - Processes `checkout.session.completed` events
   - Grants entitlements idempotently using Stripe event IDs
   - Writes to database (primary) and cache (secondary with async retry)

3. **Entitlement Cache** (`UserEntitlementCache`)
   - Fast entitlement lookups with 1-hour TTL
   - Automatic expiration checking and invalidation
   - Database fallback when cache unavailable

### Data Flow

```
User Request → Checkout Session Creation → Stripe Checkout → Payment
                                                                    ↓
Database ← Webhook Handler ← Stripe Webhook ← Payment Confirmation
   ↓
Redis Cache (with expiration checking)
```

## API Endpoints

### POST /api/checkout/session

Creates a Stripe checkout session for entitlement purchase.

**Authentication**: Required (user must be authenticated)

**Request Body**:
```json
{
  "entitlementLevel": "PRO"
}
```

**Response**:
```json
{
  "sessionId": "cs_test_123",
  "url": "https://checkout.stripe.com/test",
  "expiresAt": "2025-01-28T12:00:00Z"
}
```

**Error Responses**:
- `401 Unauthorized`: User not authenticated
- `400 Bad Request`: Invalid entitlement level
- `500 Internal Server Error`: Stripe API error

### POST /api/webhooks/stripe

Processes Stripe webhook events for payment confirmations.

**Authentication**: Not required (uses Stripe signature verification)

**Headers**:
- `stripe-signature`: Stripe webhook signature (required)

**Request Body**: Raw Stripe event JSON (not parsed)

**Response**:
```json
{
  "eventId": "evt_test_123",
  "eventType": "checkout.session.completed",
  "processed": true,
  "message": "Entitlement granted: PRO for user user_123"
}
```

**Error Responses**:
- `400 Bad Request`: Missing or invalid signature
- `500 Internal Server Error`: Webhook secret not configured

## Idempotency

The system ensures idempotent webhook processing using:

1. **Stripe Event ID**: Used as idempotency key in Redis (`webhook:event:{eventId}`)
2. **Database Unique Constraint**: `stripe_event_id` column prevents duplicate entitlements
3. **Redis TTL**: 24-hour expiration for idempotency records

Duplicate webhook deliveries are safely ignored with a `200 OK` response.

## Entitlement Caching

### Cache Structure

```typescript
{
  entitlementLevel: "PRO" | "TRIAL" | "FREE",
  expiresAt: "2025-01-28T12:00:00Z" // ISO 8601 timestamp
}
```

### Cache Behavior

- **TTL**: 1 hour (3600 seconds)
- **Expiration Checking**: Validates `expiresAt` on every read
- **Automatic Invalidation**: Expired entries are removed and database is queried
- **Database Fallback**: Queries database when cache miss or Redis unavailable
- **Cache Refresh**: Automatically refreshes cache from database on miss

### Performance

- **Cache Hit**: <100ms (target)
- **Cache Miss**: Falls back to database query (~50-200ms)
- **Redis Unavailable**: Gracefully falls back to database

## Database Schema

### user_entitlements Table

```sql
CREATE TABLE user_entitlements (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  entitlement_level user_entitlement_level NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  stripe_event_id TEXT UNIQUE,  -- For idempotency
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes**:
- `idx_user_entitlements_user_id`: Fast user lookups
- `idx_user_entitlements_stripe_event_id`: Idempotency checks
- `idx_user_entitlements_expires_at`: Expiration queries

## Environment Variables

Required Stripe environment variables:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...          # Stripe secret key (server-side)
STRIPE_PUBLISHABLE_KEY=pk_test_...     # Stripe publishable key (client-side)
STRIPE_WEBHOOK_SECRET=whsec_...        # Webhook signing secret

# Application URL (for redirect URLs)
NEXT_PUBLIC_APP_URL=https://your-app.com
```

## Security

1. **Webhook Signature Verification**: All webhooks are verified using Stripe's signature
2. **Authentication**: Checkout endpoint requires user authentication
3. **Input Validation**: Entitlement levels are validated using Zod schemas
4. **Idempotency**: Prevents duplicate processing of webhook events

## Error Handling

### Checkout Session Creation

- **Stripe API Errors**: Returned as `400 Bad Request` with error details
- **Authentication Errors**: Returned as `401 Unauthorized`
- **Validation Errors**: Returned as `400 Bad Request` with validation messages

### Webhook Processing

- **Invalid Signature**: Returns `400 Bad Request` without processing
- **Database Write Failure**: Returns `500 Internal Server Error`
- **Cache Write Failure**: Logged but doesn't fail the request (async retry)

## Monitoring

### Analytics Events

- `checkout_session_created`: When a checkout session is created
- `webhook_processed`: When a webhook is successfully processed
- `webhook_replay_skipped`: When a duplicate webhook is detected

### Error Tracking

- Webhook processing failures are tracked in Sentry
- Slow cache operations (>100ms) are logged as warnings
- Database fallback usage is logged for monitoring

## Testing

### Unit Tests

- `CreateCheckoutSessionUseCase.test.ts`: Use case logic
- `StripeIdempotencyStore.test.ts`: Idempotency store
- `UserEntitlementCache.test.ts`: Cache fallback logic

### Integration Tests

- `checkout/session.test.ts`: Checkout endpoint
- `webhooks/idempotency-replay.test.ts`: Duplicate webhook handling
- `webhooks/stripe.test.ts`: Signature verification
- `redis/entitlement-cache.test.ts`: Cache hit/miss scenarios
- `redis/entitlement-cache-expiration.test.ts`: Expiration handling

## Troubleshooting

### Checkout Session Not Created

1. Verify `STRIPE_SECRET_KEY` is set correctly
2. Check user authentication
3. Verify entitlement level is valid ("FREE", "TRIAL", "PRO")

### Webhook Not Processing

1. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
2. Check webhook signature in request headers
3. Verify event type is `checkout.session.completed`

### Entitlements Not Cached

1. Check Redis connection (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`)
2. Verify cache TTL is set correctly (1 hour)
3. Check expiration timestamp format (ISO 8601)

### Cache Always Misses

1. Verify Redis is accessible
2. Check cache key format: `user:{userId}:entitlement`
3. Verify expiration timestamp is in the future

## Related Documentation

- [Environment Setup](./environment-setup.md)
- [API Documentation](./api/README.md)
- [Database Schema](../supabase/migrations/20250127000030_add_stripe_event_id_to_entitlements.sql)
