# Owner Runbook

This runbook covers day-to-day operation for M0 core loop.

## Prerequisites
- Node 22.x, pnpm 10.x installed
- Environment variables configured in 

## Setup
Lockfile is up to date, resolution step is skipped
Already up to date

. prepare$ lefthook install
. prepare: sync hooks: ✔️ (pre-commit, pre-push)
. prepare: Done
Done in 802ms using pnpm v10.18.3

> interview-app@0.1.0 dev /workspaces/InterviewApp
> next dev --turbopack --port 3000

[?25h
 ELIFECYCLE  Command failed with exit code 1.

## Demo Flow (Day 3)
1. Navigate to .
2. Paste a transcript and submit.
3. View scored results and summary.
4. Observe analytics events in the console.

## Webhooks
- Stripe  handled at .
- Idempotency: events deduped by ID within TTL.

## Troubleshooting
- 400 responses: validate request shape against schema.
- 500 responses: check server logs and Sentry dashboard.

## On-call Notes
- Roll back by disabling new content packs and reverting to last known good.
