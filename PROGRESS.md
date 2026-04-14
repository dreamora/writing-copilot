# PROGRESS.md — Writing Copilot Epic A

## Current Quest
- **ID:** writing-copilot-epic-a
- **Title:** Epic A — ChatGPT auth foundation
- **Status:** in-progress
- **Started:** 2026-04-14T17:40:00Z
- **Updated:** 2026-04-14T17:40:00Z

## Acceptance Criteria (from Roadmap)
- [ ] AC1: Auth JSON path configurable via env or config file, safe for CI/CD
- [ ] AC2: Token refresh cycle implemented with retries and graceful fallback
- [ ] AC3: No auth creds logged or exposed in telemetry
- [ ] AC4: Rollback path documented — can switch back to mocks in 1 commit

## Atomic Milestones
- [ ] A.1 — Auth Config Layer (env/config parsing, JSON schema validation)
- [ ] A.2 — Token Storage & Lifecycle (read/write, refresh, expiry handling)
- [ ] A.3 — OpenAI Integration (replace mock client, real API calls)
- [ ] A.4 — Safety & Validation (no-log guards, rollback tests)

## Implementation Plan
1. Create `src/adapters/auth/` with config parser (Zod schema for auth.json)
2. Create auth JSON contract: `writing-copilot/.secrets/chatgpt-auth.json` (example)
3. Update `.gitignore` to exclude `.secrets/`
4. Refactor OpenAiSuggestionProvider to accept provider abstraction instead of raw API key
5. Create AuthConfig resolver that loads from JSON or ENV fallback
6. Add safety guards: no credential logging, sanitized error messages
7. Write tests for all paths (valid auth, missing auth, malformed JSON)
8. Document rollback path

## Blockers
None yet.

## Steps
- [ ] Step 1: Read architecture docs and understand current auth flow
- [ ] Step 2: Design AuthConfig interface and Zod schema
- [ ] Step 3: Create auth config layer in src/adapters/auth/
- [ ] Step 4: Add .secrets example and .gitignore rules
- [ ] Step 5: Refactor OpenAiSuggestionProvider to use auth seam
- [ ] Step 6: Write safety tests (logging, sanitization)
- [ ] Step 7: Test smoke path (auth works, auth missing, auth malformed)
- [ ] Step 8: Verify full test suite passes
- [ ] Step 9: Commit with message "feat(auth): ChatGPT auth bootstrap via JSON config"
- [ ] Step 10: Update docs with auth setup instructions

## Completed Quests
(none yet)
