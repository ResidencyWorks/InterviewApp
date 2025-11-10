# `src/shared`

## Purpose

Contains primitives, cross-cutting abstractions, and lightweight utilities that are safe to import from any layer. Typical examples include result/either types, logging contracts, domain-agnostic errors, configuration tokens, and simple helper functions.

## Allowed Dependencies

- Standard library and vetted third-party utilities that remain side-effect free
- Other modules within `src/shared`

## Forbidden Dependencies

- Direct imports from `src/domain`, `src/application`, `src/infrastructure`, `src/presentation`, `src/app`, or `src/features`
- Code that requires environment variables, network access, or stateful clients

## Guidelines

- Keep modules focused and composable; avoid “misc” dumping ground.
- Prefer pure functions or simple classes/interfaces with no hidden state.
- Document each primitive’s intended usage to prevent misuse.

## Testing Guidance

- Include unit tests alongside implementations (`*.unit.spec.ts`).
- Ensure utilities remain deterministic and require no external setup.

## Current Modules

- `utils.ts` & `utils/` — presentation-safe helpers such as `cn` and URL builders
- `error/` — error tracking contracts and mobile-safe error helpers
- `logger/` — shared logging contracts (`LogLevel`, `LogContext`, `LoggerContract`)
