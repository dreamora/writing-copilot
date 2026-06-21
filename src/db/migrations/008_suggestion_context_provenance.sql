-- Request provenance for explicitly selected workspace context.

ALTER TABLE suggestions ADD COLUMN workspace_context_json TEXT;
