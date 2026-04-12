-- Phase 3: Telemetry tables + FTS5 indexes

-- Telemetry events (all lifecycle actions)
CREATE TABLE IF NOT EXISTS telemetry_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  block_id TEXT,
  suggestion_id TEXT,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'user',
  payload TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tel_session ON telemetry_events(session_id);
CREATE INDEX IF NOT EXISTS idx_tel_document ON telemetry_events(document_id);
CREATE INDEX IF NOT EXISTS idx_tel_suggestion ON telemetry_events(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_tel_event_type ON telemetry_events(event_type);

-- Manual rewrites (user directly edits block text)
CREATE TABLE IF NOT EXISTS manual_rewrites (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  before_text TEXT NOT NULL,
  after_text TEXT NOT NULL,
  delta_metric REAL NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rewrites_session ON manual_rewrites(session_id);
CREATE INDEX IF NOT EXISTS idx_rewrites_document ON manual_rewrites(document_id);

-- Block time records
CREATE TABLE IF NOT EXISTS block_time_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  seconds_spent REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_btime_session ON block_time_records(session_id);
CREATE INDEX IF NOT EXISTS idx_btime_block ON block_time_records(block_id);

-- FTS5 for suggestions: standalone (not content-backed to avoid trigger complexity)
CREATE VIRTUAL TABLE IF NOT EXISTS suggestions_fts USING fts5(
  suggestion_id,
  issue_summary,
  rationale,
  proposed_text,
  selected_text,
  tokenize = 'porter ascii'
);

-- FTS5 for manual rewrites
CREATE VIRTUAL TABLE IF NOT EXISTS rewrites_fts USING fts5(
  rewrite_id,
  before_text,
  after_text,
  tokenize = 'porter ascii'
);
