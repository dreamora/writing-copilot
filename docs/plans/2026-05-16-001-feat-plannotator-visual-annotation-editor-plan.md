---
title: "feat: Plannotator-style visual annotation editor"
type: feat
status: active
created: 2026-05-16
depth: Standard
---

# feat: Plannotator-style visual annotation editor

## Summary

Replicate the core visual annotation experience from Plannotator in writing-copilot's editor:
inline highlight overlays anchored to char offsets in the rendered markdown preview, a right
sidebar panel listing annotations, and an "annotate" action in the selection popover that
creates a comment annotation. The existing `SelectionSpan` / `captureRenderedSelection()`
infrastructure handles offset mapping; the work is primarily (1) a new `Annotation` domain
type + DB table, (2) highlight injection into the markdown renderer, and (3) the sidebar panel
and popover action.

**Scope boundary:** This plan covers comment-type annotations only (the most valuable case).
`deletion`, `insertion`, `replacement` annotation types and the plan-diff viewer are deferred.

---

## Problem Frame

Writing-copilot already surfaces AI suggestions on selected text, but has no mechanism for
human annotation — marking text for review, leaving comments, or flagging passages. Plannotator
demonstrates a clean pattern: highlights directly in the rendered preview with a right-side panel
listing each annotation and its comment. Replicating this gives copilot users a lightweight
review/commenting workflow on their own documents.

---

## Scope Boundaries

### In Scope
- `comment` annotation type: select text → add annotation comment → highlight appears in preview
- Annotation right-side panel (collapsible)
- Click-to-focus: clicking annotation in panel scrolls/highlights corresponding text
- Hover state on highlight
- Annotation persistence in SQLite
- REST endpoints for annotation CRUD

### Deferred to Follow-Up Work
- `deletion`, `insertion`, `replacement` annotation types
- Plan diff viewer
- Annotation export/import
- Keyboard shortcuts for approve/deny
- Resizable panels
- Sharing / URL encoding

### Out of Scope
- Plannotator's hook server integration pattern
- Theme system / dark mode
- Sidebar with TOC/Files/Archive/Versions tabs

---

## Key Technical Decisions

1. **Separate `annotations` table (not overloading `suggestions`)** — Annotations have different
   semantics (human-authored comments vs AI-generated suggestions). A new table keeps the domain
   clean. The `Suggestion` type remains unchanged.

2. **Inline highlight injection via `renderMarkdownToHtml`** — The custom renderer already owns
   the HTML output. The cleanest approach is to extend `renderMarkdownToHtml` to accept an
   optional `annotations: Annotation[]` parameter and inject `<mark>` spans at `charStart`/
   `charEnd` offsets within each block. No external highlight library needed.

3. **Inline styles, no CSS framework** — Consistent with existing codebase. All highlight
   colors, panel layout, and hover states use inline React style objects.

4. **`useAnnotations` hook** — Mirrors the `useDocumentEditor` pattern in `documentState.ts`.
   Encapsulates annotation load/create/delete + selected annotation state. Keeps App.tsx clean.

5. **Annotation panel as a right-side pane** — Fixed width (~280px), togglable, similar layout
   to the `SuggestionThread` panel already present. Rendered alongside the editor preview area
   using flexbox, not a floating overlay.

6. **SelectionPopover gains an "Annotate" button** — When clicked, opens an inline comment-input
   form within the popover (not a modal). On submit, creates an annotation and closes the
   popover.

---

## High-Level Technical Design

> This illustrates the intended approach and is directional guidance for review, not
> implementation specification.

```
User selects text in rendered preview
        ↓
captureRenderedSelection() → SelectionSpan { blockId, charStart, charEnd, selectedText }
        ↓
SelectionPopover shows "Annotate" button
        ↓
User types comment → onAnnotate(span, commentText)
        ↓
POST /api/annotations → Annotation persisted in SQLite
        ↓
annotations state updated → renderMarkdownToHtml(markdown, annotations)
        ↓
<mark data-annotation-id="..."> injected at charStart/charEnd
        ↓
AnnotationPanel lists all annotations; clicking one sets selectedAnnotationId
        ↓
Focused annotation highlight gets blue glow via inline style
```

---

## Implementation Units

### U1. Annotation domain type + DB migration

**Goal:** Define the `Annotation` type and add the `annotations` SQLite table.

