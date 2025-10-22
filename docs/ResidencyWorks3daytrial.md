
ResidencyWorks — M0 (3-Day Trial) Statement of Work
Developer: Dru Connold
Client: ResidencyWorks (Donald Morrish)
Module: MatchReady – Interview Drills (P0 loop shell)
Price: $900 fixed (M0 trial)
Start date: 10 / 20 / 2025
Trial window: 3 business days, demo by Day 3, 5:00 PM GMT+2
Overlap: ≥ 4 hrs/day with US ET
Staging URL: m0residencyworks.vercel.app (or as provided)
________________________________________
1) Objective (what M0 proves)
Deliver a working skeleton of the core loop with fake ASR so we can confirm architecture, latency, data flow, and UX steps before full build.
Loop: record/type → submit → (fake STT) → score (rules) → LLM-style refactor (stub) → return JSON → render chips + notes → save to store → analytics fired.
________________________________________
2) In-scope deliverables (Day-3 demo ready)
A) Auth & Entitlements (Minimal but real)
•	Auth: Supabase Email Magic Link auth wired (login/logout + protected routes).
•	Entitlements cache: Redis (Upstash) with TTL = 1hr for M0.
•	Route gating: After “checkout success” webhook (Stripe test mode), user immediately sees gated routes (Basic vs Locked). (Webhook stored, idempotent.)
B) Endpoints & Schema (Validated JSON)
•	POST /api/evaluate returns a validated JSON object (Zod schema) with:
o	duration_s (number), words (number), wpm (number)
o	categories (array of 7 items, each with name, passFlag: "PASS" | "FLAG", note)
o	what_changed (≤ 3 bullets)
o	practice_rule (1 sentence)
o	overall_score (0–100)
•	Unit test for schema validation (Zod) with at least one happy path + one failure case.
•	Integration test for webhook idempotency (store/replay protection).
C) UI/UX (Trial shell)
•	Simple page(s) to submit a transcript (typed paste input for M0; a record button may be present but can be non-functional in M0).
•	Results view that displays:
o	7 category chips (✅/⚠️) with note popovers
o	overall_score, duration_s, words, wpm
o	“What changed” (max 3 bullets) + “Rule to practice next” (1 line)
•	Basic layout with Tailwind (no pixel-perfect polish required).
D) Content Pack Loader
•	Loader accepts matchready_content_pack_v1.2.0.json
•	Dry-run check (validate JSON shape) + hot-swap (swap active pack without redeploy).
•	Versioning & logging: Emits PostHog event content_pack_loaded with version + timestamp on successful activation.
•	Included sample content pack file (1–2 prompts per category) in repo.
E) Analytics & Error Tracking
•	PostHog events (with userId/session):
o	drill_started, drill_submitted, score_returned, content_pack_loaded
•	Sentry wired for client + API error capture.
F) Ops Hygiene & Handoff
•	Repo hygiene: Daily PRs, meaningful commit messages, preview deploys.
•	.env.example listing required keys (Supabase, Upstash, Sentry, PostHog, Vercel, Stripe test).
•	1-page Owner Runbook (MD file) covering:
o	Rotating keys / clearing caches
o	Reprocessing a failed job
o	Where to change content pack version and re-load
o	How to verify webhooks (Stripe test dashboard + logs)
•	README with setup steps and how to demo Day-3 features.
