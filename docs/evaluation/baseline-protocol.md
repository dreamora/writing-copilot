# Writing Copilot — Baseline Protocol

**Version:** 1.0 (FROZEN — do not modify after first trial run)
**Frozen by:** Bilby / Writing Copilot Phase 5
**Date:** 2026-04-12

---

## Purpose

This document defines the **current baseline workflow** (no Writing Copilot) for comparison against the tool. It must be frozen before any trial runs begin so that comparison is fair and non-retroactive.

---

## Baseline Workflow Definition

### Current process (as of freeze date)

1. **Draft creation** — Write first draft in plain markdown editor (Obsidian / VS Code) or directly in Substack web editor.
2. **Self-review** — One or two manual read-throughs, editing inline.
3. **AI assist (ad hoc)** — Copy-paste sections into ChatGPT (chat.openai.com) or Claude.ai with ad-hoc prompts like "tighten this", "is this clear?".
4. **Apply suggestions manually** — Copy-paste proposed rewrites back into editor.
5. **Final publish** — Substack draft → schedule/publish.

### Pain points being measured

- Time lost to context-switching (editor ↔ ChatGPT ↔ back)
- Loss of selection anchor (can't tell which word/phrase was improved)
- No systematic logging of what AI changed vs what was kept
- No session replay to learn from

---

## Measurement Method

### Timing

| Point | Definition |
|-------|-----------|
| **Start** | First keystroke on the draft (or first significant edit after outline) |
| **End** | "Publish" or "schedule" clicked in Substack |

### Required log fields (fill per session)

```
date: YYYY-MM-DD
content_type: short-form | essay
draft_word_count_start: N
final_word_count: N
start_time: HH:MM UTC
end_time: HH:MM UTC
total_minutes: N
rewrite_rounds: N  (number of distinct AI consultation passes)
ai_tool_used: ChatGPT-4o | Claude-3.5 | none
subjective_effort: 1-5  (1=effortless, 5=exhausting)
subjective_quality: 1-5  (1=weak, 5=best work)
notes: <freeform>
```

---

## Baseline Rubric (frozen)

### Speed targets (baseline — no tool)

| Content type | Expected time |
|-------------|---------------|
| Short-form (newsletter, 400–800 words) | 60–120 min |
| Essay (long-form, 1200–2500 words) | 2–4 hours active work |

### Quality proxy baseline

Measure at 1d / 3d / 7d post-publish on Substack:
- Views
- Reactions (likes/restacks)

Reference: prior 3 comparable posts in the same content type.

---

## Freeze Confirmation

This protocol is **immutable for the duration of Phase 5 trials**. Any modification invalidates the comparison and requires re-running baseline sessions.

Signed off: Bilby, 2026-04-12
