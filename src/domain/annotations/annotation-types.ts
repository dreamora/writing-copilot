// Annotation domain contracts — Phase 3 (Plannotator-style inline comments)
//
// An Annotation is a persistent user comment anchored to a span of source
// markdown via document-global character offsets. Distinct from Suggestion
// (AI-generated edit proposals) because annotations carry user prose, not
// proposed text, and have no accept/reject lifecycle.
//
// Coordinate system: charStart/charEnd are offsets into the raw markdown
// source string, matching SelectionSpan from
// web/src/features/editor/SelectionState.ts. blockId is currently set to
// documentId (mirrors the SelectionSpan shape); the column exists so the
// schema can adopt per-block addressing later without a migration.

export interface Annotation {
  id: string;
  documentId: string;
  blockId: string;
  charStart: number;
  charEnd: number;
  originalText: string;
  commentText: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnotationInput {
  documentId: string;
  blockId: string;
  charStart: number;
  charEnd: number;
  originalText: string;
  commentText: string;
}
