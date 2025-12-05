---
name: fix
description: Error-resolution workflow for every defect or incident task
args: []
---

# Task
You MUST:
- Re-read this file at the start of every fix request to keep the workflow fresh.
- Invoke the sequential thinking tool before any non-trivial decision to capture hypotheses, unknowns, and verification criteria for the fix.
- Prefer Serena tools for discovery, navigation, and scoped edits; avoid whole-file reads unless indispensable.
- Use Context7 to pull the latest runbooks, dependency docs, and MCP specs that relate to the defect; cite what you learn in your reasoning.
- Honor MCP schemas: call `tools/list` before first use, send only spec-compliant payloads, respect `execution.taskSupport`, and report `tools/call` failures verbatim.
- Surface blockers or missing documentation immediately and request guidance instead of assuming.

# Steps
1. **Intake & Plan** – Run sequential thinking to restate the error, affected scope, suspected root causes, planned Serena/Context7/tool actions, and validation strategy.
2. **Reproduce** – Recreate the issue using the minimal environment (tests, scripts, API calls). If reproduction fails, document the discrepancy before moving on.
3. **Discovery** – Use Serena commands (`list_dir`, `search_for_pattern`, `get_symbols_overview`, `find_symbol`, etc.) to gather just-enough context. Escalate missing docs to Context7 before touching code.
4. **Documentation Sync** – Confirm third-party libraries, MCP behaviors, and telemetry requirements via Context7 prior to code changes. Update the active plan when new facts alter scope.
5. **Fix Implementation** – Apply minimal, well-commented edits with Serena editing tools when possible. Keep changes scoped to the defect unless the plan explicitly expands coverage.
6. **Validation** – Re-run the original repro, plus targeted tests or linters. Note any unverified areas as risks.
7. **Wrap-up** – Summarize root cause, the fix, files touched, Context7 references, and remaining risks. Recommend follow-up actions (tests, monitoring, plan updates).

# Usage
Invoke `/fix` (or implicitly follow these steps) whenever addressing a reported problem, failing test, or production incident in this repo. No arguments are required.