**Requirements:** Foundation for all other units.

**Dependencies:** None

**Files:**
- `src/domain/annotations/annotation-types.ts` — new file
- `src/db/migrations/005_annotations.sql` — new migration

**Approach:**
- `Annotation` type fields: `id`, `documentId`, `blockId`, `charStart`, `charEnd`,
  `originalText`, `commentText`, `createdAt`, `updatedAt`
- Only `comment` type for now; no `type` discriminant field needed yet (add later when
  deletion/insertion are implemented)
- Migration creates `annotations` table with the same index pattern as `suggestions`
  (`document_id`, `block_id`, `created_at`)
- Export from `src/domain/annotations/index.ts`

**Patterns to follow:**
- `src/domain/suggestions/suggestion-types.ts` — shape of Suggestion type
- `src/db/migrations/003_suggestions.sql` — migration pattern

**Test scenarios:**
- Type is correctly exported and importable from both `src/` and `web/` relative paths
- Migration applies cleanly after `004_telemetry.sql` with no column conflicts
- `INSERT` + `SELECT` round-trips preserve all fields (unit test against in-memory DB)

**Verification:** Migration runs without error; type is importable in `web/src/App.tsx`.

---

### U2. Annotation REST API (CRUD)

**Goal:** Backend endpoints to create, list, and delete annotations for a document.

**Requirements:** Enables frontend to persist annotations.

**Dependencies:** U1

**Files:**
- `src/routes/annotations.ts` — new route handler
- `src/api/server.ts` — wire up new routes
- `tests/integration/annotation-api.test.ts` — new test file

**Approach:**
- `GET /api/documents/:documentId/annotations` → returns `Annotation[]` ordered by `charStart`
- `POST /api/documents/:documentId/annotations` → creates annotation, returns created record
- `DELETE /api/annotations/:id` → deletes annotation, returns `{ ok: true }`
- Request body validation with Zod (same pattern as suggestion routes)
- Follow the route handler factory pattern in `src/routes/` — export a function that takes a
  `db: Database` and returns a handler

**Patterns to follow:**
- `src/routes/` existing route handlers
- `src/api/server.ts` — how routes are registered (manual `if/else` on pathname)

**Test scenarios:**
- `POST` creates a record and returns `201` with the created annotation
- `GET` returns empty array for unknown `documentId`
- `GET` returns created annotations ordered by `charStart` ascending
- `DELETE` removes the record; subsequent `GET` excludes it
- `DELETE` with unknown id returns `404`
- `POST` with missing `blockId` or `charStart` returns `400`

**Verification:** All integration tests pass with `bun test`.

---

### U3. Highlight injection in markdown renderer

**Goal:** Extend `renderMarkdownToHtml` to inject `<mark>` spans at annotation character
offsets within the rendered preview.

**Requirements:** Visible annotation anchoring in the preview.

**Dependencies:** U1

**Files:**
- `web/src/features/editor/markdownPreview.ts` — modify `renderMarkdownToHtml`
- `tests/unit/annotation-highlights.test.ts` — new test file

**Approach:**
- Add an optional second parameter: `annotations?: AnnotationHighlight[]` where
  `AnnotationHighlight = { id: string; blockId: string; charStart: number; charEnd: number; focused?: boolean }`
- `renderMarkdownToHtml` processes annotations grouped by `blockId`
- When rendering a line/block, if annotations exist for that block: split the visible text at
  `charStart`/`charEnd` offsets and wrap the target span in
  `<mark data-annotation-id="{id}" class="annotation-highlight{focused? ' focused':''}">...</mark>`
- `focused` annotations get a distinct inline style (blue background + subtle glow) via an
  injected `style` attribute; regular highlights use amber background (matching Plannotator's
  `comment` style)
- Highlight injection happens on the visible text after markdown prefix stripping but before
  inline markdown rendering (bold/italic/etc.), to avoid char-offset drift from HTML entities
- This function remains pure (no DOM side-effects); the React component re-renders when
  `annotations` changes

**Patterns to follow:**
- Existing `renderLine` / `renderMarkdownToHtml` in `markdownPreview.ts`
- `buildMarkdownTextMap` for understanding how char offsets map to visible text

