-- Phase 4: Tool-for-thought suggestion metadata

ALTER TABLE suggestions ADD COLUMN workflow_stage TEXT NOT NULL DEFAULT 'final-output';
ALTER TABLE suggestions ADD COLUMN active_lens TEXT;
ALTER TABLE suggestions ADD COLUMN shown_edit_json TEXT;
ALTER TABLE suggestions ADD COLUMN lenses_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE suggestions ADD COLUMN provocations_json TEXT NOT NULL DEFAULT '[]';
