# Owner Runbook

This runbook covers day-to-day operation for M0 core loop.

## Prerequisites
- Node 22.x, pnpm 10.x installed
- Environment variables configured in `.env.local`

## Setup

```bash
pnpm install
pnpm prepare
pnpm dev
```

The development server runs on `http://localhost:3000`

## Test Instructions

### Running Tests

**All tests:**
```bash
pnpm test
```

**Unit tests only:**
```bash
pnpm test:unit
```

**Integration tests:**
```bash
pnpm test:integration
```

**Watch mode (for development):**
```bash
pnpm test:watch
```

### Key Test Coverage

1. **Evaluation Schema** (`tests/evaluation-schema.*.test.ts`)
   - Happy path: Valid transcript → Zod schema validation passes
   - Failure path: Invalid data → Zod error thrown
   - Validates ResidencyWorks contract: `overall_score`, `category_chips`, `what_changed`, `practice_rule`

2. **Webhook Idempotency** (`tests/webhook-idempotency.int.test.ts`)
   - Stripe checkout.session.completed event replayed twice
   - Second event should be deduplicated (not processed again)
   - User's entitlements should only be granted once

3. **Content Pack Validation**
   - Sample pack (`sample-data/matchready_content_pack_v1.0.0.json`) should validate
   - Invalid JSON should raise Zod error
   - Dry-run activation should pass for valid pack

### Manual Testing

1. **Submit & Score Flow**
   - Navigate to `/practice`
   - Paste a sample transcript (> 50 words recommended)
   - Submit and observe loading spinner
   - Verify results display with:
     - Overall score (0–100)
     - 7 category chips (Communication, Problem Solving, etc.)
     - Each chip shows PASS or FLAG
     - What Changed section (improvements)
     - Practice Rule section

2. **Analytics Events** (PostHog)
   - If `NEXT_PUBLIC_POSTHOG_KEY` configured:
     - Open PostHog dashboard
     - Submit a response
     - Verify events appear: `drill_started`, `drill_submitted`, `score_returned`
   - If key not configured:
     - Check browser console
     - Events should be logged: `[analytics] {...}`

3. **Content Pack Loading** (Dry-run)
   - Admin page: `/admin/content-packs`
   - Upload JSON matching `sample-data/matchready_content_pack_v1.0.0.json` structure
   - Observe "Validation successful" message
   - Hot-swap should emit `content_pack_loaded` event

4. **Error Handling**
   - Submit empty/whitespace transcript → should see error
   - Submit text < 10 characters → API should reject
   - Check red error box appears with message
   - Verify "Dismiss" button clears error

## Demo Flow (Day 3)
1. Navigate to `/practice`
2. Paste a behavioral transcript (80-200 words)
3. Click "Submit Response"
4. View scored results with 7 category chips
5. Observe analytics events in PostHog dashboard or console
6. Check owner runbook for troubleshooting

## Webhooks
- Stripe: Handled at `/api/webhooks/stripe`
- Event: `checkout.session.completed` grants practice access
- Idempotency: Events deduplicated by ID within 1-hour TTL

## Environment Variables

**Required for M0:**
```
NEXT_PUBLIC_DEMO_USER_ID=demo
NEXT_PUBLIC_USE_FAKE_ASR=true
```

**Optional (enhances experience):**
```
NEXT_PUBLIC_POSTHOG_KEY=phc_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_key
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 400 responses from /api/evaluate | Validate request JSON matches `{transcript: string}` |
| Results not displaying | Check console for Zod validation errors |
| PostHog events missing | Verify `NEXT_PUBLIC_POSTHOG_KEY` is set; check browser network tab |
| Content pack won't activate | Verify JSON structure matches sample pack; check schema errors |
| Spinner never stops | Check server logs; might indicate timeout on evaluation |

## On-Call Notes

- **Rollback:** Disable new content packs; revert deployment to last known good
- **Performance:** Evaluation endpoint should respond within 2 seconds
- **Monitoring:** Watch Sentry dashboard for client and server errors
- **Scale:** M0 uses in-memory stores (idempotency, entitlements). For production, migrate to Redis/database
