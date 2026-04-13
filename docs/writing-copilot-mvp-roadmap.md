# Writing Copilot MVP — Approved Build Order (A→B→C)

## Overview
After Phase 5 evaluation, Marc approved a new MVP focus order:
- **Epic A: ChatGPT Auth Foundation** (auth strategy, JSON path-based tokens, safe storage)
- **Epic B: Real AI Suggestion MVP** (replace mocks, real OpenAI integration, validation)
- **Epic C: FTS5 Learning Substrate** (semantic search, early leverage for future features)

Dependencies: A → B → C (serial, A is gated)

## Epic A: ChatGPT Auth Foundation

### Description
Move from mock auth to real, persistent ChatGPT credential storage. Use a local JSON file (`auth-tokens.json` or similar) with safe parsing and rollback capability.

### Acceptance Criteria
- [ ] AC1: Auth JSON path configurable via env or config file, safe for CI/CD
- [ ] AC2: Token refresh cycle implemented with retries and graceful fallback
- [ ] AC3: No auth creds logged or exposed in telemetry
- [ ] AC4: Rollback path documented — can switch back to mocks in 1 commit

### Atomic Milestones
1. **A.1 — Auth Config Layer** (env/config parsing, JSON schema validation)
2. **A.2 — Token Storage & Lifecycle** (read/write, refresh, expiry handling)
3. **A.3 — OpenAI Integration** (replace mock client, real API calls)
4. **A.4 — Safety & Validation** (no-log guards, rollback tests)

### Validation Command
```bash
cd writing-copilot && npm test -- --testPathPattern="auth" && npm run build
```

### Rollback
One commit: revert `src/server/auth.ts`, restore `src/server/mock-client.ts`, update imports.

---

## Epic B: Real AI Suggestion MVP

### Description
Replace mock suggestion service with real OpenAI API calls. Validate that suggestions are semantically sound and don't exceed rate limits.

### Acceptance Criteria
- [ ] AC1: Suggestion service uses real OpenAI chat completions, not mocks
- [ ] AC2: Rate limiting in place (e.g., max 2 suggestions/minute per user)
- [ ] AC3: Suggestion quality metrics logged (latency, token count, error rate)
- [ ] AC4: Graceful degradation if OpenAI is unavailable (fallback to placeholder)

### Atomic Milestones
1. **B.1 — OpenAI Client Wiring** (use real credentials from Epic A, remove mocks)
2. **B.2 — Suggestion Prompts & Parameters** (tune temp, max tokens, system prompt)
3. **B.3 — Rate Limiting & Quotas** (middleware, user-level tracking)
4. **B.4 — Validation & Metrics** (telemetry, fallback handlers)

### Validation Command
```bash
cd writing-copilot && npm test -- --testPathPattern="suggestion" && npm run e2e:suggestions
```

### Rollback
Revert `src/server/suggestion-service.ts`, restore mock client references.

### Dependencies
**Depends on: Epic A (auth foundation must be in place)**

---

## Epic C: FTS5 Learning Substrate

### Description
Implement SQLite FTS5 full-text search for past suggestions and user edits. This unlocks:
- Semantic search across suggestion history
- Context injection for future suggestions
- Analysis of what helped vs. what didn't

### Acceptance Criteria
- [ ] AC1: FTS5 table created with indexing strategy (title, content, metadata)
- [ ] AC2: Suggestions indexed automatically on write
- [ ] AC3: Search API returns top-K results ranked by relevance
- [ ] AC4: Learning dashboard can query "what suggestions helped writers most?"

### Atomic Milestones
1. **C.1 — FTS5 Schema & Migrations** (table, indexes, migration scripts)
2. **C.2 — Suggestion Indexing** (auto-index on create/update)
3. **C.3 — Search API & Query DSL** (endpoint, ranking, filters)
4. **C.4 — Learning Dashboard** (new view, help/harm metrics)

### Validation Command
```bash
cd writing-copilot && npm test -- --testPathPattern="fts5|search|learning" && npm run db:migrate:test
```

### Rollback
Drop FTS5 tables, revert migration scripts.

### Dependencies
**Depends on: Epic B (suggestions must be real before we can learn from them)**

---

## Phase Mapping (Old → New)

Old phases 0–5 were sequential feature development. New MVP order A→B→C is a **goal-focused iteration**:

| Old Phase | New Epic | Notes |
|-----------|----------|-------|
| 0 (Scaffold) | — | Already complete, reuse |
| 1 (Basic UI) | A/B foundation | Already implemented, integrate into Epic A/B |
| 2 (Suggestions) | B | Already impl, validate against real API |
| 3 (Telemetry/FTS5) | C | FTS5 schema exists, reuse; focus on learning substrate |
| 4 (Insights) | C+ | Insights dashboard built, focus on learning queries |
| 5 (Eval) | — | Completed, basis for approval; don't re-run |

---

## Timeline & Gates

### Epic A Gate
- All A.1–A.4 milestones complete
- Auth tests: 100%
- Manual test: token refresh works, no creds logged
- Gate: Go/No-Go decision before starting B

### Epic B Gate
- All B.1–B.4 milestones complete
- Suggestion quality metrics acceptable (latency <2s, error rate <5%)
- Rate limiting active, tested under load
- Gate: Go/No-Go before starting C

### Epic C Gate
- All C.1–C.4 milestones complete
- Learning dashboard shows meaningful data
- All tests green
- Gate: Declare "MVP Learning Phase Complete"

---

## Known Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| OpenAI API costs spiral | Rate limit hard (A.1–A.4 milestones include quotas) |
| Auth token leaks | Security audit in A.4, no-log enforcement, rollback ready |
| FTS5 schema conflicts | Test migrations in isolation, schema versioning |
| Old phase code interferes | Start from clean slate; check phase0 scaffold, don't inherit phase1–5 |

---

## Success Metrics

After all three epics:
- Real ChatGPT auth working with zero credential leaks
- 95%+ uptime for suggestion API
- 50+ suggestions indexed and searchable
- Learning dashboard shows 3+ actionable insights
