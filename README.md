# Writing Copilot

AI-powered markdown editor with intelligent block segmentation, anchored comments, and contextual suggestions.

## Phase 0: Repo Scaffold + Safety Bootstrap

This is the Phase 0 deliverable: runnable repo skeleton with safe persistence and SQLite integration.

### Quick Start

```bash
# Install deps
bun install

# Run migrations
bun run db:migrate

# Terminal 1: API server
bun run dev:api

# Terminal 2: Web (Vite)
bun run dev:web

# Test health
curl http://localhost:3001/api/health
```

### Project Structure

```
writing-copilot/
├── api/           # Bun HTTP server + routes
├── web/           # React + Vite frontend
├── lib/           # Shared utilities (fs-adapter, etc.)
├── db/
│   ├── migrations/
│   │   ├── 001_init.sql
│   │   └── 002_fts.sql
│   └── runner.ts
├── app/           # CLI utils (migrations, etc.)
├── docs/          # Markdown docs (safe read zone)
└── README.md
```

### Key Files

- **`api/server.ts`** — Bun HTTP server, routes
- **`lib/fs-adapter.ts`** — Safe read/write with `.bak` backup
- **`lib/db.ts`** — SQLite connection + WAL mode
- **`web/index.tsx`** — React entry, Vite config

### Acceptance Criteria (Phase 0)

- [x] Fresh clone works with `bun install`
- [ ] Migration runner succeeds on first and second run (idempotent)
- [ ] API health route returns OK
- [ ] Sample markdown load/save works
- [ ] `.bak` file is generated on save
- [ ] Basic web shell can perform one read + save cycle
- [ ] README contains startup steps (you are reading it)

### Next: Phase 1

Once Phase 0 is complete:
1. Block segmentation algorithm
2. Markdown round-trip fidelity tests
3. Editor block rendering

---

**Owner:** Bilby (Skippy-dispatched)  
**Status:** Phase 0 (in-progress)
