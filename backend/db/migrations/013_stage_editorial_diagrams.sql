BEGIN;

ALTER TABLE stage_editorials
  ADD COLUMN IF NOT EXISTS diagram_json JSONB;

COMMIT;
