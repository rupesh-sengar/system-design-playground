BEGIN;

CREATE TABLE IF NOT EXISTS razorpay_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_event_id TEXT UNIQUE,
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processing_status TEXT NOT NULL DEFAULT 'processing',
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT razorpay_webhook_events_event_name_not_blank CHECK (btrim(event_name) <> ''),
  CONSTRAINT razorpay_webhook_events_event_id_not_blank CHECK (
    razorpay_event_id IS NULL OR btrim(razorpay_event_id) <> ''
  ),
  CONSTRAINT razorpay_webhook_events_processing_status_valid CHECK (
    processing_status IN ('processing', 'processed', 'ignored', 'failed')
  )
);

CREATE INDEX IF NOT EXISTS idx_razorpay_webhook_events_status_received_at
  ON razorpay_webhook_events (processing_status, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_razorpay_webhook_events_event_name_received_at
  ON razorpay_webhook_events (event_name, received_at DESC);

CREATE OR REPLACE VIEW user_billing_account_summary AS
WITH current_subscriptions AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    plan_tier,
    status,
    razorpay_plan_id,
    razorpay_subscription_id,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    updated_at
  FROM user_subscriptions
  ORDER BY
    user_id,
    CASE
      WHEN plan_tier <> 'free'
        AND status IN ('authenticated', 'active')
        THEN 0
      WHEN status IN ('authenticated', 'active')
        THEN 1
      WHEN status = 'pending'
        THEN 2
      ELSE 3
    END,
    updated_at DESC
),
effective_accounts AS (
  SELECT
    app_users.id AS user_id,
    app_users.email,
    app_users.display_name,
    app_users.username,
    app_users.auth_provider,
    app_users.auth_subject,
    app_users.last_seen_at,
    app_users.created_at AS user_created_at,
    app_users.updated_at AS user_updated_at,
    COALESCE(
      user_billing_accounts.plan_tier,
      'free'::subscription_plan_tier
    ) AS effective_plan_tier,
    COALESCE(user_billing_accounts.plan_source, 'default') AS plan_source,
    user_billing_accounts.monthly_ai_quota_override,
    user_billing_accounts.created_at AS billing_account_created_at,
    user_billing_accounts.updated_at AS billing_account_updated_at,
    current_subscriptions.status AS subscription_status,
    current_subscriptions.razorpay_plan_id,
    current_subscriptions.razorpay_subscription_id,
    current_subscriptions.current_period_start,
    current_subscriptions.current_period_end,
    current_subscriptions.cancel_at_period_end,
    current_subscriptions.updated_at AS subscription_updated_at
  FROM app_users
  LEFT JOIN user_billing_accounts
    ON user_billing_accounts.user_id = app_users.id
  LEFT JOIN current_subscriptions
    ON current_subscriptions.user_id = app_users.id
),
accounts_with_limits AS (
  SELECT
    *,
    COALESCE(
      monthly_ai_quota_override,
      CASE effective_plan_tier
        WHEN 'plus' THEN 200
        WHEN 'pro' THEN 600
        ELSE 10
      END
    ) AS monthly_ai_limit
  FROM effective_accounts
),
accounts_with_usage AS (
  SELECT
    accounts_with_limits.*,
    CASE
      WHEN effective_plan_tier <> 'free'
        AND current_period_start IS NOT NULL
        THEN current_period_start
      ELSE date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
    END AS monthly_ai_period_start,
    CASE
      WHEN effective_plan_tier <> 'free'
        AND current_period_start IS NOT NULL
        THEN current_period_end
      ELSE NULL::TIMESTAMPTZ
    END AS monthly_ai_period_end
  FROM accounts_with_limits
),
accounts_with_usage_counts AS (
  SELECT
    accounts_with_usage.*,
    COALESCE((
      SELECT SUM(user_usage_events.quantity)::int
      FROM user_usage_events
      WHERE user_usage_events.user_id = accounts_with_usage.user_id
        AND user_usage_events.event_type IN ('ai_hint', 'ai_validation')
        AND user_usage_events.created_at >= accounts_with_usage.monthly_ai_period_start
        AND (
          accounts_with_usage.monthly_ai_period_end IS NULL
          OR user_usage_events.created_at < accounts_with_usage.monthly_ai_period_end
        )
    ), 0) AS monthly_ai_used
  FROM accounts_with_usage
)
SELECT
  user_id,
  email,
  display_name,
  username,
  auth_provider,
  auth_subject,
  effective_plan_tier,
  plan_source,
  effective_plan_tier <> 'free' AS is_paid,
  monthly_ai_quota_override,
  subscription_status,
  razorpay_plan_id,
  razorpay_subscription_id,
  current_period_start,
  current_period_end,
  cancel_at_period_end,
  monthly_ai_limit,
  monthly_ai_used,
  GREATEST(0, monthly_ai_limit - monthly_ai_used) AS monthly_ai_remaining,
  last_seen_at,
  user_created_at,
  user_updated_at,
  billing_account_created_at,
  billing_account_updated_at,
  subscription_updated_at
FROM accounts_with_usage_counts;

COMMENT ON VIEW user_billing_account_summary IS
  'Admin lookup view for effective user plan and AI quota. Paid users are counted against the active Razorpay subscription period; free users use the current UTC calendar month. Limit values mirror default backend quota config unless user_billing_accounts.monthly_ai_quota_override is set; /v1/billing/me remains the runtime source of truth when quota env vars are overridden.';

COMMIT;
