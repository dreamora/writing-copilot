# Writing Copilot — Comparison Scorecard Template

**Version:** 1.0
**Instructions:** Fill one scorecard per completed trial. Compare Writing Copilot result to the baseline established in `baseline-protocol.md`.

---

## Trial Metadata

```
trial_id: <from trial log>
content_type: short-form | essay
date: YYYY-MM-DD
baseline_reference_posts: [post-title-1, post-title-2, post-title-3]
```

---

## Speed Comparison

| Metric | Baseline (avg) | This Trial | Delta | Pass? |
|--------|---------------|-----------|-------|-------|
| Total active time (min) | ___ | ___ | ___% | ✅/❌ |
| Rewrite rounds | ___ | ___ | ___ | ✅/❌ |
| Manual AI consultations | ___ | N/A (built-in) | — | — |

**Speed verdict:** Better / Same / Worse
**Notes:**

---

## Effort Comparison

| Metric | Baseline (avg) | This Trial | Interpretation |
|--------|---------------|-----------|----------------|
| Subjective effort (1–5) | ___ | ___ | Lower = better |
| Context switches (approx) | ___ | ___ (integrated) | Lower = better |
| Suggestions needed | N/A | ___ | — |

**Effort verdict:** Better / Same / Worse

---

## Quality Proxy (fill at 1d / 3d / 7d post-publish)

| Metric | Baseline avg (3 posts) | This post (1d) | This post (3d) | This post (7d) |
|--------|----------------------|---------------|---------------|---------------|
| Views | ___ | ___ | ___ | ___ |
| Reactions | ___ | ___ | ___ | ___ |

**Quality verdict:** Non-inferior / Better / Worse / Uncertain (need more data)

---

## AI Suggestion Effectiveness

_From Writing Copilot session summary export_

| Metric | Value |
|--------|-------|
| Acceptance rate | __% |
| Most accepted action type | ___ |
| Most rejected action type | ___ |
| Helped-vs-slowed signal | helped / neutral / slowed |
| High-friction hotspots | ___ |

---

## Overall Scorecard

| Dimension | Score (1–5) | Weight | Weighted |
|-----------|------------|--------|---------|
| Speed | ___ | 30% | ___ |
| Effort reduction | ___ | 25% | ___ |
| Quality proxy | ___ | 30% | ___ |
| Tool reliability | ___ | 15% | ___ |
| **Total** | | 100% | ___ |

**Scoring guide:**
- 5 = strongly better than baseline
- 4 = somewhat better
- 3 = same
- 2 = somewhat worse
- 1 = clearly worse

---

## Surprises / Anomalies

_What happened that wasn't predicted?_

---

## Confidence Level

- [ ] High: clean trial, good baseline data, clear result
- [ ] Medium: some confounds, baseline data sparse
- [ ] Low: trial invalidated or data missing → **re-run required**

---

## Provisional Recommendation from This Trial

- [ ] **Continue** — clear improvement on speed + quality non-inferior
- [ ] **Pivot** — speed improved but needs UI/UX fixes before broader use
- [ ] **Kill** — no improvement over baseline ChatGPT workflow
- [ ] **Inconclusive** — need more trials before deciding

**Reason:**
