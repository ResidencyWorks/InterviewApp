# Implementation Plan: Stripe Checkout → Entitlements Cache

**Branch**: `011-stripe-checkout-entitlements` | **Date**: 2025-01-27 | **Spec**: [/workspaces/InterviewApp/specs/011-stripe-checkout-entitlements/spec.md](/workspaces/InterviewApp/specs/011-stripe-checkout-entitlements/spec.md)
**Input**: Feature specification from `/specs/011-stripe-checkout-entitlements/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement secure, idempotent Stripe checkout integration with database persistence and Redis caching for entitlements. The system will create checkout sessions for entitlement purchases, process webhooks with idempotency checks using Stripe event IDs, write entitlements to Supabase database and Upstash Redis cache, and handle cache failures gracefully with database fallback.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) targeting Node.js LTS
**Primary Dependencies**: Next.js 14 App Router, Stripe SDK, Supabase client SDK, Upstash Redis SDK, Vitest, Biome
**Storage**: Supabase PostgreSQL (entitlements table), Upstash Redis (entitlements cache with 1-hour TTL)
**Testing**: Vitest for unit/integration tests, integration tests for webhook replay scenarios
**Target Platform**: Web application deployed on Vercel (serverless functions)
**Project Type**: Full-stack web (Next.js) with layered architecture
**Performance Goals**: Checkout session creation ≤2s, webhook processing ≤5s, entitlement validation ≤100ms (cached), ≤50ms Redis lookups
**Constraints**: Database as source of truth, async cache retry on failure, fallback to DB when cache unavailable, idempotency using Stripe event.id
**Scale/Scope**: Single feature module (billing) with checkout session creation, webhook processing, and entitlement caching

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Code Quality Gates:**

- [x] TypeScript strict mode enabled
- [x] Biome formatting and linting configured
- [x] lefthook hooks configured for pre-commit/pre-push
- [x] JSDoc comments planned for all exported functions

**Architecture Gates:**

- [x] Onion Architecture pattern identified
- [x] Domain layer independence from frameworks confirmed
- [x] Interface adapters using DI pattern planned

**Testing Gates:**

- [x] Test-first approach planned
- [x] Vitest configuration planned
- [x] 80% coverage target set
- [x] Unit and integration test strategy defined

**Tooling Gates:**

- [x] pnpm as package manager confirmed
- [x] Devcontainer with Node.js LTS, Biome, lefthook planned
- [x] No ESLint/Prettier (Biome only)

**Performance Gates:**

- [x] Core loop performance targets defined (≤250ms)
- [x] Redis lookup targets defined (≤50ms)
- [x] Content validation targets defined (≤1s)

**MCP Integration Gates:**

- [x] Context7 for specs/plans identified
- [x] Supabase for auth/storage/DB planned
- [x] Vercel for deployment planned
- [x] PostHog for analytics planned
- [x] Sentry for error tracking planned

## Project Structure

### Documentation (this feature)

```
specs/011-stripe-checkout-entitlements/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── app/
│   └── api/
│       ├── checkout/
│       │   └── session/
│       │       └── route.ts          # POST /api/checkout/session
│       └── webhooks/
│           └── stripe/
│               └── route.ts          # POST /api/webhooks/stripe (existing, to be enhanced)
├── features/
│   └── billing/
│       ├── domain/
│       │   └── checkout/
│       │       ├── CheckoutSession.ts    # Domain entity
│       │       └── interfaces/
│       │           └── ICheckoutRepository.ts
│       ├── application/
│       │   ├── checkout/
│       │   │   ├── CreateCheckoutSessionUseCase.ts
│       │   │   └── dto/
│       │   │       └── CreateCheckoutSessionRequest.ts
│       │   └── stripe-webhook.ts    # Enhanced webhook handler (existing)
│       └── infrastructure/
│           └── stripe/
│               ├── StripeCheckoutAdapter.ts
│               └── StripeIdempotencyStore.ts
├── infrastructure/
│   ├── db/
│   │   └── database-service.ts      # Existing Supabase service
│   ├── redis/
│   │   └── index.ts                 # Existing Redis cache (UserEntitlementCache)
│   └── webhooks/
│       └── IdempotencyStore.ts      # Existing (to be enhanced with Redis/DB persistence)
└── shared/
    └── types/
        └── billing.ts                # Billing-related types

tests/
├── unit/
│   ├── features/
│   │   └── billing/
│   │       ├── checkout/
│   │       │   └── CreateCheckoutSessionUseCase.test.ts
│   │       └── webhook/
│   │           └── stripe-webhook.test.ts
│   └── infrastructure/
│       └── stripe/
│           └── StripeIdempotencyStore.test.ts
└── integration/
    ├── api/
    │   ├── checkout/
    │   │   └── session.test.ts
    │   └── webhooks/
    │       └── stripe.test.ts
    └── webhooks/
        └── idempotency-replay.test.ts    # Replay test for duplicate webhooks
```

**Structure Decision**: Using existing layered architecture with feature-based organization. Checkout session creation and webhook processing are part of the billing feature module. Infrastructure adapters handle Stripe SDK integration and idempotency storage.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
