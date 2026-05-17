---
title: Prioritize active review threads
type: feat
status: completed
date: 2026-05-17
---

# Prioritize active review threads

## Summary

Rework the review sidebar so threads that still need an immediate decision stay at the top, deferred decisions move into an explicit folded parking-lot section, and settled decisions move into a folded history section below. Both non-actionable sections must stay collapsed by default so they do not distract from pending work.

---

## Problem Frame

The current review thread list treats open work and already-decided threads as the same visual weight. That makes the sidebar noisy when a document accumulates a lot of resolved feedback, and it pushes the actionable items farther from view than they need to be.

---

## Requirements

- R1. Surface actionable review threads before settled ones so the sidebar supports quick triage.
- R2. Fold decided threads into a separate history section that is collapsed by default in all cases.
- R3. Keep deferred threads separate from both actionable work and finished decisions, with an explicit way to reopen them.
- R4. Preserve the existing per-thread actions, status badges, and error/loading behavior.
- R5. Prevent stale or missing API routes from returning static HTML to JSON clients.

---

## Scope Boundaries

- No database schema changes.
- No change to the accept/reject/edit semantics.
- No persistence for collapse state in this iteration.
- No redesign of the thread card contents beyond what is needed to support the new grouping and layout.

### Deferred to Follow-Up Work

- Remember the history collapse state per document or session.
- Add richer filtering or search within long review histories.

---

## Context & Research

### Relevant Code and Patterns

- `web/src/App.tsx` currently owns the review sidebar composition and the `Review threads` heading, so it is the main entry point for the new grouping.
- `web/src/features/suggestions/SuggestionThread.tsx` already encapsulates the thread card, action buttons, and status badge logic, which should be preserved rather than duplicated.
- `web/src/features/insights/CompactSummary.tsx` and `web/src/features/annotations/AnnotationPanel.tsx` show the repo's existing sidebar/panel styling pattern for compact utility surfaces.
- `tests/integration/suggestion-flow.test.ts` documents the suggestion status lifecycle and is the clearest local reference for which statuses count as finished versus still actionable.

### Institutional Learnings

- No repo-local learning note materially changes this small UI reflow.

### External References

- None needed; the existing repo patterns are sufficient for this change.

---

## Key Technical Decisions

- Group by existing suggestion status instead of introducing a new archival flag, so the sidebar stays derived from current suggestion data.
- Treat only `open` suggestions as actionable-area content.
- Treat `deferred` suggestions as parked work in a separate folded section with a `Reopen` action.
- Treat `accepted`, `rejected`, and `edited_applied` suggestions as settled decisions in the folded history section.
- Keep the deferred and history sections collapsed by default in all cases, with explicit toggles to reveal those threads when the user wants that context.
- Preserve the existing `SuggestionThread` card and action handlers; the change is about grouping and presentation, not a new interaction model.

---

## Open Questions

### Resolved During Planning

 - Which threads belong in history: settled decisions only, not deferred items.
 - Deferred decisions should be parked in their own collapsed group and return to the actionable queue only through an explicit reopen action.

### Deferred to Implementation

- Exact spacing, typography, and density tuning for the new section headers once the sidebar is rendered in the browser.

---

## Implementation Units

### U1. Derive actionable and history sections

**Goal:** Centralize the sidebar's thread classification so the UI can render active work first, parked deferred work second, and settled decisions below it.

**Requirements:** R1, R2, R3, R4

**Dependencies:** None

**Files:**
- Create: `web/src/features/suggestions/review-thread-groups.ts`
- Modify: `web/src/App.tsx`
- Test: `tests/unit/review-thread-groups.test.ts`

**Approach:**
- Add a small helper that takes the loaded suggestions and returns actionable, deferred, and history sections.
- Keep the grouping rule local to the client so the rest of the app continues to work with the same suggestion model.
- Preserve existing suggestion objects intact; the helper should only classify and partition them.

**Execution note:** Start by locking the grouping behavior in tests before wiring the sidebar to it.

**Patterns to follow:**
- `web/src/features/insights/CompactSummary.tsx` for small derived UI state and compact rendering logic.
- `tests/unit/annotation-highlights.test.ts` for concise Bun-based unit coverage against a pure helper.

**Test scenarios:**
- Happy path: a mixed list with open, deferred, accepted, rejected, and edited-applied suggestions yields an actionable section containing open items, a deferred section containing parked items, and a history section containing settled ones.
- Happy path: an open-only list yields an empty history section and leaves the actionable section unchanged.
- Edge case: an empty suggestion list yields empty sections without throwing.
- Edge case: an unexpected status stays visible in the actionable section rather than disappearing from the sidebar.
- Integration: the helper reports that history should start collapsed whether or not actionable threads are present.

**Verification:**
- The grouping helper produces a deterministic active-vs-history split that the sidebar can consume without extra filtering logic in the view layer.

### U2. Rework the sidebar composition

**Goal:** Render the review sidebar with a prominent actionable section, a folded deferred section, and a folded history section below it.

