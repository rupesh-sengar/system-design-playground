BEGIN;

CREATE TABLE IF NOT EXISTS stage_editorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id TEXT NOT NULL,
  stage_id practice_stage_id NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content_html TEXT NOT NULL,
  created_by_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  updated_by_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT stage_editorials_problem_stage_unique UNIQUE (problem_id, stage_id),
  CONSTRAINT stage_editorials_problem_id_not_blank CHECK (btrim(problem_id) <> ''),
  CONSTRAINT stage_editorials_content_not_blank CHECK (btrim(content_html) <> '')
);

CREATE INDEX IF NOT EXISTS idx_stage_editorials_problem_id
  ON stage_editorials (problem_id);

COMMIT;
