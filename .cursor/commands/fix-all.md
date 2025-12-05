---
name: fix-all
description: Run project-wide fix command to lint, format, and correct TypeScript errors (especially remove use of `any`)
args: []
flags:
  - name: dry-run
    description: Print the plan without making changes
    required: false
---

# Task
You MUST:
- Follow `.cursor/commands/go.md`: rely on Serena tools for semantic code retrieval/editing, use Context7 for third-party documentation (including MCP tooling guidance), and run the sequential thinking tool before making decisions.
- Run `pnpm fix:all`, which includes commands:
  - `biome check . --write`
  - `tsc --noEmit`
- After lint/format passes, scan TypeScript project for uses of the `any` type and produce either:
  - automatic fixes where safe (e.g., infer a more specific type)
  - or report locations where `any` remains and require manual fix.
- Ensure type errors caused by `any` or implicit `any` are surfaced and fixed.
- If `--dry-run` flag is present: do not write or modify files, but print list of errors/issues discovered and proposed fixes.

# Steps
1. Re-read `.cursor/commands/go.md`, invoke the sequential thinking tool to outline your execution plan, and use Context7 to refresh any needed MCP tool documentation so every subsequent Serena/tool invocation follows spec.
2. Run `pnpm fix:all`. If command fails: capture error output, stop with failure status.
3. If passes, scan `.ts`/`.tsx` files for `: any` or implicit `any` using Serena search/edit tools.
   - Log each occurrence with file path and line number.
   - Optionally replace `: any` with `unknown` or a more specific type stub.
4. Re-run `tsc --noEmit` (or incremental build) to confirm no type errors remain.
5. Report summary: number of files modified, number of `any` instances replaced, number of remaining `any` occurrences requiring manual fix.
6. Respect `--dry-run`: in that mode skip writing changes, only print plan.

# Usage
```bash
/fix-all
/fix-all --dry-run
