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

### AI/ASR Evaluation Feature Variables (M3)

Add the following for the AI/ASR evaluation endpoint and worker (see `env.example`):

```
OPENAI_API_KEY=sk-...
POSTHOG_API_KEY=phc_...
SUPABASE_URL=https://<id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service-role-key
UPSTASH_REDIS_REST_URL=redis://user:pass@host:port
REQUEST_TIMEOUT_MS=30000
SYNC_TIMEOUT_MS=30000
RATE_LIMIT_RPM=60
EVALUATION_WEBHOOK_URL=https://your-app.com/api/evaluate/webhook
EVALUATION_WEBHOOK_SECRET=change-me
```

`SYNC_TIMEOUT_MS` controls the maximum synchronous wait before returning `202` with a `jobId`. Adjust only if OpenAI latency profile changes significantly.

`RATE_LIMIT_RPM` sets per-key requests per minute. Increase cautiously; higher values may mask abuse or inflate costs.

See `specs/001-ai-asr-eval/spec.md` for contract examples and polling/webhook behavior.
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

- **Layered Core**: `src/domain`, `src/application`, `src/infrastructure`, `src/presentation`, `src/shared`
- **Feature Modules**: Vertical slices under `src/features/<feature>/{domain,application,infrastructure,presentation}`
- **Composition Root**: `src/infrastructure/config/{environment.ts,clients.ts,container.ts}` wires validated configuration and external clients
- **Path Aliases**: `@domain/*`, `@app/*`, `@infra/*`, `@presentation/*`, `@shared/*`, `@features/*`
- **Boundary Enforcement**: Biome `noRestrictedImports` overrides (`pnpm lint:boundaries`)
- **Testing Tiers**: Vitest suites under `tests/unit` and `tests/integration`; Playwright specs under `tests/e2e`

## Project Structure

```
src/
  app/                                    # Next.js App Router (presentation layer)
  application/                            # Use-cases, DTO mappers, validation schemas
  domain/                                 # Entities, value objects, domain services
  infrastructure/
    config/                               # Environment, shared clients, DI container
    redis/                                # Redis cache services
    supabase/                             # Supabase adapters
    ...                                   # Additional adapters (logging, compliance, etc.)
  presentation/                           # Presentation helpers (API proxy, guards)
  shared/                                 # Cross-cutting primitives (errors, logging, utilities)
  features/
    booking/
      domain/                             # Booking-specific entities
      application/                        # Booking orchestration and validation
      infrastructure/                     # Booking adapters (storage, analytics)
      presentation/                       # Booking controllers / UI entry points
    scheduling/
    auth/
    billing/
    notifications/

tests/
  unit/                                   # Layer + feature unit specs (Vitest)
  integration/                            # Integration/performance/load specs (Vitest & k6)
  e2e/                                    # Playwright end-to-end scenarios

docs/
  architecture/
    adr-layered-dependency-rules.md       # Decision record for dependency guardrails
    migration-report.md                   # Validation summary for the refactor
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

## Support & SLA

### Critical Bug Response SLA

During the initial 30-day launch window, we commit to addressing critical bugs within **72 hours** of report.

**Critical bugs** are defined as:
- Security vulnerabilities
- Data loss or corruption
- Complete service unavailability
- Critical functionality failures preventing core use cases

**Response Process**:
1. Bug report received and triaged
2. Acknowledgment within 24 hours
3. Resolution or workaround within 72 hours
4. Post-resolution communication and documentation

**Reporting Critical Bugs**:
- Email: [Configure your support email]
- Include: Description, steps to reproduce, environment details, error logs
- Mark subject line with `[CRITICAL]` for priority handling

**Note**: This SLA applies during the first 30 days post-launch. After the initial window, standard support processes apply.

## Contact & Support

- **Owner Runbook**: See [docs/owner-runbook.md](docs/owner-runbook.md)
- **Specification**: See [specs/007-m0-core-loop/spec.md](specs/007-m0-core-loop/spec.md)
- **Tasks**: See [specs/007-m0-core-loop/tasks.md](specs/007-m0-core-loop/tasks.md)

---

**Status**: ✅ M0 Core Loop ready for Day-3 trial delivery
**Last Updated**: 2025-10-22
