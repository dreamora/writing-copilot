---
date: 2026-05-17
topic: local-workspace-context
---

# Local Workspace Context

## Summary

Add a browser-based local workspace flow where the user opens a folder, chooses the active Markdown draft from that folder, and selects other Markdown documents as explicit AI grounding context. The first version targets a Chromium-family browser with File System Access directory support; the minimum valuable workflow includes both active-file selection and context-document selection, because the selected context packet is what makes Codex's challenges and provocations materially sharper.

---

## Problem Frame

The current workflow requires copying the document under review into the repo's `docs/` folder as `sample.md` so the app can load it easily. That keeps the prototype usable, but it breaks the natural local-writing workflow: the user's real writing folder is somewhere else, related source notes stay outside the app, and the active document is disconnected from the wider set of notes that would help the AI challenge claims well.

For this product, the folder is not just file storage. It is the user's working corpus: draft, source notes, voice references, outlines, counterpoints, and previous thinking. Without a workspace concept, the editor can improve a selected span only against local before/after context. It cannot use deliberately selected grounding documents to ask better questions, pressure-test evidence, or keep the writer anchored in their own source material.

---

## Actors

- A1. Writer: Opens a local writing folder, chooses the draft to review, and selects which related documents should ground AI suggestions.
- A2. Writing Copilot: Presents the workspace files, tracks the active document, and sends only deliberate context into AI requests.
- A3. AI reviewer: Produces suggestions, challenges, and provocations using the selected span, surrounding draft context, and selected grounding documents.

---

## Key Flows

- F1. Open a local workspace
  - **Trigger:** The writer wants to review a draft that lives outside the app's default `docs/` folder.
  - **Actors:** A1, A2
  - **Steps:** The writer opens a local folder through a supported Chromium-family browser. The app requests directory access through the browser's File System Access directory picker. The app scans the permitted folder for Markdown documents within the v1 scan rules. The app shows the available Markdown files without requiring the writer to copy or rename the draft.
  - **Outcome:** The workspace is active and the writer can choose a Markdown file from the folder.
  - **Covered by:** R1, R2, R3, R4, R5, R6, R7

- F2. Choose the active draft
  - **Trigger:** The workspace contains one or more Markdown documents.
  - **Actors:** A1, A2
  - **Steps:** The writer searches or browses the Markdown inventory. The writer selects one document as the active draft. The editor reads and saves that document through the browser-granted file handle. Review state belongs to that document rather than to a hardcoded sample.
  - **Outcome:** The active draft is loaded and ready for selection-based review.
  - **Covered by:** R8, R9, R10, R11, R12, R13

- F3. Select grounding context
  - **Trigger:** The writer wants the AI reviewer to use source notes, voice notes, outlines, or counterpoints while reviewing the active draft.
  - **Actors:** A1, A2
  - **Steps:** The writer opens the left context surface, selects one or more Markdown documents from the same workspace, reviews which documents are selected, and can remove them before requesting AI feedback. The selected context packet persists for the active browser session until the writer removes it, closes the workspace, or permission is lost.
  - **Outcome:** The app has an explicit context packet for the active review session.
  - **Covered by:** R14, R15, R16, R17, R18, R19, R20

- F4. Request context-grounded feedback
  - **Trigger:** The writer selects text in the active draft and asks for a suggestion, challenge, or provocation.
  - **Actors:** A1, A2, A3
  - **Steps:** The app discloses that selected draft/context content will be sent to the AI reviewer, sends the selected text, surrounding draft context, selected role/action/lens, and bounded selected grounding context, then records which context documents were included in the request. The resulting review thread makes clear when explicit workspace context was included.
  - **Outcome:** The writer gets feedback that can challenge claims against chosen context rather than relying only on the local selection envelope.
  - **Covered by:** R21, R22, R23, R24, R25, R26, R27, R28, R29, R30, R31

---

## Requirements

**Workspace opening and file inventory**
- R1. The first version must target a Chromium-family browser/runtime that supports the File System Access directory picker.
- R2. If the browser does not support directory picking, the app must show an explicit unsupported-browser state and keep the existing default-document workflow available as a fallback rather than pretending workspace mode is available.
- R3. The app must let the writer open a local folder from the supported browser as the active workspace for the current browser session.
- R4. Folder access must be scoped to the selected directory, session-bound unless the writer explicitly opts into persistence later, and revalidated when browser permission is revoked or the workspace is reopened.
- R5. The app must treat the browser-granted folder as the only readable workspace scope for this feature; unselected files outside that folder must not be readable or selectable.
- R6. The app must list Markdown-like files from the opened workspace according to a narrow v1 inventory rule: visible `.md` and `.markdown` files, with nested scanning only to the scan depth the browser API and v1 performance budget can support.
- R7. Backup, generated, hidden, archived, or tool-owned files/directories must not appear as normal document choices and must not be read, cached, searched, or sent to AI requests unless they are explicitly surfaced and selected by the writer.

