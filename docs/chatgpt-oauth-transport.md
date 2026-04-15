# ChatGPT OAuth transport notes

_Last updated: 2026-04-15_

## What works

- Auth file parsing from `writing-copilot/.secrets/chatgpt-auth.json`
- OAuth contract shape:
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
- Browser-shaped requests with these headers can reach ChatGPT web endpoints such as `https://chatgpt.com/backend-api/models`:
  - `Authorization: Bearer <access>`
  - `OpenAI-Account-ID: <accountId>`
  - `OAI-Device-Id: <uuid>`
  - browser-like `User-Agent`, `Origin`, `Referer`, `Accept`

## What does NOT work

### 1. Standard OpenAI API path

Using the OAuth `access` token against `https://api.openai.com/v1` does **not** work for live completions. The token is not accepted as a normal API key transport.

### 2. Direct ChatGPT conversation call from backend only

Calling `https://chatgpt.com/backend-api/conversation` with just OAuth auth + browser-like headers still fails with an **unusual activity** 403.

### 3. Sentinel token alone is insufficient

`POST https://chatgpt.com/backend-api/sentinel/chat-requirements` succeeds and returns a requirements payload, but that payload currently indicates extra browser challenge requirements such as:

- `turnstile.required = true`
- `proofofwork.required = true`

Even after including the returned chat-requirements token in the conversation request, the conversation call still fails.

## Current conclusion

For this environment, **OAuth JSON alone is not enough to unlock live ChatGPT web completions from the backend**.

A future live transport likely needs one of these:

1. browser-session-backed execution (real browser context),
2. additional challenge artifacts (Turnstile/proof tokens), or
3. a different officially supported ChatGPT-authenticated API path if one becomes available.

## Current repo stance

- Keep OAuth contract + smoke tooling in place.
- Keep stub fallback behavior explicit and user-visible.
- Treat live ChatGPT transport as a separate blocker/workstream, not as a silent failure.

---

## Implementation Status (2026-04-15)

### Browser-Session Transport — Now Available

A dedicated `ChatGptBrowserSessionProvider` has been implemented to use OAuth-backed browser session transport:

**Files:**
- `src/adapters/ai/ChatGptBrowserSessionProvider.ts` — Main provider class
- `src/adapters/ai/sentinel-requirements.ts` — Challenge requirement parsing
- `tests/unit/chatgpt-browser-session.test.ts` — Unit tests

**Activation:**
```bash
USE_BROWSER_SESSION_TRANSPORT=true npm run dev
```

**Lifecycle:**
1. Exchange OAuth token for sentinel token via `/backend-api/sentinel/chat-requirements`
2. Parse requirements for proof-of-work challenge
3. Solve PoW challenge using `generateProofOfWorkToken()`
4. Send authenticated conversation request to `/backend-api/conversation`
5. Stream and collect live ChatGPT response

**Known Limitations:**
- Proof-of-work challenge is currently mocked (placeholder)
- Real sentinel response parsing needed for production use
- Requires network access to chatgpt.com

**Fallback Behavior:**
If browser-session transport fails at any step, the system gracefully falls back to the standard OpenAI provider (if configured) or stub mode.

**Provider Selection Hierarchy:**
1. `USE_STUB_PROVIDER=true` → StubSuggestionProvider
2. `USE_BROWSER_SESSION_TRANSPORT=true` → ChatGptBrowserSessionProvider (with OpenAI fallback)
3. Default → OpenAiSuggestionProvider
