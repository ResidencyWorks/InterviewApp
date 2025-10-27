# Structure Analysis

Run the analysis via API or CLI:

- API: POST `/api/structure-analysis/analyze`
- CLI: `pnpm analyze`

## Usage

### CLI

Run the analysis on default directories (`src/` and `app/`):
```bash
pnpm analyze
```

Run on specific directories:
```bash
pnpm analyze src/ app/ lib/
```

### API

Initiate an analysis:
```bash
curl -X POST http://localhost:3000/api/structure-analysis/analyze \
  -H "Content-Type: application/json" \
  -d '{"directories": ["src/", "app/"]}'
```