**Active draft selection**
- R8. The app must replace the default copy-to-`sample.md` workflow with an active Markdown document selector based on the workspace inventory.
- R9. The active document selector must be searchable enough to work in folders with many Markdown files while staying bounded to the workspace inventory.
- R10. Workspace documents must be read and saved through the browser-granted file handles for the opened workspace, not by silently copying them into the app's default `docs/` folder.
- R11. Review state, suggestions, and annotations must belong to the selected active document rather than a single global sample document.
- R12. Document identity must be stable enough to prevent cross-file leakage of review state: same filenames in different folders, file renames/moves, changed content, deleted/reopened files, and existing `doc-main` data must have explicit behavior before implementation starts.
- R13. If the writer switches active documents with unsaved edits, an in-flight AI request, a missing file, or a revoked file handle, the app must preserve the current draft state and require an explicit recovery action before switching.

**Left workspace sidebar**
- R14. The left sidebar must distinguish file navigation from AI context selection through explicit surfaces, such as separate Files and Context tabs or sections.
- R15. The active draft must remain visible while the writer browses files or edits the context packet.
- R16. Selecting a document as the active draft must not automatically select it as AI grounding context.
- R17. Selecting a document as context must be an explicit writer action through a clear add/remove control; duplicate context entries must be prevented.
- R18. The context packet must persist for the active workspace session until removed, the workspace is closed, or folder permission is lost; switching active drafts must not silently clear or expand it.
- R19. The sidebar must make the current context packet easy to inspect before requesting AI feedback, including document names, workspace-relative paths, and whether each item will be sent whole or trimmed.
- R20. The workspace and context controls must support keyboard navigation, visible focus states, accessible names for active/context status, and a narrow-width layout that does not hide the current context packet.

**Context-grounded AI review**
- R21. AI suggestion requests must be able to include selected context documents as deliberate grounding material.
- R22. The first version must define a bounded context packet: selected context document identity, title or workspace-relative path, inclusion mode, included content or excerpt, and visible size/character budget status.
- R23. If selected context is too large, unavailable, unreadable, or partially omitted, the app must show that status before the request and must not silently send a different context packet than the writer expects.
- R24. The AI reviewer must use selected context to sharpen challenges, evidence checks, counterarguments, source questions, and provocations, not as hidden global memory.
- R25. Review threads must preserve request provenance: which context documents were included in the AI request, their workspace-relative identifiers, inclusion mode, and content/excerpt hash or equivalent version signal.
- R26. Review threads must not claim a selected document influenced the model unless the response explicitly cites, quotes, or references that document; otherwise the thread should say the document was included in the request.
- R27. If no context documents are selected, the app must still support the current active-draft review flow without implying extra grounding was used.

**Data handling and trust boundary**
- R28. Before sending AI feedback, the app must make clear that selected draft text and selected context excerpts leave the local workspace for AI review.
- R29. AI requests must send only the active selection envelope and explicitly selected context packet; unselected workspace files must not be sent.
- R30. The app must avoid retaining full prompt payloads, absolute local paths, or full context excerpts in telemetry, exports, or review-thread provenance unless the writer explicitly chooses an export that includes them.
- R31. The app must redact or warn on obvious secrets where feasible before selected context is sent to AI, without pretending to provide complete data-loss prevention.

**Product posture and future path**
- R32. The feature must avoid turning the app into a full knowledge-base clone; the workspace exists to support writing review, not to replace Obsidian, VS Code, or the user's file system.
- R33. The workspace concept should avoid coupling AI/context behavior directly to browser-only picker details so a later Tauri/native shell can reuse the product model, but the first implementation must not build a speculative desktop abstraction before it is needed.

---

## Acceptance Examples

- AE1. **Covers R1, R2.** Given the writer opens the app in a browser without supported directory-picker access, when they try to use workspace mode, the app shows an unsupported-browser state and leaves the default-document fallback available.
- AE2. **Covers R3, R6, R8.** Given the writer has a supported browser and a local folder containing Markdown files, when they open the folder, the app shows selectable Markdown drafts without requiring a file to be copied to `docs/sample.md`.
- AE3. **Covers R4, R13.** Given folder permission is revoked or a selected file handle becomes unavailable, when the writer tries to load or save, the app does not lose unsaved draft state and prompts for a recovery action.
- AE4. **Covers R11, R12.** Given the writer reviews one Markdown file and then switches to another, when the second file loads, suggestions and annotations from the first file do not appear as if they belong to the second.
- AE5. **Covers R14, R16, R17.** Given the writer opens a file from the workspace, when the file becomes the active draft, it is not automatically added to the AI context packet.
- AE6. **Covers R18, R19.** Given the writer selects two source notes as context and switches to another active draft in the same workspace session, the selected context remains visible and removable rather than silently resetting or expanding.
- AE7. **Covers R21, R22, R23, R24.** Given the writer selects two source notes as context and requests a rigorous review of a claim, when the AI responds, the provocations can challenge the claim against the included context packet or explicitly report that context was omitted because of budget or read errors.
- AE8. **Covers R25, R26.** Given a suggestion request included selected workspace context, when the writer reviews the thread, they can tell which context documents were included in the request without the thread overclaiming that every included document influenced the model.
- AE9. **Covers R27.** Given no context documents are selected, when the writer requests a suggestion, the existing single-document review behavior still works and the thread does not claim to be grounded in external documents.
- AE10. **Covers R28, R29, R30, R31.** Given the writer is about to request AI feedback with selected context, when the request is prepared, the app discloses the AI data boundary, excludes unselected files, avoids absolute-path provenance, and warns or redacts obvious secrets where feasible.

