BEGIN;

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
    CASE
      WHEN current_subscriptions.status IN ('authenticated', 'active')
        THEN COALESCE(current_subscriptions.plan_tier, 'free'::subscription_plan_tier)
      ELSE 'free'::subscription_plan_tier
    END AS effective_plan_tier,
    current_subscriptions.status AS subscription_status,
    current_subscriptions.razorpay_plan_id,
    current_subscriptions.razorpay_subscription_id,
    current_subscriptions.current_period_start,
    current_subscriptions.current_period_end,
    current_subscriptions.cancel_at_period_end,
    current_subscriptions.updated_at AS subscription_updated_at,
    COALESCE(monthly_ai_usage.monthly_ai_used, 0) AS monthly_ai_used
  FROM app_users
  LEFT JOIN current_subscriptions
    ON current_subscriptions.user_id = app_users.id
  LEFT JOIN monthly_ai_usage
    ON monthly_ai_usage.user_id = app_users.id
),
accounts_with_limits AS (
  SELECT
    *,
    CASE effective_plan_tier
      WHEN 'plus' THEN 200
      WHEN 'pro' THEN 600
      ELSE 10
    END AS monthly_ai_limit
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
  effective_plan_tier <> 'free' AS is_paid,
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
  subscription_updated_at
FROM accounts_with_limits;

COMMENT ON VIEW user_billing_account_summary IS
  'Admin lookup view for effective user plan and monthly AI quota. Limit values mirror default backend quota config; /v1/billing/me remains the runtime source of truth when quota env vars are overridden.';

COMMIT;