**Test scenarios:**
- Text with no annotations renders identically to current output
- Single annotation wraps correct text range in `<mark data-annotation-id="...">` tag
- Two non-overlapping annotations in the same block both render
- Focused annotation gets additional `focused` class
- Annotation starting at offset 0 of a block renders correctly
- Annotation at end of a block (charEnd === text.length) renders correctly
- Annotation in a heading block renders after prefix stripping (no `##` in highlight)

**Verification:** Unit tests pass; rendered HTML contains expected `<mark>` tags at correct
positions; no visual regressions in existing preview for docs without annotations.

---

### U4. `useAnnotations` hook

**Goal:** Encapsulate annotation state management — load, create, delete, selected annotation.

**Requirements:** Keeps App.tsx clean; mirrors `useDocumentEditor` pattern.

**Dependencies:** U1, U2

**Files:**
- `web/src/features/annotations/annotationState.ts` — new file
- `web/src/features/annotations/` — new directory

**Approach:**
- `useAnnotations(documentId: string)` hook returns:
  - `annotations: Annotation[]`
  - `selectedAnnotationId: string | null`
  - `setSelectedAnnotationId(id: string | null): void`
  - `createAnnotation(span: SelectionSpan, commentText: string): Promise<void>`
  - `deleteAnnotation(id: string): Promise<void>`
  - `isLoading: boolean`
- Fetches annotations on mount and when `documentId` changes
- `createAnnotation` calls `POST /api/documents/:documentId/annotations`, then re-fetches
- `deleteAnnotation` calls `DELETE /api/annotations/:id`, then removes from local state
  optimistically (or re-fetches)

**Patterns to follow:**
- `web/src/features/editor/documentState.ts` — `useDocumentEditor` hook pattern
- Fetch calls in `web/src/App.tsx` — API base URL convention

**Test scenarios:**
- Hook loads annotations on mount via `GET` endpoint
- `createAnnotation` calls `POST` and adds annotation to state
- `deleteAnnotation` calls `DELETE` and removes from state
- `setSelectedAnnotationId` updates `selectedAnnotationId`

**Verification:** Hook can be imported in App.tsx; annotations load on page open.

---

### U5. "Annotate" action in SelectionPopover

**Goal:** Add an Annotate button to the selection popover that captures a comment and creates
an annotation.

**Requirements:** User interaction entry point for annotation creation.

**Dependencies:** U1, U4

**Files:**
- `web/src/features/editor/SelectionPopover.tsx` — add Annotate button + comment input state
- `web/src/App.tsx` — pass `onAnnotate` prop to SelectionPopover

**Approach:**
- Add `onAnnotate?: (span: SelectionSpan, commentText: string) => void` prop to
  `SelectionPopoverProps`
- When `onAnnotate` is provided, add an "✎ Annotate" button alongside existing actions
- Clicking "Annotate" transitions the popover to a comment-input state (same pattern as the
  existing "Custom" input state): shows a textarea + Submit button
- On submit: calls `onAnnotate(selection, commentText)`, then closes the popover
- In App.tsx: wire `onAnnotate` to `annotations.createAnnotation` from the `useAnnotations` hook

**Patterns to follow:**
- Existing `showCustom` state pattern in `SelectionPopover.tsx`
- Inline style objects matching existing buttons

**Test scenarios:**
- Annotate button is visible when `onAnnotate` prop is provided
- Clicking Annotate shows the comment textarea
- Empty comment disables Submit button
- Submit calls `onAnnotate` with correct `span` and `commentText`
- Escape key closes the popover from comment-input state

**Verification:** Can select text, click Annotate, type comment, submit; annotation appears
in panel and highlight appears in preview.

---

### U6. AnnotationPanel component

**Goal:** Right-side panel listing all annotations; click to focus.

**Requirements:** Annotation discoverability and navigation.

**Dependencies:** U1, U4

**Files:**
- `web/src/features/annotations/AnnotationPanel.tsx` — new component
- `web/src/App.tsx` — integrate panel into layout

**Approach:**
- `AnnotationPanel` props: `annotations`, `selectedAnnotationId`, `onSelect`, `onDelete`,
  `onClose`, `isOpen`
- Rendered as a fixed-width (`280px`) right pane alongside the editor via flexbox
- When `isOpen` is false, render a collapsed toggle button on the right edge
- Each annotation item shows: excerpt of `originalText` (truncated at 60 chars), `commentText`,
  formatted `createdAt` timestamp, delete button
