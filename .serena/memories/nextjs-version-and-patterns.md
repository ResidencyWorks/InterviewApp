# Next.js Version and Patterns

## Version
- Using Next.js 15+ (user mentioned 16+)

## Key Patterns for Next.js 15+

### Dynamic Route Params
- Route `params` are now Promises and MUST be awaited
- Pattern: `{ params }: { params: Promise<{ id: string }> }`
- Usage: `const { id } = await params;`

### SearchParams
- `searchParams` are also Promises in Next.js 15+
- Must be awaited before accessing properties

## Files to Check
- All dynamic route handlers in `src/app/api/`
- Any component or route that uses `params` or `searchParams`
