-- Phase 3: Annotation editor — Plannotator-style inline comments

CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  -- block_id mirrors suggestions schema, but in current usage it is set to
  -- document_id because captureRenderedSelection returns document-global char
  -- offsets (see web/src/features/editor/SelectionState.ts). Keep the column
  -- so the schema is forward-compatible with per-block addressing later.
  block_id TEXT NOT NULL,
  char_start INTEGER NOT NULL,
  char_end INTEGER NOT NULL,
  original_text TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_annotations_document ON annotations(document_id);
CREATE INDEX IF NOT EXISTS idx_annotations_block ON annotations(block_id);
