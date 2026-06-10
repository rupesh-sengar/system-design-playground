DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'billing_customers'
      AND column_name = 'stripe_customer_id'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'billing_customers'
      AND column_name = 'razorpay_customer_id'
  ) THEN
    ALTER TABLE billing_customers
      RENAME COLUMN stripe_customer_id TO razorpay_customer_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_subscriptions'
      AND column_name = 'stripe_subscription_id'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_subscriptions'
      AND column_name = 'razorpay_subscription_id'
  ) THEN
    ALTER TABLE user_subscriptions
      RENAME COLUMN stripe_subscription_id TO razorpay_subscription_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_subscriptions'
      AND column_name = 'stripe_price_id'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_subscriptions'
      AND column_name = 'razorpay_plan_id'
  ) THEN
    ALTER TABLE user_subscriptions
      RENAME COLUMN stripe_price_id TO razorpay_plan_id;
  END IF;
END $$;

ALTER TABLE billing_customers
  DROP CONSTRAINT IF EXISTS billing_customers_stripe_customer_id_not_blank;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'billing_customers_razorpay_customer_id_not_blank'
  ) THEN
    ALTER TABLE billing_customers
      ADD CONSTRAINT billing_customers_razorpay_customer_id_not_blank
      CHECK (btrim(razorpay_customer_id) <> '');
  END IF;
END $$;

DROP INDEX IF EXISTS idx_user_subscriptions_one_active_paid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_subscriptions'
      AND column_name = 'plan_tier'
  )
  AND EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'subscription_plan_tier'
  ) THEN
    EXECUTE 'DROP TYPE IF EXISTS subscription_plan_tier_plus_pro_next';
    EXECUTE $sql$
      CREATE TYPE subscription_plan_tier_plus_pro_next AS ENUM (
        'free',
        'plus',
        'pro'
      )
    $sql$;

    EXECUTE 'ALTER TABLE user_subscriptions ALTER COLUMN plan_tier DROP DEFAULT';
    EXECUTE $sql$
      ALTER TABLE user_subscriptions
      ALTER COLUMN plan_tier TYPE subscription_plan_tier_plus_pro_next
      USING (
        CASE plan_tier::text
          WHEN 'team' THEN 'pro'
          WHEN 'pro' THEN 'plus'
          WHEN 'plus' THEN 'plus'
          WHEN 'free' THEN 'free'
          ELSE 'free'
        END
      )::subscription_plan_tier_plus_pro_next
    $sql$;
    EXECUTE $sql$
      ALTER TABLE user_subscriptions
      ALTER COLUMN plan_tier SET DEFAULT 'free'::subscription_plan_tier_plus_pro_next
    $sql$;
    EXECUTE 'DROP TYPE subscription_plan_tier';
    EXECUTE 'ALTER TYPE subscription_plan_tier_plus_pro_next RENAME TO subscription_plan_tier';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_subscriptions'
      AND column_name = 'status'
  )
  AND EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'subscription_status'
  ) THEN
    EXECUTE 'DROP TYPE IF EXISTS subscription_status_razorpay_next';
    EXECUTE $sql$
      CREATE TYPE subscription_status_razorpay_next AS ENUM (
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
      )
    $sql$;

    EXECUTE 'ALTER TABLE user_subscriptions ALTER COLUMN status DROP DEFAULT';
    EXECUTE $sql$
      ALTER TABLE user_subscriptions
      ALTER COLUMN status TYPE subscription_status_razorpay_next
      USING (
        CASE status::text
          WHEN 'incomplete' THEN 'created'
          WHEN 'incomplete_expired' THEN 'expired'
          WHEN 'trialing' THEN 'authenticated'
          WHEN 'past_due' THEN 'pending'
          WHEN 'canceled' THEN 'cancelled'
          WHEN 'unpaid' THEN 'halted'
          WHEN 'created' THEN 'created'
          WHEN 'authenticated' THEN 'authenticated'
          WHEN 'active' THEN 'active'
          WHEN 'pending' THEN 'pending'
          WHEN 'halted' THEN 'halted'
          WHEN 'cancelled' THEN 'cancelled'
          WHEN 'completed' THEN 'completed'
          WHEN 'expired' THEN 'expired'
          WHEN 'paused' THEN 'paused'
          WHEN 'resumed' THEN 'resumed'
          ELSE 'created'
        END
      )::subscription_status_razorpay_next
    $sql$;
    EXECUTE $sql$
      ALTER TABLE user_subscriptions
      ALTER COLUMN status SET DEFAULT 'active'::subscription_status_razorpay_next
    $sql$;
    EXECUTE 'DROP TYPE subscription_status';
    EXECUTE 'ALTER TYPE subscription_status_razorpay_next RENAME TO subscription_status';
  END IF;
END $$;

CREATE UNIQUE INDEX idx_user_subscriptions_one_active_paid
  ON user_subscriptions (user_id)
  WHERE plan_tier <> 'free'
    AND status IN ('authenticated', 'active', 'pending');
