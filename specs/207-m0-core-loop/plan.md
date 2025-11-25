# Implementation Plan: M0 Core Loop Skeleton

## Feature Name
M0 Core Loop Skeleton

## Architecture Overview
- Client submits transcript text; simulated STT step runs server-side.
- Rules-based scoring computes metrics and seven category outcomes.
- Stubbed refactor summary returns bullets and one practice rule.
- Response validated against schema before returning to client.
- Results rendered and saved to client store; analytics fired.
- Auth and entitlements gate access; webhook updates entitlements idempotently.
- Content pack loader validates and hot-swaps active pack.

## Tech Stack & Libraries
- Authentication: Magic-link email auth
- Entitlements cache: TTL cache (1 hour)
- Payments: Test-mode checkout webhook handling (idempotent)
- Validation: Zod schema library for response validation
- UI: Tailwind-based layout; simple forms and chips
- Analytics: Event capture with user/session context
- Error Tracking: Client + API error capture
- Testing: Unit test (schema happy/fail), integration test (webhook idempotency)

## Project Structure (high-level)
- specs/007-m0-core-loop/
  - spec.md (requirements & stories)
  - plan.md (this file)
  - checklists/requirements.md
- app/
  - api/evaluate/route.ts (POST evaluation endpoint)
  - api/webhooks/stripe/route.ts (checkout-success endpoint)
- src/
  - lib/evaluation/ (engine, schema, rules, refactor stub)
  - lib/content-pack/ (loader, schema, activation)
  - lib/analytics/ (event helpers)
  - lib/error/ (error capture)
  - lib/entitlements/ (entitlements service)
  - lib/webhooks/ (idempotency store)
  - store/ (client results store)
  - components/evaluation/ (results display)

## Risks & Mitigations
- Latency spikes: Use simulated STT and simple rules for M0; add timeouts.
- Idempotency: Store event IDs and short-term dedupe window.
- Validation gaps: Strict schema with tests.
- Content pack errors: Dry-run validate and do not activate on failure.

## Milestones
1. Evaluation endpoint + schema + UI submission
2. Results rendering + analytics
3. Auth + gating + webhook idempotency
4. Content pack loader + hot-swap + logging
5. Ops artifacts (env example, runbook, README)

## Acceptance Mapping
Maps directly to FR-001..FR-020 and SC-001..SC-007 in spec.md.
