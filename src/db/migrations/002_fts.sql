-- Full-text search for documents (Phase 0 prep)

CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
  path,
  content,
  content=documents,
  content_rowid=rowid
);

-- Trigger to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, path, content) 
  VALUES (new.rowid, new.path, new.content);
END;

CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, path, content) 
  VALUES('delete', old.rowid, old.path, old.content);
END;

CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, path, content) 
  VALUES('delete', old.rowid, old.path, old.content);
  INSERT INTO documents_fts(rowid, path, content) 
  VALUES (new.rowid, new.path, new.content);
END;
