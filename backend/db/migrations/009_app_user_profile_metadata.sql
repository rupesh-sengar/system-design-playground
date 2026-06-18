BEGIN;

ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS picture_url TEXT,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_app_users_email
  ON app_users (lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_app_users_username
  ON app_users (lower(username))
  WHERE username IS NOT NULL;

COMMIT;
