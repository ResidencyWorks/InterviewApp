# MatchReady Interview App - M0 Core Loop

A working skeleton of the core practice loop for behavioral interview preparation. This is the **Day-3 trial delivery** for ResidencyWorks.

## Overview

The M0 core loop delivers:
- **Submit**: Type or paste a practice response
- **Evaluate**: Get scored results with 7 behavioral competencies
- **Learn**: Review improvements and practice rules
- **Track**: Analytics events fire for every drill

## Quick Start

### Prerequisites
- Node.js 22.x
- pnpm 10.x

### Installation & Development

```bash
# Install dependencies
pnpm install

# Set up git hooks
pnpm prepare

# Start dev server (runs on http://localhost:3000)
pnpm dev
```

### Environment Setup

Copy and configure `.env.example`:
```bash
cp .env.example .env.local
```

**Required for M0:**
```
NEXT_PUBLIC_DEMO_USER_ID=demo
NEXT_PUBLIC_USE_FAKE_ASR=true
```

**Optional (enhances experience):**
```
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

## Day-3 Demo Flow

### 1. Navigate to Practice
Visit `http://localhost:3000/practice`

### 2. Submit a Response
- Type or paste a behavioral transcript (80-200 words recommended)
- Example: "I had a conflict with a team member over project scope..."
- Click "Submit Response"

### 3. Review Results
You'll see:
- **Overall Score**: 0–100 (higher is better)
- **Duration, Words, WPM**: Metrics about your response
- **7 Category Chips**: 
  - Communication
  - Problem Solving
  - Leadership
  - Collaboration
  - Adaptability
  - Ownership
  - Curiosity
- Each shows **PASS** ✅ or **FLAG** ⚠️ with specific feedback
- **What to Practice**: 1-3 improvement suggestions
- **Practice Rule**: Next focus area

### 4. Track Analytics
If PostHog is configured:
- Open your PostHog dashboard
- Verify events: `drill_started`, `drill_submitted`, `score_returned`
- Each event includes user and session context

## Features

### Core Loop
- ✅ Submit transcript via form
- ✅ Evaluate against 7 behavioral competencies
- ✅ Display results with category chips
- ✅ Show improvement suggestions
- ✅ Fire analytics events

### Auth & Entitlements (M0)
- ✅ Simple bearer token auth
- ✅ In-memory entitlements cache (1-hour TTL)
- ✅ Stripe webhook for checkout completion
- ✅ Idempotency protection for webhook replays

### Content Packs
- ✅ Load and validate JSON content packs
- ✅ Hot-swap packs without redeployment
- ✅ Emit `content_pack_loaded` analytics event
- ✅ Dry-run validation before activation

### UX & Polish
- ✅ Loading spinner during evaluation
- ✅ Error states with dismissible messages
- ✅ Entitlement gating
- ✅ Word count and character counter
- ✅ Responsive design

## Testing

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run integration tests
pnpm test:integration

# Watch mode
pnpm test:watch
```

### Test Coverage
- **Evaluation Schema**: Happy path and failure cases for ResidencyWorks contract
- **Webhook Idempotency**: Stripe events replayed safely
- **Content Pack Validation**: Schema validation for JSON packs

See [docs/owner-runbook.md](docs/owner-runbook.md) for detailed test instructions.

## API Endpoints

### POST /api/evaluate
Evaluate a transcript and return scored results.

**Request:**
```json
{
  "transcript": "I led a team project that..."
}
```

**Response (ResidencyWorks Contract):**
```json
{
  "overall_score": 75,
  "duration_s": 12.5,
  "words": 180,
  "wpm": 150,
  "category_chips": [
    {
      "id": "communication",
      "name": "Communication",
      "passFlag": "PASS",
      "note": "Clear articulation of key points"
    },
    // ... 7 total categories
  ],
  "what_changed": [
    "Add specific metrics to support claims",
    "Use STAR framework for behavioral questions"
  ],
  "practice_rule": "Keep answers under 2 minutes for maximum impact"
}
```

### POST /api/webhooks/stripe
Handles Stripe webhook events. On `checkout.session.completed`:
- Grants practice access to user (idempotent)
- Stores event ID for deduplication
- TTL: 1 hour

## Operations

See [docs/owner-runbook.md](docs/owner-runbook.md) for:
- Daily operations checklist
- Test instructions
- Manual testing procedures
- Troubleshooting guide
- Performance monitoring
- Rollback procedures

## Architecture

- **Frontend**: Next.js 16 with React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **State**: React Context + `useSyncExternalStore` (no external dependencies)
- **Validation**: Zod schemas
- **Analytics**: PostHog integration (console fallback)
- **Auth**: Simple bearer token + in-memory stores

## Project Structure

```
/app
  /(dashboard)/practice/page.tsx          # Main practice UI
  /api/evaluate/route.ts                  # Evaluation endpoint
  /api/webhooks/stripe/route.ts           # Stripe webhook
  /admin/content-packs/page.tsx           # Content pack admin

/src/lib
  /evaluation                             # Evaluation engine & schema
  /analytics                              # PostHog + analytics
  /content-pack                           # Pack loading & validation
  /entitlements                           # Access control
  /auth                                   # Authentication helpers
  /error                                  # Error tracking

/src/components
  /evaluation                             # Results display
  /content-pack                           # Pack UI

/src/store                                # Client-side state

/tests                                    # Unit & integration tests

/sample-data                              # Sample content pack
```

## Development Notes

### Performance
- Evaluation endpoint target: <2 seconds
- In-memory stores are suitable for M0 only
- For production: Migrate to Redis/database

### Monitoring
- Sentry configured for error tracking
- PostHog for analytics
- Browser console logs available in dev mode

### Known Limitations (M0)
- ASR is fake (uses word count estimation)
- Evaluation is rule-based (not ML-based)
- In-memory stores will reset on deployment
- No persistent user accounts yet

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Evaluation endpoint returns 400 | Check request JSON: `{transcript: string}` |
| Results don't display | Verify Zod schema validation in console |
| PostHog events missing | Set `NEXT_PUBLIC_POSTHOG_KEY`; check network tab |
| Content pack won't load | Verify JSON structure matches sample pack |
| Spinner never stops | Check server logs; might indicate timeout |

## Contact & Support

- **Owner Runbook**: See [docs/owner-runbook.md](docs/owner-runbook.md)
- **Specification**: See [specs/007-m0-core-loop/spec.md](specs/007-m0-core-loop/spec.md)
- **Tasks**: See [specs/007-m0-core-loop/tasks.md](specs/007-m0-core-loop/tasks.md)

---

**Status**: ✅ M0 Core Loop ready for Day-3 trial delivery
**Last Updated**: 2025-10-22
