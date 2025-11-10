# API Contracts: Stripe Checkout → Entitlements Cache

**Date**: 2025-01-27
**Branch**: `011-stripe-checkout-entitlements`
**Format**: OpenAPI 3.0 (simplified)

## Endpoints

### 1. POST /api/checkout/session

Creates a Stripe checkout session for entitlement purchase.

**Request**:

```typescript
POST /api/checkout/session
Content-Type: application/json
Authorization: Bearer <session_token>

{
  "entitlementLevel": "PRO" | "TRIAL" | "FREE"
}
```

**Response** (200 OK):

```typescript
{
  "sessionId": string,        // Stripe checkout session ID
  "url": string,              // Stripe checkout URL for redirect
  "expiresAt": string         // ISO 8601 timestamp
}
```

**Response** (400 Bad Request):

```typescript
{
  "error": string,           // Error message
  "code": "INVALID_ENTITLEMENT_LEVEL" | "UNAUTHORIZED" | "STRIPE_ERROR"
}
```

**Response** (401 Unauthorized):

```typescript
{
  "error": "Authentication required"
}
```

**Response** (500 Internal Server Error):

```typescript
{
  "error": "Internal server error"
}
```

---

### 2. POST /api/webhooks/stripe

Processes Stripe webhook events for payment confirmations.

**Request**:

```typescript
POST /api/webhooks/stripe
Content-Type: application/json
Stripe-Signature: <signature>

<raw request body>  // Must be raw body for signature verification
```

**Response** (200 OK - Success):

```typescript
{
  "eventId": string,          // Stripe event ID
  "eventType": string,        // Stripe event type
  "processed": boolean,       // true if processed, false if skipped (idempotent)
  "message": string,          // Processing result message
  "timestamp": string         // ISO 8601 timestamp
}
```

**Response** (200 OK - Idempotent):

```typescript
{
  "ok": true,
  "idempotent": true          // Event was already processed
}
```

**Response** (400 Bad Request):

```typescript
{
  "error": "Missing stripe signature" | "Invalid signature"
}
```

**Response** (500 Internal Server Error):

```typescript
{
  "error": "Webhook secret not configured" | "Internal server error"
}
```

---

## Request/Response Types

### CreateCheckoutSessionRequest

```typescript
interface CreateCheckoutSessionRequest {
  entitlementLevel: "FREE" | "TRIAL" | "PRO";
}
```

**Validation**:
- `entitlementLevel` is required
- Must be one of: "FREE", "TRIAL", "PRO"

### CreateCheckoutSessionResponse

```typescript
interface CreateCheckoutSessionResponse {
  sessionId: string;          // Stripe checkout session ID
  url: string;                 // Redirect URL
  expiresAt: string;           // ISO 8601 timestamp
}
```

### StripeWebhookResponse

```typescript
interface StripeWebhookResponse {
  eventId: string;            // Stripe event ID
  eventType: string;          // Event type
  processed: boolean;         // Whether event was processed
  message: string;            // Processing message
  timestamp: string;          // ISO 8601 timestamp
}
```

---

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_ENTITLEMENT_LEVEL` | Invalid entitlement level specified | 400 |
| `UNAUTHORIZED` | User not authenticated | 401 |
| `STRIPE_ERROR` | Stripe API error | 400 |
| `MISSING_SIGNATURE` | Webhook signature missing | 400 |
| `INVALID_SIGNATURE` | Webhook signature invalid | 400 |
| `WEBHOOK_SECRET_NOT_CONFIGURED` | Webhook secret missing | 500 |
| `INTERNAL_SERVER_ERROR` | Unexpected server error | 500 |

---

## Webhook Event Types

The system processes the following Stripe webhook events:

- `checkout.session.completed` - Grants entitlements when checkout completes

Other event types (subscription events, invoice events) are handled by existing webhook handler but are out of scope for this feature.

---

## Stripe Checkout Session Metadata

When creating a checkout session, the following metadata is included:

```typescript
{
  userId: string,              // User ID from authenticated session
  entitlementLevel: string    // Entitlement level being purchased
}
```

This metadata is used by the webhook handler to identify the user and entitlement level.

---

## Idempotency

### Checkout Session Creation

- Not idempotent by design (each request creates a new session)
- Sessions are unique and expire after a set time

### Webhook Processing

- Fully idempotent using Stripe event ID (`event.id`)
- Duplicate events return 200 OK with `idempotent: true`
- Event IDs are tracked in Redis with 24-hour TTL

---

## Rate Limiting

- Checkout session creation: Standard API rate limits apply
- Webhook processing: No rate limiting (Stripe controls delivery rate)

---

## Security

### Authentication

- Checkout session creation requires authenticated user session
- Webhook endpoint does not require authentication (uses signature verification)

### Signature Verification

- All webhook requests must include valid `Stripe-Signature` header
- Signature is verified using `stripe.webhooks.constructEvent()`
- Invalid signatures result in 400 Bad Request

### Data Validation

- All input is validated using Zod schemas
- Entitlement levels are validated against enum values
- User IDs are validated as UUIDs
