# ChatGPT Auth Setup — Writing Copilot

## How auth is loaded (in order)

1. `OPENAI_API_KEY` environment variable (preferred for reliability in this environment)
2. `.secrets/chatgpt-auth.json` (if present)
3. `CHATGPT_AUTH_PATH` environment override path (optional)

`openai.type: "oauth"` entries require `USE_BROWSER_SESSION_TRANSPORT=true` and are subject to `chatgpt.com` anti-abuse behavior.

## Recommended local setup

For stable suggestions, use an OpenAI API key:

```bash
export OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini" # optional
bun run dev:api
```

Using `OPENAI_API_KEY` skips OAuth parsing and uses the OpenAI SDK provider.

## OAuth setup

To keep OAuth mode, set your token file as:

```json
{
  "openai": {
    "type": "oauth",
    "refresh": "...",
    "access": "...",
    "expires": 1776691031314,
    "accountId": "user-id"
  }
}
```

Then start with:

```bash
USE_BROWSER_SESSION_TRANSPORT=true bun run dev:api
```

If `/api/health` reports `providerMode: "stub"`, open that auth error message for a concrete blocker.

## Troubleshooting

- **`Token error: API authentication failed...` with 403/401**: usually OAuth token/challenge mismatch; switch to `OPENAI_API_KEY`.
- **If auth is missing/invalid**: app stays in stub mode and `/api/health` shows `authError`.

