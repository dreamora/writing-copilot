# Writing Copilot — Phase 0

Minimal scaffolding for Writing Copilot local development loop.

## Startup

```bash
bun install
bun run db:migrate
bun run dev:api &
bun run dev:web
```

Health check:
```bash
curl -s http://localhost:8788/api/health
```

## Architecture

- `src/api/` — Bun HTTP server (health, docs read/save)
- `src/db/` — SQLite with migration runner
- `src/lib/` — Shared utilities (fs adapter, backup logic)
- `web/` — React + Vite shell UI
- `docs/` — Sample markdown files

## Phase 0 Scope

- Repo scaffold ✓
- Bun + TS setup ✓
- SQLite migrations ✓
- Safe FS adapter ✓
- API shell ✓
- Web smoke test ✓

## Known Gaps (Phase 1)

- No editor block segmentation
- No AI suggestion generation
- No advanced undo/redo
- No styling beyond utility

See `docs/PHASE1.md` for next steps.
