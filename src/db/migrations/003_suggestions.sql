-- Phase 2: Suggestion lifecycle tables

CREATE TABLE IF NOT EXISTS suggestions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  selected_text TEXT NOT NULL,
  char_start INTEGER NOT NULL,
  char_end INTEGER NOT NULL,
  context_before TEXT NOT NULL DEFAULT '',
  context_after TEXT NOT NULL DEFAULT '',
  custom_instruction TEXT,
  issue_summary TEXT NOT NULL,
  rationale TEXT NOT NULL,
  proposed_text TEXT NOT NULL,
  risk_notes TEXT,
  confidence REAL,
  status TEXT NOT NULL DEFAULT 'open',
  edited_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  decided_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_suggestions_document ON suggestions(document_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_block ON suggestions(block_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);
