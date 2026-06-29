BEGIN;

CREATE TYPE issue_report_category AS ENUM (
  'bug',
  'content',
  'billing',
  'usability',
  'performance',
  'other'
);

CREATE TYPE issue_report_status AS ENUM (
  'open',
  'triaged',
  'closed'
);

CREATE TABLE issue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  reporter_name TEXT,
  reporter_email TEXT,
  category issue_report_category NOT NULL DEFAULT 'bug',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  page_path TEXT,
  browser_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  status issue_report_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT issue_reports_title_not_blank CHECK (btrim(title) <> ''),
  CONSTRAINT issue_reports_description_not_blank CHECK (btrim(description) <> ''),
  CONSTRAINT issue_reports_reporter_name_not_blank
    CHECK (reporter_name IS NULL OR btrim(reporter_name) <> ''),
  CONSTRAINT issue_reports_reporter_email_not_blank
    CHECK (reporter_email IS NULL OR btrim(reporter_email) <> ''),
  CONSTRAINT issue_reports_page_path_not_blank
    CHECK (page_path IS NULL OR btrim(page_path) <> '')
);

CREATE INDEX idx_issue_reports_status_created_at
  ON issue_reports (status, created_at DESC);

CREATE INDEX idx_issue_reports_reporter_user_created_at
  ON issue_reports (reporter_user_id, created_at DESC)
  WHERE reporter_user_id IS NOT NULL;

CREATE INDEX idx_issue_reports_category_created_at
  ON issue_reports (category, created_at DESC);

COMMIT;
