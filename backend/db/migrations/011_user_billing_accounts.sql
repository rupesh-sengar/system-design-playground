BEGIN;

CREATE TABLE IF NOT EXISTS user_billing_accounts (
  user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  plan_tier subscription_plan_tier NOT NULL DEFAULT 'free',
  plan_source TEXT NOT NULL DEFAULT 'default',
  monthly_ai_quota_override INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_billing_accounts_plan_source_valid CHECK (plan_source IN ('default', 'subscription', 'admin')),
  CONSTRAINT user_billing_accounts_monthly_ai_quota_override_nonnegative CHECK (
    monthly_ai_quota_override IS NULL OR monthly_ai_quota_override >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_user_billing_accounts_plan_tier
  ON user_billing_accounts (plan_tier);

WITH current_subscriptions AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    plan_tier,
    status
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
)
INSERT INTO user_billing_accounts (
  user_id,
  plan_tier,
  plan_source
)
SELECT
  app_users.id,
  CASE
    WHEN current_subscriptions.status IN ('authenticated', 'active')
      AND current_subscriptions.plan_tier <> 'free'
      THEN current_subscriptions.plan_tier
    ELSE 'free'::subscription_plan_tier
  END,
  CASE
    WHEN current_subscriptions.status IN ('authenticated', 'active')
      AND current_subscriptions.plan_tier <> 'free'
      THEN 'subscription'
    ELSE 'default'
  END
FROM app_users
LEFT JOIN current_subscriptions
  ON current_subscriptions.user_id = app_users.id
ON CONFLICT (user_id)
DO UPDATE SET
  plan_tier = CASE
    WHEN user_billing_accounts.plan_source = 'admin'
      THEN user_billing_accounts.plan_tier
    ELSE excluded.plan_tier
  END,
  plan_source = CASE
    WHEN user_billing_accounts.plan_source = 'admin'
      THEN user_billing_accounts.plan_source
    ELSE excluded.plan_source
  END,
  updated_at = now();

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
monthly_ai_usage AS (
  SELECT
    user_id,
    COALESCE(SUM(quantity), 0)::int AS monthly_ai_used
  FROM user_usage_events
  WHERE event_type IN ('ai_hint', 'ai_validation')
    AND created_at >= (
      date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
    )
  GROUP BY user_id
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
    current_subscriptions.updated_at AS subscription_updated_at,
    COALESCE(monthly_ai_usage.monthly_ai_used, 0) AS monthly_ai_used
  FROM app_users
  LEFT JOIN user_billing_accounts
    ON user_billing_accounts.user_id = app_users.id
  LEFT JOIN current_subscriptions
    ON current_subscriptions.user_id = app_users.id
  LEFT JOIN monthly_ai_usage
    ON monthly_ai_usage.user_id = app_users.id
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
FROM accounts_with_limits;

COMMENT ON VIEW user_billing_account_summary IS
  'Admin lookup view for effective user plan and monthly AI quota. Limit values mirror default backend quota config unless user_billing_accounts.monthly_ai_quota_override is set; /v1/billing/me remains the runtime source of truth when quota env vars are overridden.';

COMMIT;
