# Writing Copilot

Local writing assistant prototype with markdown editing, suggestion lifecycle, telemetry, and early learning substrate work.

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

After building the web bundle, the API server also serves `web/dist` for non-API routes, so `http://localhost:8788/` loads the UI shell (with API routes still at `/api/*`).

## ChatGPT auth setup

First iteration uses a local auth JSON file:

- real auth path: `.secrets/chatgpt-auth.json`
- example contract: `.secrets/chatgpt-auth.json.example`
- env override: `CHATGPT_AUTH_PATH=/absolute/or/relative/path.json`
- stub mode: `USE_STUB_PROVIDER=true`

Minimal example:

```json
{
  "openai": {
    "type": "oauth",
    "refresh": "<token>",
    "access": "<token>",
    "expires": 1776691031314,
    "accountId": "<uid>"
  }
}
```

If auth is missing, malformed, or the access token is expired, `/api/health` reports the resolved auth path and an actionable auth error while the app stays in stub mode.

## Architecture

- `src/api/` — Bun HTTP server
- `src/adapters/ai/` — provider bootstrap + auth loading
- `src/domain/suggestions/` — prompt + lifecycle logic
- `src/domain/telemetry/` — event + rewrite + timing capture
- `src/domain/insights/` — compact learning queries
- `src/db/` — SQLite migrations
- `src/lib/` — shared utilities
- `web/` — React + Vite shell UI
- `docs/` — project docs and roadmap artifacts

## Current direction

MVP order:
1. ChatGPT auth foundation
2. Real AI suggestion loop
3. FTS5 learning substrate

Locks/concurrency work stays out of MVP unless a concrete race/corruption bug appears.
