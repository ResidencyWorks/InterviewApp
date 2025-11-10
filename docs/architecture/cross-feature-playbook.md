# Cross-Feature Capability Playbook

This playbook documents how teams should implement cross-cutting capabilities while respecting the layered architecture and feature module boundaries.

## Analytics & Telemetry

- **Owner**: Notifications feature (`src/features/notifications`)
- **Public API**: `@features/notifications/application/analytics`
- **Guidelines**:
  - Presentation handlers request analytics services via the composition root (`appContainer.clients.getPostHogClient()`).
  - Feature modules emit domain events; analytics application layer translates to tracking calls.
  - Avoid direct imports of `posthog-node`—always go through the feature facade.

## Entitlements & Billing

- **Owner**: Auth + Billing features
- **Public API**: `@features/auth/application/entitlements/upload-permissions`
- **Guidelines**:
  - Application layer exposes permission checks (`validateUploadPermission`, `hasUploadPermission`).
  - Infrastructure (Stripe webhooks) updates entitlements through feature application services.
  - No presentation code should read Redis or Supabase directly for entitlements—use feature APIs.

## Content Packs

- **Owner**: Booking feature
- **Public API**: `@features/booking/application/services/content-pack-validation` etc.
- **Guidelines**:
  - Domain encapsulates validation/business rules.
  - Infrastructure handles storage (Supabase, filesystem) through feature-level adapters.
  - Presentation routes call booking application services rather than domain helpers.

## LLM Feedback Pipeline

- **Owner**: Scheduling feature
- **Public API**: `@features/scheduling/llm/application/services/LLMFeedbackService`
- **Guidelines**:
  - Application orchestrates speech/text adapters, retry, and circuit breaker policies.
  - Infrastructure provides OpenAI adapters through configuration.
  - Presentation routes obtain services via container wiring (future enhancement).

## Shared Primitives

- **Owner**: Shared layer (`src/shared`)
- **Usage**:
  - Logging contracts, base errors, functional helpers.
  - Always import via `@shared/*`. If a primitive becomes feature-specific, relocate into the feature module.

## How to Add a New Cross-Feature Capability

1. **Domain First**: Define domain contracts under the owning feature (`src/features/<feature>/domain`).
2. **Application Facade**: Expose a minimal API from the feature application layer.
3. **Infrastructure Wiring**: Register external clients in `src/infrastructure/config/clients.ts` if shared, or inside the owning feature otherwise.
4. **Presentation Access**: Import through the feature facade or the composition root—never directly from domain/infrastructure.
5. **Documentation**: Update this playbook and the owning feature README with responsibilities, consumers, and testing notes.
