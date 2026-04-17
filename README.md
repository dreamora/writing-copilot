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

Bun supports three operational modes:

1. **OpenAI API key path (recommended for reliability)**
   - set `OPENAI_API_KEY=sk-...`
   - optional: `OPENAI_MODEL`, `OPENAI_TEMPERATURE`
   - by default this uses the OpenAI SDK provider

2. **Codex CLI transport (auto-select if available)**
   - set `OPENAI_API_KEY=sk-...`
   - Bun automatically switches to Codex when `codex` is discoverable on PATH (or `CODEX_CLI_COMMAND` is set)
   - optional transport knobs: `CODEX_CLI_COMMAND`, `CODEX_MODEL`, `CODEX_TIMEOUT_MS`, `CODEX_SKIP_GIT_REPO_CHECK=...`

3. **OAuth browser-session path**
   - provide `openai.type: "oauth"` in auth config
   - start backend with `USE_BROWSER_SESSION_TRANSPORT=true`
   - subject to chatgpt.com challenge behavior (403/401 remain possible)

Common fallback mode
- set `USE_STUB_PROVIDER=true` to force stub mode for deterministic offline behavior.

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
