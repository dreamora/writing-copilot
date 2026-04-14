# ChatGPT Auth Setup — Writing Copilot

## Overview

Writing Copilot uses a **provider boundary** to isolate authentication from domain logic. The app can bootstrap credentials from three sources (in order of precedence):

1. **`.secrets/chatgpt-auth.json`** (production-safe, git-ignored)
2. **`OPENAI_AUTH` env var** (CI/CD-friendly, full config as JSON)
3. **`OPENAI_API_KEY` env var** (legacy fallback, key only)

## Development Setup

### 1. Create auth file

Copy the example and fill in your OpenAI API key:

```bash
cp .secrets/chatgpt-auth.json.example .secrets/chatgpt-auth.json
# Edit .secrets/chatgpt-auth.json with your real API key
```

### 2. File contract

```json
{
  "apiKey": "sk-proj-...",
  "model": "gpt-4o-mini",
  "baseUrl": "https://api.openai.com/v1",
  "timeout": 30000,
  "maxRetries": 1
}
```

- **`apiKey`** (required): OpenAI API key from https://platform.openai.com/account/api-keys
- **`model`** (default: `gpt-4o-mini`): Model to use for suggestions
- **`baseUrl`** (optional): Custom API endpoint (for proxies, test environments)
- **`timeout`** (default: 30000ms): Request timeout
- **`maxRetries`** (default: 1): Retries on parse failure

### 3. Verify auth loads

```bash
cd writing-copilot
bun run dev:api
# Logs should show auth loaded successfully (or fallback to stub)
```

## CI/CD Setup

### Option A: Via environment variable

Encode the full config as JSON and pass `OPENAI_AUTH`:

```bash
export OPENAI_AUTH='{"apiKey":"sk-...","model":"gpt-4o-mini","timeout":30000}'
npm test
```

### Option B: Via mounted secrets

In Kubernetes or Docker Compose, mount the auth file:

```yaml
volumes:
  - .secrets/chatgpt-auth.json:/app/.secrets/chatgpt-auth.json:ro
environment:
  - OPENAI_AUTH_PATH=/app/.secrets/chatgpt-auth.json
```

## Safety Guardrails

### No credential logging

All error messages are **sanitized** — API keys and auth details are never logged:

```typescript
// ❌ NOT logged
Error: Invalid JSON in .secrets/chatgpt-auth.json: {"apiKey":"sk-..."}

// ✅ Logged instead
Error: Invalid JSON in auth config file: Unexpected token ...
```

### Fallback to stub

If auth fails to load, the app falls back to `StubSuggestionProvider`:

```typescript
// No crash; app still starts with placeholder suggestions
const provider = createSuggestionProvider(null);
// provider is now StubSuggestionProvider
```

## Rollback

To switch back to stub/mock mode entirely:

```bash
git revert <commit-hash>  # Reverts auth integration
# App will use StubSuggestionProvider by default
```

## Troubleshooting

### "Auth config validation failed: apiKey: String must contain at least 1 character"

**Cause:** API key is empty or missing.  
**Fix:** Check `.secrets/chatgpt-auth.json` and ensure `apiKey` is filled.

### "Error reading auth config: No such file or directory"

**Cause:** `.secrets/chatgpt-auth.json` does not exist (and no env var fallback).  
**Fix:** Create the file or set `OPENAI_AUTH` / `OPENAI_API_KEY` env var.

### "Failed to parse OPENAI_AUTH environment variable: Unexpected token ..."

**Cause:** JSON in `OPENAI_AUTH` env var is malformed.  
**Fix:** Ensure the env var contains valid JSON. Test with:
```bash
echo "$OPENAI_AUTH" | jq .
```

### App starts with stub provider

**Cause:** No auth loaded from any source.  
**Fix:** Either:
- Create `.secrets/chatgpt-auth.json`
- Or set `OPENAI_AUTH` env var
- Or set `OPENAI_API_KEY` env var

Logs will show: `"No auth config found; using stub suggestion provider"`
