# ChatGPT Auth Setup — Writing Copilot

## Auth loading priority (highest first)

1. `OPENAI_API_KEY` environment variable (API-key mode)
2. `.secrets/chatgpt-auth.json` (file-based)
3. `CHATGPT_AUTH_PATH` (path override)

If `OPENAI_API_KEY` is set, it takes precedence and is treated as `openai.type: "api-key"`.

## Provider modes

Bun can use three provider modes:

### 1) OpenAI SDK provider (default)

```bash
export OPENAI_API_KEY="sk-..."
# optional
export OPENAI_MODEL="gpt-4o-mini"
export OPENAI_TEMPERATURE="0.7"
bun run dev:api
```

### 2) Codex CLI provider (explicit)

```bash
export OPENAI_API_KEY="sk-..."
export USE_CODEX_PROVIDER=true
# optional transport overrides
export CODEX_CLI_COMMAND="codex"   # default command name
export CODEX_MODEL="gpt-4.1"      # defaults to gpt-4.1
export CODEX_TIMEOUT_MS="45000"    # timeout for CLI process
```

`USE_CODEX_PROVIDER` makes Bun run suggestion requests through `codex exec` with:

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

- **`Token error: API authentication failed` on Codex path**: check `OPENAI_API_KEY` and CLI auth setup.
- **`Token error: API authentication failed` on OAuth**: fallback to API-key or keep OAuth/`browser-session` token fresh.
- **App reports stub with `authError`**: check env + auth file path + chosen mode (`USE_CODEX_PROVIDER` / `USE_BROWSER_SESSION_TRANSPORT` / `USE_STUB_PROVIDER`).
