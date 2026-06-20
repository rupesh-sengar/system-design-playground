BEGIN;

ALTER TABLE user_problem_progress
  ADD COLUMN IF NOT EXISTS is_started BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_problem_progress_started
  ON user_problem_progress (user_id, updated_at DESC)
  WHERE is_started;

COMMIT;
