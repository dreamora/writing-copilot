# Writing Copilot — Go/No-Go Assessment

**Type:** Pre-trial assessment (functional readiness + architectural review)
**Date:** 2026-04-12
**Author:** Bilby
**Status:** READY FOR REAL TRIALS — recommendation: **CONTINUE to trials**

---

## Context

Phases 0–4 are fully implemented. Phase 5 is the trial readiness + evaluation protocol phase. Real trials (with Marc writing actual posts) have not yet been run — that requires production use with OPENAI_API_KEY configured.

This document assesses the **technical readiness** of the system and makes a provisional **CONTINUE** recommendation to proceed to real trials, with specific gates to enforce the kill criteria.

---

## What Was Built (Phases 0–4 Summary)

| Phase | Deliverable | Status |
|-------|------------|--------|
| 0 | Repo scaffold, SQLite migrations, safe file I/O, API shell, web shell | ✅ |
| 1 | Block parser, stable IDs, recomposer, block editor UI, round-trip fidelity | ✅ |
| 2 | Selection popover, context envelope, OpenAI adapter, suggestion lifecycle | ✅ |
| 3 | Telemetry events, rewrite capture, block time, FTS5 search, insights endpoints | ✅ |
| 4 | Insight cockpit, 4 metric cards, helped/slowed heuristic, session summary export | ✅ |

**Total test coverage:** 89 tests passing (0 failures)

---

## Technical Readiness Assessment

### 1. Core workflow completeness ✅
The full loop works:
1. Load markdown → parse to blocks
2. Select text → popover action → AI suggestion
3. Review diff → accept / reject / edit-apply / defer
4. Save document (with backup)
5. View session insights → export summary

### 2. Data integrity ✅
- Backup-on-save: every write creates `.bak` file
- Path traversal protection in file adapter
- Idempotent migrations
- WAL mode SQLite

### 3. Provider flexibility ✅
- `StubSuggestionProvider` for zero-API-key testing
- `OpenAiSuggestionProvider` with timeout + retry
- Clean interface: swap provider without changing domain code

### 4. Observability ✅
- Every lifecycle action emits telemetry event
- FTS5 full-text search on suggestions and rewrites
- Session summary markdown export ready

### 5. Known gaps (not blocking)
- No OAuth or multi-user support (not in scope for v1 single-user tool)
- No mobile UI (deferred)
- `avgTimePerBlock` not wired into helped/slowed heuristic (minor gap)
- FTS5 triggers replaced with inline population (works, documented in learnings)

---

## Kill-Gate Pre-Check (Provisional — before real trials)

| Gate | Pre-trial Assessment |
|------|---------------------|
| 20h rule | Estimated ~10h build effort. **PASS** — within budget |
| Speed potential | Selection + AI is faster than copy-paste to ChatGPT. **LIKELY PASS** |
| Quality | Architecture supports quality via context envelope + strict schema. **UNCERTAIN** — needs trials |
| Workflow fit | Single-page app, one-click actions. **LIKELY PASS** |
| Comparative advantage | Anchored selection, persistent lifecycle, telemetry are genuine advantages. **LIKELY YES** |

**Pre-trial verdict:** No obvious kill signals. Proceed to real trials.

---

## Provisional Recommendation

### Decision: **CONTINUE — proceed to real trials**

**Rationale:**
1. System is functionally complete and technically sound (89 tests pass)
2. Build effort is ~10h — well within the 20h kill gate
3. The core workflow hypothesis is testable: anchored AI suggestions should reduce context-switching overhead vs copy-pasting to ChatGPT
4. All evaluation infrastructure is in place (trial protocols, scorecard, decision memo template)

**Next immediate actions:**
1. Set `OPENAI_API_KEY` in `.env`
2. Run `bun run db:migrate && bun run dev:api & bun run dev:web`
3. Execute 3 short-form trials per `docs/evaluation/short-form-trial.md`
4. Fill `docs/evaluation/comparison-scorecard-template.md` after each trial
5. After 3 trials: run `docs/evaluation/kill-gate-checklist.md` — honor the gate

**Kill gate remains binding.** If speed targets are not met after 3 real trials, KILL.

---

## Evidence Trail

All code lives in: `/openclaw-home/.openclaw/workspace-bilby/writing-copilot/`

```
git log --oneline:
4db16ed wip(writing-copilot-phase5-impl): beads 5.1-5.7 — eval docs + 89 tests
a95e8aa feat(writing-copilot-phase4-impl): Phase 4 complete
3aa8ec6 wip(writing-copilot-phase4-impl): beads 4.1-4.5
9d75558 feat(writing-copilot-phase3-impl): Phase 3 complete
5bb75f7 feat(writing-copilot-phase2-impl): Phase 2 complete
c3d576d wip(writing-copilot-phase1-impl): bead 1.7
725bfa8 wip(writing-copilot-phase1-impl): beads 1.1-1.4
d1eb3e6 fix(migrate)
e3de6b5 feat(phase0-bead0.2-0.6)
e897714 scaffold(phase0-bead0.1)
```
