# ChatGPT Auth Setup — Writing Copilot

## Auth loading priority (fallback paths)

1. Codex CLI session (preferred when `codex` is installed and logged in)
2. `OPENAI_API_KEY` environment variable (API-key mode)
3. `.secrets/chatgpt-auth.json` (file-based OAuth or api-key config)
4. `CHATGPT_AUTH_PATH` (path override)

If `codex` is available, the server uses Codex first and does not require `OPENAI_API_KEY`.
If `OPENAI_API_KEY` is set, it is only used for the OpenAI SDK fallback path unless explicit api-key auth is passed into Codex.

## Provider modes

Bun can use two non-stub live transport modes (plus OAuth/browser-session):

### 1) Codex CLI provider (default when available)

```bash
# no API key required if `codex` is already logged in
export CODEX_CLI_COMMAND="codex"   # optional override
export CODEX_MODEL="gpt-5.4-mini"  # optional default
export CODEX_TIMEOUT_MS="45000"    # optional
bun run dev:api
```

### 2) OpenAI SDK provider (fallback when Codex is unavailable)

```bash
export OPENAI_API_KEY="sk-..."
# optional
export OPENAI_MODEL="gpt-5.4-mini"
export OPENAI_TEMPERATURE="0.7"
```

When `codex` is discoverable, Bun routes suggestion requests through `codex exec` with the existing Codex login/session:

- `--full-auto`
- `--output-schema` (strict JSON schema)
- `--output-last-message` (structured extraction)
- `--skip-git-repo-check`

For non-UI troubleshooting, check `/api/health` for `providerMode: "codex"` or `authError`.

### 3) OAuth/browser-session provider

```bash
export USE_BROWSER_SESSION_TRANSPORT=true
```

This mode requires an OAuth auth file and is still sensitive to anti-abuse blocks (`403 unusual activity`).

Example file shape:

```json
{
  "openai": {
    "type": "oauth",
    "refresh": "<token>",
    "access": "<token>",
    "expires": 1776691031314,
    "accountId": "user-id"
  }
}
```

## Troubleshooting

- **`Token error: API authentication failed` on Codex path**: clear stray `OPENAI_API_KEY` values and verify the `codex` CLI session itself works.
- **`Token error: API authentication failed` on OAuth**: fallback to API-key or keep OAuth/`browser-session` token fresh.
- **App reports stub with `authError`**: check env + auth file path + provider availability (`CODEX_CLI_COMMAND` / `USE_BROWSER_SESSION_TRANSPORT` / `USE_STUB_PROVIDER`).
