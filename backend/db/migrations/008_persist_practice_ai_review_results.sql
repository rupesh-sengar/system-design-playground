BEGIN;

ALTER TABLE practice_stage_drafts
  ADD COLUMN IF NOT EXISTS ai_hint_result JSONB,
  ADD COLUMN IF NOT EXISTS ai_validation_result JSONB;

COMMIT;
