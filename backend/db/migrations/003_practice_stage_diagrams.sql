BEGIN;

ALTER TABLE practice_stage_drafts
  ADD COLUMN IF NOT EXISTS diagram_json JSONB;

COMMIT;
