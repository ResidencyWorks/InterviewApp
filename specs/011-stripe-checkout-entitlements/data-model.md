# Data Model: Stripe Checkout → Entitlements Cache

**Date**: 2025-01-27
**Branch**: `011-stripe-checkout-entitlements`
**Purpose**: Define entities, relationships, and validation rules for Stripe checkout and entitlements caching

## Core Entities

### 1. CheckoutSession

**Purpose**: Represents a payment session created for a user to purchase entitlements.

```typescript
interface CheckoutSession {
  id: string;                          // Stripe checkout session ID
  userId: string;                       // User identifier (UUID)
  entitlementLevel: "FREE" | "TRIAL" | "PRO";  // Entitlement level being purchased
  url: string;                          // Stripe checkout URL for redirect
  status: "open" | "complete" | "expired";    // Session status
  createdAt: Date;                     // Session creation timestamp
  expiresAt?: Date;                    // Session expiration timestamp
}
```

**Validation Rules**:
- User ID must be a valid UUID
- Entitlement level must be one of: "FREE", "TRIAL", "PRO"
- URL must be a valid HTTPS URL
- Created timestamp must be before expiration (if set)

**State Transitions**:
- `open` → `complete` (when payment succeeds)
- `open` → `expired` (when session expires without payment)
- `complete` → (terminal state)

**Storage**: Ephemeral - stored in Stripe, referenced via session ID. Metadata stored in Stripe session metadata.

---

### 2. Entitlement

**Purpose**: Represents a user's access level and permissions.

```typescript
interface Entitlement {
  id: string;                          // UUID primary key
  userId: string;                       // User identifier (UUID, foreign key)
  entitlementLevel: "FREE" | "TRIAL" | "PRO";  // Access level
  expiresAt: Date;                     // Entitlement expiration timestamp
  createdAt: Date;                     // Creation timestamp
  updatedAt: Date;                     // Last update timestamp
  stripeEventId?: string;              // Stripe event ID that granted this entitlement
}
```

**Validation Rules**:
- User ID must exist in users table
- Entitlement level must be valid enum value
- Expires at must be in the future (or null for permanent entitlements)
- Created at must be before updated at
- Stripe event ID must be unique (for idempotency)

**State Transitions**:
- Created → Active (when granted via webhook)
- Active → Expired (when expires_at is reached)
- Active → Revoked (when subscription cancelled)

**Storage**:
- Primary: `user_entitlements` table in Supabase PostgreSQL
- Cache: Redis key `entitlements:{userId}` with 1-hour TTL

---

### 3. WebhookEvent

**Purpose**: Represents a payment confirmation notification from Stripe.

```typescript
interface WebhookEvent {
  id: string;                          // Stripe event ID (used for idempotency)
  type: string;                        // Event type (e.g., "checkout.session.completed")
  userId?: string;                     // User ID extracted from session metadata
  entitlementLevel?: "FREE" | "TRIAL" | "PRO";  // Entitlement level from metadata
  processed: boolean;                  // Whether event has been processed
  processedAt?: Date;                  // When event was processed
  createdAt: Date;                     // Event creation timestamp
  signature: string;                   // Stripe webhook signature (for verification)
}
```

**Validation Rules**:
- Event ID must be unique (Stripe guarantees this)
- Event type must be a valid Stripe event type
- Signature must be valid (verified via Stripe SDK)
- Processed flag prevents duplicate processing

**State Transitions**:
- Received → Verified (signature validation)
- Verified → Processed (entitlements granted)
- Processed → (terminal state, duplicates skipped)

**Storage**:
- Idempotency tracking: Redis key `webhook:event:{eventId}` with 24-hour TTL
- Event details: Logged for audit, not persisted in database

---

## Relationships

### Primary Relationships

1. **User → Entitlement** (1:many)
   - One user can have multiple entitlement records (historical)
   - Current entitlement is the most recent non-expired record
   - Cascade delete: Entitlements deleted when user deleted

2. **CheckoutSession → Entitlement** (1:1, indirect)
   - One checkout session can result in one entitlement grant
   - Linked via Stripe event ID and user ID
   - Session completion triggers webhook that creates entitlement

3. **WebhookEvent → Entitlement** (1:1)
   - One webhook event creates/updates one entitlement record
   - Event ID ensures idempotency (same event cannot create duplicate entitlements)

### Secondary Relationships

1. **User → CheckoutSession** (1:many)
   - One user can create multiple checkout sessions
   - Sessions are ephemeral (stored in Stripe, not database)

---

## Database Schema (Supabase)

### Tables

```sql
-- User entitlements table (existing, may need enhancements)
CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  entitlement_level user_entitlement_level NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  stripe_event_id TEXT UNIQUE,  -- For idempotency tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user entitlement lookups
CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_id ON public.user_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_stripe_event_id ON public.user_entitlements(stripe_event_id);

-- Index for expiration queries
CREATE INDEX IF NOT EXISTS idx_user_entitlements_expires_at ON public.user_entitlements(expires_at);
```

### Constraints

- `user_id` must reference existing user
- `entitlement_level` must be valid enum value
- `stripe_event_id` must be unique (prevents duplicate processing)
- `expires_at` must be in the future when created

---

## Cache Schema (Redis)

### Key Patterns

```
entitlements:{userId}                    # User entitlement cache (TTL: 3600s)
webhook:event:{eventId}                  # Webhook idempotency tracking (TTL: 86400s)
```

### Cache Structure

```typescript
// entitlements:{userId}
type CachedEntitlement = "FREE" | "TRIAL" | "PRO";

// webhook:event:{eventId}
type CachedEventId = string;  // Just the event ID as value, TTL tracks expiration
```

### Cache Invalidation Rules

- Invalidate `entitlements:{userId}` when:
  - Entitlement is updated via webhook
  - Entitlement expires (checked on read)
  - Entitlement is revoked
- `webhook:event:{eventId}` expires automatically via TTL (24 hours)

---

## Validation Rules Summary

### CheckoutSession Creation

- User must be authenticated
- Entitlement level must be specified and valid
- User ID must be valid UUID
- Session creation must succeed in Stripe

### Webhook Processing

- Signature must be valid (Stripe verification)
- Event ID must not have been processed (idempotency check)
- User ID must be extractable from session metadata
- Entitlement level must match session metadata
- Database write must succeed (cache write can fail and retry)

### Entitlement Validation

- User ID must exist
- Entitlement must not be expired (check `expires_at`)
- Cache lookup should be fast (<100ms)
- Database fallback must work when cache unavailable

---

## Data Flow

### Checkout Flow

1. User requests checkout session → `POST /api/checkout/session`
2. System creates Stripe checkout session with user ID and entitlement level in metadata
3. System returns checkout URL to user
4. User completes payment on Stripe
5. Stripe sends webhook → `POST /api/webhooks/stripe`

### Webhook Processing Flow

1. Receive webhook request
2. Verify signature (reject if invalid)
3. Check idempotency (Redis lookup by event.id)
4. If already processed → skip and return 200
5. Extract user ID and entitlement level from session metadata
6. Write entitlement to database (primary)
7. Write entitlement to cache (secondary, retry on failure)
8. Store event ID in idempotency store (Redis)
9. Return success response

### Entitlement Lookup Flow

1. Check Redis cache for `entitlements:{userId}`
2. If found and not expired → return cached value
3. If not found or expired → query database
4. If database query succeeds → update cache and return value
5. If cache unavailable → return database value (graceful degradation)
