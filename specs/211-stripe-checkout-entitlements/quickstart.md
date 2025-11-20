# Quick Start: Stripe Checkout → Entitlements Cache

**Feature**: `011-stripe-checkout-entitlements`
**Date**: 2025-01-27

## Overview

This feature implements secure Stripe checkout integration with idempotent webhook processing and Redis caching for entitlements. Users can purchase entitlements via Stripe Checkout, and the system reliably processes payment confirmations with duplicate protection.

## Prerequisites

- Node.js LTS installed
- pnpm package manager
- Stripe account with test mode keys
- Supabase project with `user_entitlements` table
- Upstash Redis instance
- Environment variables configured (see below)

## Environment Variables

Add to `.env.local`:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Upstash Redis (existing)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

## Setup Steps

### 1. Checkout Feature Branch

```bash
git fetch
git checkout 011-stripe-checkout-entitlements
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Database Setup

Ensure the `user_entitlements` table exists with the schema from `data-model.md`:

```sql
CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  entitlement_level user_entitlement_level NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  stripe_event_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Stripe Webhook Configuration

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select event: `checkout.session.completed`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 5. Run Development Server

```bash
pnpm dev
```

## Testing the Feature

### 1. Create Checkout Session

```bash
curl -X POST http://localhost:3000/api/checkout/session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <session_token>" \
  -d '{
    "entitlementLevel": "PRO"
  }'
```

Expected response:
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/...",
  "expiresAt": "2025-01-27T12:00:00Z"
}
```

### 2. Complete Checkout

1. Open the returned `url` in a browser
2. Use Stripe test card: `4242 4242 4242 4242`
3. Complete the payment

### 3. Verify Webhook Processing

Check logs for webhook processing:
- Event ID logged
- Entitlement written to database
- Cache updated
- Idempotency check performed

### 4. Test Idempotency

Replay the same webhook event (using Stripe CLI or dashboard):
- Second delivery should return `{"ok": true, "idempotent": true}`
- No duplicate entitlements created
- Logs show "skipped replay"

### 5. Verify Entitlement Caching

```bash
# Check Redis cache
redis-cli GET "entitlements:{userId}"

# Should return: "PRO" (or cached entitlement level)
```

## Running Tests

### Unit Tests

```bash
pnpm test:unit
```

Tests cover:
- Checkout session creation
- Webhook signature verification
- Idempotency store operations
- Cache fallback logic

### Integration Tests

```bash
pnpm test:integration
```

Tests cover:
- End-to-end checkout flow
- Webhook processing with real Stripe events
- Idempotency replay scenarios
- Database and cache persistence

### Replay Test (Idempotency)

```bash
pnpm test:integration -- tests/integration/webhooks/idempotency-replay.test.ts
```

This test simulates duplicate webhook delivery and verifies:
- Second delivery is skipped
- Logs show "skipped replay"
- No duplicate entitlements created

## Architecture Overview

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /api/checkout/session
       ▼
┌─────────────────────┐
│  Checkout Route     │
│  (Next.js API)      │
└──────┬──────────────┘
       │ Create Stripe Session
       ▼
┌─────────────────────┐
│   Stripe API       │
└────────────────────┘
       │
       │ User completes payment
       ▼
┌─────────────────────┐
│  Stripe Webhook     │
│  POST /webhooks/    │
└──────┬──────────────┘
       │
       ├─► Verify Signature
       ├─► Check Idempotency (Redis)
       ├─► Write to Database (Supabase)
       └─► Write to Cache (Redis, async retry)
```

## Key Components

1. **Checkout Session Creation** (`src/app/api/checkout/session/route.ts`)
   - Creates Stripe checkout session
   - Includes user ID and entitlement level in metadata

2. **Webhook Handler** (`src/app/api/webhooks/stripe/route.ts`)
   - Verifies Stripe signature
   - Checks idempotency using event ID
   - Writes entitlements to database and cache

3. **Idempotency Store** (`src/infrastructure/webhooks/IdempotencyStore.ts`)
   - Tracks processed event IDs in Redis
   - Prevents duplicate webhook processing

4. **Entitlement Cache** (`src/infrastructure/redis/index.ts`)
   - Caches entitlements with 1-hour TTL
   - Falls back to database on cache miss

## Troubleshooting

### Webhook Signature Verification Fails

- Check `STRIPE_WEBHOOK_SECRET` is correct
- Ensure raw request body is used (not parsed JSON)
- Verify webhook endpoint URL matches Stripe dashboard

### Idempotency Not Working

- Check Redis connection
- Verify event IDs are being stored
- Check TTL on idempotency keys (should be 24 hours)

### Cache Not Updating

- Check Redis connection
- Verify cache write retry logic
- Check logs for async retry attempts

### Entitlements Not Granted

- Verify webhook is receiving events
- Check database write succeeded
- Verify user ID extraction from session metadata

## Next Steps

After implementation:
1. Run full test suite
2. Verify idempotency with replay test
3. Monitor webhook processing in production
4. Set up alerts for webhook failures

## Related Documentation

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Data Model](./data-model.md)
- [API Contracts](./contracts/api-specification.md)
- [Research](./research.md)
