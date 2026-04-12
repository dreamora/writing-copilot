# Writing Copilot — Go/No-Go Decision Memo

**Document type:** Decision Memo (fill after completing trial set)
**Version:** 1.0 template

---

## Header

```
author: Marc Schärer
date: YYYY-MM-DD
trials_completed: N short-form + N essay
total_build_effort_hours: ~N h
decision: CONTINUE | PIVOT | KILL
```

---

## 1. Executive Summary (2–3 sentences)

_What was built, what was tested, what the evidence says._

---

## 2. Trial Outcomes

### Short-form trials (N completed)

| Trial ID | Total time | Baseline avg | Delta | Speed pass? | Signal |
|----------|-----------|-------------|-------|------------|--------|
| short-… | ___ min | ___ min | ___% | ✅/❌ | helped/neutral/slowed |
| short-… | ___ min | ___ min | ___% | ✅/❌ | helped/neutral/slowed |
| short-… | ___ min | ___ min | ___% | ✅/❌ | helped/neutral/slowed |

**Short-form verdict:** ___

### Essay trials (N completed)

| Trial ID | Active refinement time | Baseline est | Delta | Speed pass? | Signal |
|----------|----------------------|-------------|-------|------------|--------|
| essay-… | ___ min | ___ min | ___% | ✅/❌ | helped/neutral/slowed |

**Essay verdict:** ___

---

## 3. Quality Proxy Summary

_Were engagement metrics (views + reactions) non-inferior to baseline?_

- Baseline avg views (1d): ___
- Trial posts avg views (1d): ___
- Δ views: ___% (___ posts, ___ confidence)
- Quality verdict: **non-inferior / better / worse / insufficient data**

---

## 4. Surprises

_What was unexpected — good or bad?_

---

## 5. Blockers and Friction Points

_What slowed down the trials or reduced the tool's value?_

| Issue | Severity | Fixable? |
|-------|----------|---------|
| | | |

---

## 6. Kill-Gate Check

Answer ALL questions honestly:

1. **Was draft-to-final time reduced by ≥ 20% on short-form?** Yes / No / Uncertain
2. **Was essay refinement time reduced or comparable?** Yes / No / Uncertain
3. **Was quality proxy non-inferior?** Yes / No / Insufficient data
4. **Would you use this tool for your next real post?** Yes / No
5. **Is total build effort ≤ 20h?** Yes / No (current: ~___ h)

_If ≥ 3 answers are No/Uncertain: **KILL or PIVOT required.**_
_If ≥ 4 answers are Yes: **CONTINUE is justified.**_

---

## 7. Recommendation

### Decision: **[ CONTINUE / PIVOT / KILL ]**

#### Continue criteria met if:
- Speed target achieved on ≥ 2/3 short-form trials
- Quality proxy non-inferior
- Kill-gate check ≥ 4 Yes

#### Pivot criteria met if:
- Speed improved but quality uncertain
- UX friction is identifiable and fixable
- Specific pivot: ___

#### Kill criteria met if:
- No speed improvement after 3+ trials
- OR: total build effort ≥ 20h with no clear advantage over plain ChatGPT

---

## 8. Next Actions

If **CONTINUE:**
- [ ] Ship to production use on next post
- [ ] Run 3 more trials to build statistical confidence
- [ ] Prioritize Phase 6 backlog items: ___

If **PIVOT:**
- [ ] Document specific UX friction: ___
- [ ] Scope minimal pivot: ___
- [ ] Re-evaluate after pivot: ___

If **KILL:**
- [ ] Archive repo + learnings
- [ ] Extract reusable patterns: ___
- [ ] Document what didn't work and why: ___

---

## 9. Sign-off

```
decision_made_by: Marc Schärer
date: YYYY-MM-DD
final_decision: CONTINUE | PIVOT | KILL
```