**Requirements:** R1, R2, R3, R4

**Dependencies:** U1

**Files:**
- Create: `web/src/features/suggestions/ReviewThreadList.tsx`
- Modify: `web/src/App.tsx`
- Test: `tests/unit/review-thread-list.test.ts`

**Approach:**
- Move the section rendering out of `App.tsx` into a small list component so the sidebar layout is easier to test and reason about.
- Render the actionable threads first, followed by folded deferred and history sections that always start closed and show counts in their summary rows.
- Keep the existing `SuggestionThread` card component as the per-thread renderer in both sections so actions, badges, and errors behave exactly as they do now.
- Preserve the existing empty state when there are no suggestions at all, and keep the history section collapsed by default even when the sidebar contains only settled decisions.

**Patterns to follow:**
- `web/src/features/annotations/AnnotationPanel.tsx` for sidebar section headings and compact stacked layout.
- `web/src/features/insights/CompactSummary.tsx` for a dense utility panel that still remains scannable.

**Test scenarios:**
- Happy path: when active, deferred, and historical suggestions exist, the actionable section renders first and the deferred/history toggles appear below it with the correct counts.
- Happy path: clicking the history toggle reveals settled threads and clicking it again hides them.
- Edge case: when only settled threads exist, the history section still starts collapsed and shows only its summary row until the user opens it.
- Edge case: when no suggestions exist, the sidebar keeps the current empty-state copy instead of showing a dead toggle.
- Integration: the existing accept, reject, edit-apply, and defer controls still render on the same thread cards after the sidebar is regrouped.

**Verification:**
- The sidebar makes current work visually primary, while deferred work and past decisions remain available behind explicit fold controls.

### U3. Add deferred reopen behavior and API fallback hardening

**Goal:** Make deferred decisions recoverable and prevent stale route misses from surfacing as JSON parse failures.

**Requirements:** R3, R5

**Dependencies:** U1, U2

**Files:**
- Modify: `src/api/server.ts`
- Modify: `src/domain/suggestions/suggestion-service.ts`
- Modify: `src/domain/telemetry/event-types.ts`
- Modify: `src/routes/suggestions.ts`
- Modify: `web/src/features/suggestions/SuggestionActions.ts`
- Modify: `web/src/features/suggestions/SuggestionThread.tsx`
- Test: `tests/integration/api-routes.test.ts`
- Test: `tests/integration/suggestion-flow.test.ts`
- Test: `tests/unit/suggestion-actions.test.ts`

**Approach:**
- Add a `POST /api/suggestions/:id/reopen` route that transitions a deferred suggestion back to `open`.
- Emit a `suggestion_reopened` telemetry event.
- Add a deferred-card `Reopen` button.
- Ensure unmatched `/api` requests return JSON `404` before static fallback.
- Teach the suggestion API client to report non-JSON/HTML API responses as stale-server or API-target mismatches.

**Verification:**
- Reopen transitions deferred suggestions back to open without `decidedAt`.
- Missing API routes return JSON instead of `index.html`.
- The UI reports stale server responses clearly instead of throwing a raw JSON parse error.

---

## System-Wide Impact

- **Interaction graph:** The change stays primarily inside the review sidebar composition path, with one lifecycle addition for reopening deferred suggestions.
- **Error propagation:** Existing per-thread action errors continue to surface from `SuggestionThread`; stale API/static mismatches now produce a clearer client error.
- **State lifecycle risks:** The only new UI state is local collapse state for the deferred and history sections, so reloads return the sidebar to its default collapsed behavior.
- **API surface parity:** Existing endpoints remain unchanged; the API surface adds `POST /api/suggestions/:id/reopen`.
- **Integration coverage:** The main cross-layer risk is ensuring the regrouped sidebar still preserves action buttons and empty states in the same document-review flow.
- **Unchanged invariants:** Accepted, rejected, edited-applied, open, and deferred suggestions keep their current meaning; the UI only changes how they are presented.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Folding settled or deferred threads could hide useful context too aggressively. | Keep counts visible and require an explicit user action to open deferred/history sections. |
| A future status could be misclassified and disappear from view. | Centralize the grouping helper and default unknown statuses into the actionable area so they stay visible. |
| The sidebar could become cramped on smaller widths once a toggle is added. | Keep the new control in the existing stacked layout and avoid adding a second visual density layer to the cards themselves. |
| A stale API server could return static HTML to a new frontend route. | Return JSON for all unmatched `/api` routes and make the client detect non-JSON responses. |

---

## Documentation / Operational Notes

- No user-facing docs need to change for this pass.
- If the layout lands well, the same grouping pattern may be reusable for other list-heavy review surfaces later.

---

## Sources & References

- Related code: `web/src/App.tsx`
- Related code: `web/src/features/suggestions/SuggestionThread.tsx`
- Related code: `web/src/features/insights/CompactSummary.tsx`
- Related code: `web/src/features/annotations/AnnotationPanel.tsx`
- Related code: `tests/integration/suggestion-flow.test.ts`
