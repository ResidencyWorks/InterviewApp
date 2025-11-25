# Data Model: Layered Architecture Refactor

## Layer
- **Purpose**: Represents one of the canonical architectural tiers (`domain`, `application`, `infrastructure`, `presentation`, `shared`).
- **Key Attributes**:
  - `name` (enum): required; unique identifier of the layer.
  - `responsibilities` (string[]): describes allowed logic.
  - `allowedDependencies` (string[]): layers this layer may import from.
  - `documentationUrl` (string): link to layer README/guidelines.
- **Relationships**:
  - Has many `FeatureModule` entries that leverage the layer’s contracts.
- **Validation Rules**:
  - `allowedDependencies` must exclude layers outside the onion order (e.g., domain cannot list infrastructure).
  - `responsibilities` must enumerate at least one responsibility to avoid empty shells.

## FeatureModule
- **Purpose**: Vertical slice bundling domain/application/infrastructure/presentation code for a product area.
- **Key Attributes**:
  - `slug` (string): unique, kebab-case identifier (e.g., `booking`).
  - `displayName` (string): human-friendly name.
  - `ownedContexts` (string[]): bounded contexts covered by the feature.
  - `layersIncluded` (LayerRef[]): references to layer facets implemented locally.
  - `externalIntegrations` (string[]): third-party systems touched.
- **Relationships**:
  - References multiple `Layer` entries (one per layer facet).
  - May depend on shared primitives via `SharedComponent` references.
- **Validation Rules**:
  - Must declare at least domain and application subdirectories before merging.
  - External integrations must route through infrastructure adapters, not domain.

## SharedComponent
- **Purpose**: Cross-layer primitive (results, errors, logging contracts) safe for reuse.
- **Key Attributes**:
  - `name` (string): unique identifier.
  - `category` (enum): `utility`, `error`, `contract`, `primitive`.
  - `layerCompatibility` (string[]): list of layers permitted to import.
  - `version` (string): semantic version for change tracking.
- **Relationships**:
  - Imported by `Layer` guidelines and `FeatureModule` implementations.
- **Validation Rules**:
  - `layerCompatibility` must include at least one layer and exclude restricted layers (e.g., infrastructure-only tools).

## TestingSuite
- **Purpose**: Represents a logical test grouping (unit, integration, e2e) aligned with layers.
- **Key Attributes**:
  - `type` (enum): `unit`, `integration`, `e2e`.
  - `scope` (string): code region covered (e.g., `src/domain`).
  - `environmentRequirements` (string[]): env vars or services required.
  - `runtimeBudget` (number): target execution time in minutes.
- **Relationships**:
  - Associated with one or more `Layer` entries via scope.
  - Enforced in CI pipelines defined in infrastructure.
- **Validation Rules**:
  - Unit suites must have empty `environmentRequirements`.
  - Runtime budgets must respect constitution (unit + integration ≤5 minutes total).
