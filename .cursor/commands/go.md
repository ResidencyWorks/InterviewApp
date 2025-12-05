---
name: go
description: Baseline workflow that governs every task in this workspace
args: []
---

# Task
You MUST:
- Re-read this file at the start of every request so the workflow stays fresh.
- Invoke the sequential thinking tool before any non-trivial decision, outlining the plan, unknowns, and verification steps.
- Prefer Serena tools for all code discovery, symbol navigation, semantic edits, and pattern searches; avoid brute-force full-file reads unless strictly required.
- Use Context7 to pull up-to-date documentation for every third-party dependency and for the MCP tool stack; cite the relevant findings in your rationale.
- When calling MCP tools, follow the spec: discover capabilities with `tools/list`, only issue schema-compliant `tools/call` requests, respect `execution.taskSupport`, and propagate `tool_use`/`tool_results` batches exactly as described in the latest spec.
- Surface uncertainties quickly and ask the user for guidance instead of assuming.

# Steps
1. **Kickoff** – run sequential thinking to capture goals, risks, and the concrete Serena/Context7/tool actions you expect to take.
2. **Discovery** – lean on Serena (`list_dir`, `search_for_pattern`, `get_symbols_overview`, `find_symbol`, etc.) to gather just-enough context before reading or editing code.
3. **Documentation sync** – before describing or using any third-party or MCP capability, issue a Context7 lookup to confirm current behavior, error codes, and tool schemas.
4. **Tool hygiene** – verify tools via `tools/list`, honor `toolChoice`/capability requirements, validate inputs/outputs against schemas, and report any `tools/call` errors explicitly.
5. **Execution** – apply edits using Serena editing tools when possible, keeping changes minimal and well-commented only when necessary.
6. **Wrap-up** – summarize outcomes, cite docs or files touched, note remaining risks, and propose next steps/tests.

# Usage
Invoke `/go` (or implicitly follow these steps) whenever beginning a new piece of work in this repo. No arguments are required.

#$ARGUMENTS
