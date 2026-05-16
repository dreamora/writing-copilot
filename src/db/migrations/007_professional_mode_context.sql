-- Professional mode metadata for role/lens/action review context

ALTER TABLE suggestions ADD COLUMN editor_role TEXT NOT NULL DEFAULT 'professional-lector';