---

## Success Criteria

- The writer no longer needs to copy the working draft into `docs/sample.md` for normal use.
- The writer can open a local writing folder, choose the active Markdown draft, and select grounding documents from the same workspace in one coherent flow.
- Across at least three real writing sessions, the writer deliberately selects context, can identify at least one challenge or provocation that improved because of included context, and does not revert to selection-only review because context setup feels too costly.
- The UI makes it clear which document is being edited and which documents are being used as AI context.
- A downstream planner can separate browser workspace access, active document identity, sidebar behavior, and AI context provenance without inventing product behavior.

---

## Scope Boundaries

- Desktop packaging with Tauri or Electron is deferred, though the workspace concept should not make that future path harder.
- Workspace-wide semantic search, embeddings, backlinks, graph views, and automatic related-note discovery are deferred.
- Saved context sets, context analytics, and learning which sources improve acceptance rates are deferred.
- The feature does not replace the current editor, suggestion lifecycle, review sidebar, annotation panel, or professional mode model.
- The app should not read every file in the folder as hidden AI memory; only explicit context selections should affect AI review.
- The app should not become a general Obsidian-style vault manager in this iteration.
- The app should not edit non-active context files in this iteration.
- The app should not persist a reusable workspace library, backlink graph, or cross-session context set in this iteration.
- Configurable ignore rules, deep indexing, and generated-file classification beyond the narrow v1 inventory rules are deferred.

---

## Key Decisions

- Browser folder picker first: This validates the local workspace loop in a supported Chromium-family runtime without committing the product to desktop packaging yet.
- Context selection is part of the MVP: File opening alone does not prove the bet, because selected grounding documents are what materially improve Codex feedback.
- Separate Files and Context surfaces: Navigation and AI grounding are different user intents and should not be conflated.
- Explicit context over hidden memory: The writer should be able to inspect and remove the grounding material before it influences suggestions.
- Request provenance, not model-causality claims: The product records what context was included in the request; it should claim actual influence only when the model response explicitly cites or references a source.
- Tauri remains a likely long-term path: Native folder access may become the better product shell, but it should follow proof that the workspace-context loop is useful.

---

## Threat Model Notes

- Accidental sensitive-file disclosure: The writer may select a folder containing private notes, credentials, PII, archived drafts, or generated files. Mitigation: narrow inventory rules, explicit context selection, AI-boundary disclosure, unselected-file exclusion, and best-effort secret warning/redaction.
- Prompt or model-output exfiltration pressure: A malicious prompt, context document, or model response could try to convince the app or writer to expose more local files. Mitigation: no hidden workspace memory, no automatic expansion beyond selected context, and no AI-driven file selection in this iteration.
- Persisted provenance leakage: Review threads, telemetry, or exports could reveal absolute paths, local folder names, private note titles, or source snippets. Mitigation: store minimum workspace-relative request provenance, avoid absolute paths and full excerpts by default, and define deletion/retention behavior before implementation.

---

## Dependencies / Assumptions

- Browser folder access is acceptable for the first version only in a supported Chromium-family runtime with File System Access directory-picker support; other browsers use the fallback/default-document path for now.
- The first target user is a local single-user writing workflow, not a hosted multi-user collaboration product.
- The selected grounding context can be made small enough to fit AI request limits while still being useful if the app makes size limits and omissions visible.
- Context provenance matters for trust because the feature's value is better challenges, not invisible personalization.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R1, R2, R3, R4][Needs research] Verify the exact File System Access API behavior in the target Chromium-family development/runtime browser, including permission prompts, refresh/reopen behavior, cancellation, and revoked access.
- [Affects R6, R7][Technical] Set concrete v1 scan limits, performance budgets, and the small default ignore list for hidden, backup, generated, archive, and tool-owned paths.
- [Affects R10, R13][Technical] Decide how browser file-handle reads/saves integrate with the existing server-backed suggestion and telemetry flow without silently copying active documents into `docs/`.
- [Affects R11, R12][Technical] Choose the stable document identity strategy for existing suggestions and annotations, including same-name files, rename/move behavior, changed content, deleted/reopened files, and existing `doc-main` data.
- [Affects R22, R23][Technical] Define the first context-packet inclusion mode: whole document up to a visible limit, manual excerpts, or deterministic trimming.
- [Affects R25, R30][Technical] Decide the minimum request-provenance fields, retention behavior, and deletion behavior for review threads and exports.
