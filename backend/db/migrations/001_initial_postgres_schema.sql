BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE practice_stage_id AS ENUM (
  'requirements',
  'core-entities',
  'api-interface',
  'data-flow',
  'high-level-design',
  'deep-dives'
);

CREATE TABLE app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_provider TEXT NOT NULL DEFAULT 'auth0',
  auth_subject TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_users_auth_identity_unique UNIQUE (auth_provider, auth_subject),
  CONSTRAINT app_users_auth_subject_not_blank CHECK (btrim(auth_subject) <> '')
);

CREATE TABLE user_problem_progress (
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL,
  is_bookmarked BOOLEAN NOT NULL DEFAULT false,
  is_practiced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, problem_id),
  CONSTRAINT user_problem_progress_problem_id_not_blank CHECK (btrim(problem_id) <> '')
);

CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL,
  active_stage_id practice_stage_id NOT NULL DEFAULT 'requirements',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT practice_sessions_user_problem_unique UNIQUE (user_id, problem_id),
  CONSTRAINT practice_sessions_problem_id_not_blank CHECK (btrim(problem_id) <> '')
);

CREATE TABLE practice_stage_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  stage_id practice_stage_id NOT NULL,
  notes_html TEXT NOT NULL DEFAULT '',
  is_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  CONSTRAINT practice_stage_drafts_session_stage_unique UNIQUE (session_id, stage_id)
);

CREATE INDEX idx_user_problem_progress_user_updated_at
  ON user_problem_progress (user_id, updated_at DESC);

CREATE INDEX idx_user_problem_progress_bookmarked
  ON user_problem_progress (user_id, updated_at DESC)
  WHERE is_bookmarked;

CREATE INDEX idx_user_problem_progress_practiced
  ON user_problem_progress (user_id, updated_at DESC)
  WHERE is_practiced;

CREATE INDEX idx_practice_sessions_user_updated_at
  ON practice_sessions (user_id, updated_at DESC);

CREATE INDEX idx_practice_stage_drafts_session_id
  ON practice_stage_drafts (session_id);

COMMIT;
