# Writing Copilot — Kill-Gate Enforcement Checklist

**Version:** 1.0
**Purpose:** Prevent sunk-cost bias from overriding clear evidence. Answer these questions honestly before making a continue/pivot/kill call.

---

## ⚠️ MANDATORY GATE: 20-Hour Rule

> **Total build effort target: ≤ 20 hours.**
> If you exceed 20 hours of build effort without demonstrable improvement over plain ChatGPT, the default decision is **KILL**.

Current build effort estimate: **~8–10 hours** (Phases 0–4)
Remaining budget for Phase 5 + fixes: **~10–12 hours**

```
[ ] I have honestly tracked the total build effort and it is ≤ 20h, OR
[ ] I have exceeded 20h AND I have clear, documented evidence of advantage.
```

If you cannot check either box: **STOP. The answer is KILL.**

---

## Section 1 — Speed Gate

Answer each question with **YES / NO / UNCERTAIN**.

```
[ ] SHORT-FORM: Did at least 2 out of 3 short-form trials complete in ≤ 60 min?
    Answer: ___

[ ] ESSAY: Did the essay refinement pass complete in ≤ 2 hours active time?
    Answer: ___

[ ] COMPARISON: Is Writing Copilot measurably faster than copy-pasting into ChatGPT?
    Answer: ___
    Evidence: ___
```

**Speed gate verdict:**
- 3 × YES → PASS
- 2 × YES → conditional PASS (note caveats)
- ≤ 1 × YES → FAIL → **PIVOT or KILL required**

---

## Section 2 — Quality Gate

```
[ ] QUALITY: Are post engagement metrics (views, reactions) non-inferior to baseline?
    Answer: ___
    Baseline avg: ___ / Trial avg: ___

[ ] SUBJECTIVE: Is the writing quality equal or better than your unassisted best?
    Answer: ___
    
[ ] CONFIDENCE: Do you trust the quality data (≥ 3 posts measured)?
    Answer: ___
```

**Quality gate verdict:**
- 3 × YES → PASS
- 2 × YES, uncertain data → PASS with caveat
- Quality clearly worse → KILL regardless of speed

---

## Section 3 — Workflow Fit Gate

```
[ ] Would you choose Writing Copilot over opening ChatGPT.com for your next post?
    Answer: ___

[ ] Does the tool reduce mental friction (not add it)?
    Answer: ___

[ ] Can a non-technical user (future Marc) operate this in 5 minutes?
    Answer: ___
```

**Workflow gate verdict:**
- 3 × YES → PASS
- 2 × YES → PASS with UX notes
- ≤ 1 × YES → PIVOT required (fix friction before continuing)

---

## Section 4 — Comparative Advantage Test

The critical question:

> **"Is Writing Copilot clearly better than just pasting text into ChatGPT-4o with a good system prompt?"**

```
Answer: YES / NO / UNCERTAIN

Specific advantages over plain ChatGPT (if YES):
1. ___
2. ___
3. ___

Specific disadvantages vs plain ChatGPT:
1. ___
2. ___
```

If the honest answer is **NO or UNCERTAIN after 3+ trials**: this is a **KILL signal**.

---

## Section 5 — Final Decision Logic

Tally your gate results:

| Gate | Result |
|------|--------|
| 20h rule | PASS / FAIL |
| Speed gate | PASS / FAIL |
| Quality gate | PASS / FAIL |
| Workflow gate | PASS / FAIL |
| Comparative advantage | YES / NO / UNCERTAIN |

**Decision matrix:**

| Pattern | Decision |
|---------|---------|
| All 4 gates PASS + Comparative YES | **CONTINUE** |
| 3 gates PASS + Comparative YES | **CONTINUE with notes** |
| Speed PASS + Quality uncertain + specific fixable friction | **PIVOT** |
| Speed FAIL OR Quality clearly worse OR 20h exceeded | **KILL** |
| Comparative NO after honest assessment | **KILL** |

---

## Anti-Patterns to Watch (sunk-cost traps)

❌ "We've already built 4 phases, we should keep going."
❌ "One more trial will clarify things."
❌ "The idea is good, it just needs more polish."
❌ "The baseline measurement wasn't fair."

**Counter:** The 20h rule exists precisely because these thoughts feel compelling. Honor the gate.

---

## Signature

By completing this checklist, I confirm the decision is based on the evidence above, not on the effort invested.

```
completed_by: ___
date: YYYY-MM-DD
final_decision: CONTINUE | PIVOT | KILL
```
