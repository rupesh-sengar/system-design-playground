BEGIN;

CREATE TYPE subscription_plan_tier AS ENUM (
  'free',
  'plus',
  'pro'
);

CREATE TYPE subscription_status AS ENUM (
  'created',
  'authenticated',
  'active',
  'pending',
  'halted',
  'cancelled',
  'completed',
  'expired',
  'paused',
  'resumed'
);

CREATE TYPE usage_event_type AS ENUM (
  'ai_hint',
  'ai_validation'
);

CREATE TABLE user_onboarding_profiles (
  user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  target_role TEXT,
  experience_level TEXT,
  interview_timeline TEXT,
  focus_areas TEXT[] NOT NULL DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE billing_customers (
  user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  razorpay_customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT billing_customers_razorpay_customer_id_not_blank CHECK (btrim(razorpay_customer_id) <> '')
);

CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  razorpay_subscription_id TEXT UNIQUE,
  razorpay_plan_id TEXT,
  plan_tier subscription_plan_tier NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_user_subscriptions_one_active_paid
  ON user_subscriptions (user_id)
  WHERE plan_tier <> 'free'
    AND status IN ('authenticated', 'active', 'pending');

CREATE INDEX idx_user_subscriptions_user_updated_at
  ON user_subscriptions (user_id, updated_at DESC);

CREATE TABLE user_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  event_type usage_event_type NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_usage_events_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX idx_user_usage_events_user_type_created_at
  ON user_usage_events (user_id, event_type, created_at DESC);

COMMIT;
