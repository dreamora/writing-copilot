# Writing Copilot — Essay-Form Trial Blueprint

**Version:** 1.0
**Trial type:** Long-form essay (1200–2500 words)
**Pass threshold:** ≤ 1.5 active writing days (≤ ~6 hours total active time)
**Baseline reference:** `baseline-protocol.md`

---

## Pre-Trial Setup Checklist

- [ ] Writing Copilot stack running (API + web)
- [ ] Draft exists as markdown file in `docs/`
- [ ] Topic and target length confirmed in advance
- [ ] Trial log template open
- [ ] **Timer not started**

---

## Session Structure

Essay trials run across multiple sessions (drafting is multi-day). Track **active time only** (exclude idle periods > 10 minutes).

### Session A — Drafting (not measured by tool)
- Write full first draft in your normal editor
- Target: rough draft complete, no polishing yet
- **Do not use Writing Copilot during drafting** (tool is for refinement only)
- Log: `draft_word_count`, `draft_session_minutes`

### Session B — Structured refinement pass 1 (measured)
**Start clock.**

1. Load draft into Writing Copilot
2. Read essay top-to-bottom — identify weak sections
3. For each weak section: select + action (tighten / clarify / rewrite)
   - Target: 6–12 suggestion requests across the essay
4. Review and decide on each suggestion (accept / reject / edit / defer)
5. Save document
6. **Pause clock if taking a break > 10 min**

**End of Session B:** Export session summary.

### Session C — Final pass (measured, optional if not needed)
1. Fresh read of revised draft
2. Final selection-based suggestions on any remaining rough spots (≤ 4 suggestions)
3. Manual corrections
4. Final save + export summary
5. **Stop clock**

---

## Trial Log Template

```
trial_id: essay-<YYYY-MM-DD>-<n>
date: YYYY-MM-DD
topic: <brief topic description>
draft_word_count: N
final_word_count: N

# Session A (drafting — not tool-measured)
draft_session_minutes: N

# Session B (refinement pass 1)
session_b_start: HH:MM UTC
session_b_end: HH:MM UTC
session_b_minutes: N
session_b_suggestions_created: N
session_b_accepted: N
session_b_rejected: N

# Session C (final pass — if run)
session_c_run: yes | no
session_c_minutes: N
session_c_suggestions_created: N

# Totals
total_active_refinement_minutes: N  (B + C)
rewrite_rounds: N
subjective_effort: 1-5
subjective_quality: 1-5
session_summary_files: [path-b.md, path-c.md]
notes: <freeform>
```

---

## Pass/Fail Criteria

| Criterion | Pass | Fail |
|-----------|------|------|
| Total active refinement time | ≤ 360 min (6h) | > 360 min |
| Essay is publish-ready | Yes | Requires another full round |
| At least 6 suggestions created | Yes | No |
| Session summary exported | Yes | No |
| No crashes or data loss | Yes | Any data lost |

---

## Notes on Scope

- Essay = long-form Substack post, newsletter deep-dive, or major LinkedIn piece
- Minimum 1 essay trial before scoring; 2 strongly preferred
- Time tracking: use a stopwatch app — pause when not actively working
- Acceptable to split into 2 calendar days; measure active time only

---

## Schedule

Run 1–2 essay trials. The first trial outcome (plus 3 short-form trials) is sufficient for the kill-gate check at ~20h total build effort.
