# Writing Copilot

Local writing assistant prototype with markdown editing, suggestion lifecycle, telemetry, and early learning substrate work.

## Startup

```bash
bun install
bun run db:migrate && bun run dev:api
```

Execution flow:

```bash
bun run db:migrate && bun run dev:api
```

Health check:

```bash
curl -s http://localhost:8788/api/health
```

The API server runs on `http://localhost:8788/` and exposes health plus `/api/*` routes.

## ChatGPT auth setup

Bun supports three operational modes:

1. **Codex CLI transport (preferred when available)**
   - if `codex` is installed and you are logged in, Bun uses Codex first
   - no `OPENAI_API_KEY` is required for this path
   - optional transport knobs: `CODEX_CLI_COMMAND`, `CODEX_MODEL`, `CODEX_TIMEOUT_MS`, `CODEX_SKIP_GIT_REPO_CHECK=...`
   - the Codex subprocess is run with `--sandbox workspace-write` and falls back to stub mode if the CLI cannot start cleanly
   - editor model dropdown defaults to `gpt-5.4-mini`

2. **OpenAI API key path (fallback when Codex is unavailable)**
   - set `OPENAI_API_KEY=sk-...`
   - optional: `OPENAI_MODEL`, `OPENAI_TEMPERATURE`
   - this uses the OpenAI SDK provider

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

## Editorial roles

The editor now supports a role selector in the toolbar. Choose the review stance you want before requesting a suggestion:

- Professional lector
- Rigorous reviewer
- Precise editor
- Sharp stylist
- Joyful but adult
- Marc voice

`Marc voice` is derived from Marc's vault corpus and aims for grounded, sharp, adult edits instead of generic AI polish.

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