- Clicking an item calls `onSelect(annotation.id)` → updates `selectedAnnotationId` in hook →
  triggers focused highlight in preview via re-render
- Delete button calls `onDelete(annotation.id)` with a simple confirm (via `window.confirm` or
  inline "Are you sure?" toggle — no modal library needed)
- Empty state: "No annotations yet. Select text to annotate." centered message
- Panel toggle: an "Annotations (N)" button in the top toolbar area of App.tsx

**Patterns to follow:**
- `web/src/features/suggestions/` — SuggestionThread panel layout
- Inline style objects for consistent look

**Test scenarios:**
- Panel renders empty state when `annotations` is empty
- Each annotation shows originalText excerpt and commentText
- Clicking an annotation item calls `onSelect` with correct id
- Delete button calls `onDelete` with correct id
- Panel is hidden when `isOpen` is false
- Panel toggle button shows count of annotations

**Verification:** Panel opens/closes; clicking annotation highlights corresponding text in preview.

---

### U7. Wire everything in App.tsx + end-to-end smoke test

**Goal:** Connect all units into a working feature; verify with a Playwright smoke test.

**Requirements:** Proves the full create → highlight → panel flow works end-to-end.

**Dependencies:** U1–U6

**Files:**
- `web/src/App.tsx` — integrate `useAnnotations`, pass props to all components, pass
  annotations to `renderMarkdownToHtml`
- `tests/integration/annotation-e2e.test.ts` — backend integration smoke test (HTTP layer)
  _or_ `scripts/smoke-annotations.ts` — lightweight Playwright smoke if browser test preferred

**Approach:**
- In App.tsx:
  - Call `useAnnotations(documentId)` alongside existing hooks
  - Pass `annotations` (mapped to `AnnotationHighlight[]`) to `renderMarkdownToHtml`
  - Wrap `renderMarkdownToHtml` call in `useMemo` keyed on `[markdown, annotations, selectedAnnotationId]`
  - Add `isAnnotationPanelOpen` state (default false); pass to `AnnotationPanel`
  - Pass `onAnnotate={annotations.createAnnotation}` to `SelectionPopover`
- Smoke test covers:
  - Load document
  - Create annotation via API
  - Verify `GET` returns annotation
  - Delete annotation
  - Verify `GET` returns empty

**Patterns to follow:**
- `useMemo` wrapping of `renderMarkdownToHtml` — already present in App.tsx
- Existing Playwright smoke scripts in `scripts/`

**Test scenarios:**
- Full create/read/delete annotation cycle via HTTP API
- Rendered HTML for a document with one annotation contains `<mark data-annotation-id=...>`
- Rendered HTML for a focused annotation contains `focused` class

**Verification:** App loads, annotation flow works end-to-end without console errors; smoke
test passes.

---

## System-Wide Impact

| Surface | Change |
|---|---|
| SQLite schema | New `annotations` table (migration 005) |
| API surface | 3 new REST endpoints under `/api/documents/:id/annotations` and `/api/annotations/:id` |
| `markdownPreview.ts` | `renderMarkdownToHtml` gains optional second param — backward compatible |
| `SelectionPopover.tsx` | New optional `onAnnotate` prop — backward compatible |
| `App.tsx` | New hook call + panel render + memo keying |

---

## Deferred Implementation Notes

- Whether to scope `charStart`/`charEnd` to block-local or document-global offsets should be
  validated during U3 implementation — the existing `buildMarkdownTextMap` uses document-global
  offsets but `SelectionSpan.charStart` is block-local. Implementation must verify and reconcile.
- Overlapping annotations (one annotation span containing another) — rendering strategy to be
  resolved in U3 when test cases reveal the edge case. Simple left-to-right non-overlapping
  injection is the starting point.

---

## Risks

- **Offset reconciliation** — The most likely implementation friction. `captureRenderedSelection`
  captures block-local offsets; the renderer must use the same coordinate system. Verify during
  U3 before U5/U6. The existing `tests/unit/block-id.test.ts` and selection tests are good
  reference anchors.
- **Re-render performance** — Passing `annotations` to `renderMarkdownToHtml` inside `useMemo`
  should be fine for typical document sizes, but watch for unnecessary re-renders if annotation
  state updates too frequently. Memoize `AnnotationHighlight[]` mapping separately if needed.
