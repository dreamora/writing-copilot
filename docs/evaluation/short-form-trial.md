# Writing Copilot — Short-Form Trial Blueprint

**Version:** 1.0
**Trial type:** Short-form (newsletter / post, 400–800 words)
**Pass threshold:** ≤ 60 minutes draft-to-publish-ready
**Baseline reference:** `baseline-protocol.md`

---

## Pre-Trial Setup Checklist

- [ ] Writing Copilot API server running (`bun run dev:api`)
- [ ] Writing Copilot web UI running (`bun run dev:web`)
- [ ] OPENAI_API_KEY set in `.env`
- [ ] Sample markdown file exists in `docs/`
- [ ] Trial log template open and ready to fill
- [ ] **Clock not started yet**

---

## Session Steps

### Step 1 — Load draft (< 2 min)
- [ ] Open Writing Copilot web UI
- [ ] Load the draft markdown file via the path input
- [ ] Confirm blocks are parsed correctly (block count visible)
- [ ] **Start clock**

### Step 2 — First pass: selection-based suggestions (≤ 20 min)
- [ ] Read draft top-to-bottom
- [ ] Select 3–6 passages that feel weak, unclear, or wordy
- [ ] For each: choose action (tighten / clarify / rewrite / custom)
- [ ] Review suggestion in panel — accept / reject / edit-apply / defer

### Step 3 — Resolve open suggestions (≤ 10 min)
- [ ] Check suggestion panel for any deferred items
- [ ] Make final accept/reject decision on each
- [ ] Verify block edits applied correctly in editor

### Step 4 — Final read + save (≤ 10 min)
- [ ] Read full draft in editor
- [ ] Make any manual corrections directly
- [ ] Click Save — confirm backup created

### Step 5 — Export session summary (< 2 min)
- [ ] Switch to Insights tab
- [ ] Click Refresh
- [ ] Click Export Summary → download `.md` file
- [ ] **Stop clock**

### Step 6 — Log (< 5 min)
Fill the Trial Log below immediately after stopping clock.

---

## Trial Log Template

```
trial_id: short-<YYYY-MM-DD>-<n>
date: YYYY-MM-DD
start_time: HH:MM UTC
end_time: HH:MM UTC
total_minutes: N
draft_word_count: N
final_word_count: N
suggestions_created: N
suggestions_accepted: N
suggestions_rejected: N
suggestions_edited: N
rewrite_rounds: 1  # (fixed for short-form: one structured pass)
subjective_effort: 1-5
subjective_quality: 1-5
session_summary_file: path/to/summary.md
notes: <freeform>
```

---

## Pass/Fail Criteria

| Criterion | Pass | Fail |
|-----------|------|------|
| Total time | ≤ 60 min | > 60 min |
| All suggestions resolved | Yes | No (deferred > 2) |
| Session summary exported | Yes | No |
| No crashes or data loss | Yes | Any data lost |

**Minimum to count as valid trial:** total time recorded + at least 3 suggestions created.

---

## Notes on Scope

- Short-form = Substack newsletter post, 400–800 words
- Do NOT use Writing Copilot for structural outline work — tool is for post-draft refinement only
- One trial = one complete draft-to-ready cycle (not just editing one section)

---

## Schedule

Run 3 short-form trials minimum before scoring. Trials must be on **different content topics** (no cherry-picking a familiar topic for the easy run).
